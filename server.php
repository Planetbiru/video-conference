<?php

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;

require __DIR__ . '/inc.lib/vendor/autoload.php';

class SignallingServer implements MessageComponentInterface {
    protected $clients; // SplObjectStorage
    protected $users;   // peerId => user info

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->users   = array();
    }

    public function onOpen(ConnectionInterface $conn) {
        // Get query string for session id & roomId
        $uri = $conn->httpRequest->getUri();
        parse_str($uri->getQuery(), $query);
        $sessionId = isset($query['PHPSESSID']) ? $query['PHPSESSID'] : null;
        $roomId    = isset($query['roomId']) ? $query['roomId'] : 'default';

        // Generate peerId
        $peerId = substr(md5(uniqid()), 0, 8);

        // Get user data from session
        $user = $this->getUserFromSession($sessionId);

        // Save mapping
        $this->clients->attach($conn, $peerId);
        $this->users[$peerId] = array(
            'peerId'   => $peerId,
            'username' => isset($user['username']) ? $user['username'] : 'guest',
            'name'     => isset($user['name']) ? $user['name'] : 'Guest User',
            'session'  => $sessionId,
            'roomId'   => $roomId
        );

        echo "New connection! PeerId={$peerId}, Room={$roomId}, User=" . $this->users[$peerId]['username'] . "\n";

        // Cari semua peer di room yang sama
        $peersInRoom = array();
        foreach ($this->users as $id => $info) {
            if ($info['roomId'] === $roomId) {
                $peersInRoom[$id] = $info;
            }
        }

        // Kirim daftar peserta ke client baru
        $conn->send(json_encode(array(
            'type'        => 'peers',
            'myId'        => $peerId,
            'peers'       => array_keys($peersInRoom),
            'peerDetails' => $peersInRoom
        )));

        // Broadcast newPeer ke room yang sama
        foreach ($this->clients as $client) {
            $targetPeerId = $this->clients[$client];
            if ($client !== $conn && $this->users[$targetPeerId]['roomId'] === $roomId) {
                $message = json_encode(array(
                    'type'       => 'newPeer',
                    'peerId'     => $peerId,
                    'peerDetail' => $this->users[$peerId]
                ));
                $client->send($message);
            }
        }
    }

    public function loadHistory($roomId) {
        $path = dirname(__DIR__)."/history_".$roomId.".txt";
        if (!file_exists($path)) return array();
        $lines = file($path);
        $data = array();
        foreach ($lines as $line) {   
            if (trim($line) !== '') {
                $data[] = json_decode($line, true);
            }
        }
        return $data;
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $peerId = $this->clients[$from];
        $user   = $this->users[$peerId];
        $roomId = $user['roomId'];
        $data   = @json_decode($msg, true);

        if (!$data) return;

        // Direct message (private)
        if (!empty($data['to']) && isset($this->users[$data['to']])) {
            $target = $this->users[$data['to']];
            if ($target['roomId'] === $roomId) {
                foreach ($this->clients as $client) {
                    if ($this->clients[$client] === $data['to']) {
                        $client->send($msg);
                        break;
                    }
                }
            }
        }
        elseif (isset($data['type']) && $data['type'] === 'setMainScreen') {
            foreach ($this->clients as $client) {
                $targetPeerId = $this->clients[$client];
                if ($client !== $from && $this->users[$targetPeerId]['roomId'] === $roomId) {
                    $client->send(json_encode(array(
                        'type'     => 'setMainScreen',
                        'from'     => $peerId,
                        'streamId' => $data['streamId']
                    )));
                }
            }
        }
        elseif (isset($data['type']) && $data['type'] === 'requestChatHistory') {
            $from->send(json_encode(array(
                'type'        => 'chatHistory',
                'chatHistory' => $this->loadHistory($roomId)
            )));
        }
        else {
            // Broadcast ke semua peer di room yang sama
            foreach ($this->clients as $client) {
                $targetPeerId = $this->clients[$client];
                if ($client !== $from && $this->users[$targetPeerId]['roomId'] === $roomId) {
                    $client->send($msg);
                }
            }
        }

        // Simpan chat history per room
        if (isset($data['type']) && $data['type'] === 'chat') {
            $str = json_encode($data);
            file_put_contents(dirname(__DIR__)."/history_".$roomId.".txt", $str."\r\n", FILE_APPEND);
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $peerId = $this->clients[$conn];
        $roomId = $this->users[$peerId]['roomId'];
        echo "Client disconnected: {$peerId} from Room={$roomId}\n";

        $this->clients->detach($conn);
        unset($this->users[$peerId]);

        // Broadcast leave ke semua peer di room yang sama
        foreach ($this->clients as $client) {
            $targetPeerId = $this->clients[$client];
            if ($this->users[$targetPeerId]['roomId'] === $roomId) {
                $client->send(json_encode(array(
                    'type'   => 'peerLeave',
                    'peerId' => $peerId
                )));
            }
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Error: ".$e->getMessage()."\n";
        $conn->close();
    }

    private function getUserFromSession($sessionId) {
        if (!$sessionId) return array();

        $path = ini_get("session.save_path");
        if ($path == '') $path = sys_get_temp_dir();
        $sessionFile = $path . "/sess_" . $sessionId;

        if (file_exists($sessionFile)) {
            $data = file_get_contents($sessionFile);
            // Demo parsing
            if (strpos($data, 'username') !== false) {
                return array(
                    'username' => 'demoUser',
                    'name'     => 'Demo Name'
                );
            }
        }
        return array();
    }
}

// Run server (port 3000)
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new SignallingServer()
        )
    ),
    3000
);

$server->run();
