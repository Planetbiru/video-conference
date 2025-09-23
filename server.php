<?php

namespace SignallingServer;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;
use \SplObjectStorage;
use \Exception;

require __DIR__ . '/inc.lib/vendor/autoload.php';

/**
 * SignallingServer
 *
 * This class implements a WebSocket signaling server using Ratchet.
 * It is designed to support:
 * - Multi-room communication (roomId)
 * - Peer-to-peer signaling for WebRTC
 * - Chat history & event persistence (file-based)
 * - File sharing with chunked transfer
 *
 * Responsibilities:
 * - Manage connected clients (via SplObjectStorage)
 * - Track user sessions and metadata (username, room, etc.)
 * - Handle signaling messages for chat, file transfer, and stream events
 * - Persist chat history and events to disk
 */
class SignallingServer implements MessageComponentInterface
{
    /**
     * All connected WebSocket clients.
     * Each ConnectionInterface is mapped to its peerId.
     *
     * @var SplObjectStorage
     */
    protected $clients;

    /**
     * Map of peerId => user information
     * Each entry contains:
     * - peerId
     * - username
     * - name
     * - session
     * - roomId
     *
     * @var array
     */
    protected $users;

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->clients = new SplObjectStorage;
        $this->users   = array();
    }

    /**
     * Handle new WebSocket connection.
     *
     * @param ConnectionInterface $conn
     */
    public function onOpen(ConnectionInterface $conn)
    {
        $uri = $conn->httpRequest->getUri();
        parse_str($uri->getQuery(), $query);
        $sessionId = isset($query['PHPSESSID']) ? $query['PHPSESSID'] : null;
        $roomId    = isset($query['roomId']) ? $query['roomId'] : 'default';
        $peerId = substr(md5(uniqid()), 0, 8);
        $user = $this->getUserFromSession($sessionId);

        // Save mapping: connection -> peerId, peerId -> user info
        $this->clients->attach($conn, $peerId);
        $this->users[$peerId] = array(
            'peerId'   => $peerId,
            'username' => isset($user['username']) ? $user['username'] : 'guest',
            'name'     => isset($user['name']) ? $user['name'] : 'Guest User',
            'session'  => $sessionId,
            'roomId'   => $roomId
        );

        echo "New connection! PeerId={$peerId}, Room={$roomId}, User=" . $this->users[$peerId]['username'] . "\n";

        $peersInRoom = array();
        foreach ($this->users as $id => $info) {
            if ($info['roomId'] === $roomId) {
                $peersInRoom[$id] = $info;
            }
        }

        $conn->send(json_encode(array(
            'type'        => 'peers',
            'myId'        => $peerId,
            'peers'       => array_keys($peersInRoom),
            'peerDetails' => $peersInRoom
        )));

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

    /**
     * Load chat history from file (history_<roomId>.txt).
     *
     * @param string $roomId
     * @return array
     */
    public function loadChatHistory($roomId)
    {
        $dir = dirname(__DIR__) . "/";
        $path = dirname(__DIR__) . "/history_" . $roomId . ".txt";
        if (!file_exists($path)) return array();
        $lines = file($path);
        $data = array();
        foreach ($lines as $line) {
            if (trim($line) !== '') {
                $row = json_decode($line, true);
                
                // If entry is fileMeta, reload from meta JSON file
                if ($row['type'] == 'fileMeta') {
                    $fileId = $row['fileId'];
                    $saved = json_decode(file_get_contents($dir . $fileId . "-meta.json"), true);
                    if (!empty($saved)) {
                        $row = $saved;
                    }
                }
                $data[] = $row;
            }
        }
        return $data;
    }
    
    /**
     * Load chat events (promoteStream, demoteStream, etc.)
     * from file (event_<roomId>.txt).
     *
     * @param string $roomId
     * @return array
     */
    public function loadChatEvent($roomId)
    {
        $dir = dirname(__DIR__) . "/";
        $path = dirname(__DIR__) . "/event_" . $roomId . ".txt";
        if (!file_exists($path)) return array();
        $lines = file($path);
        $data = array();
        foreach ($lines as $line) {
            if (trim($line) !== '') {
                $row = json_decode($line, true);
                $data[] = $row;
            }
        }
        return $data;
    }

    /**
     * Handle incoming messages from a client.
     *
     * Supported message types:
     * - Direct private message (with "to")
     * - setMainScreen (update main video stream)
     * - requestChatHistory / requestChatEvent
     * - fileRequest (serve file in chunks)
     * - fileMeta, fileChunk, fileComplete (file upload handling)
     * - fileUpdate (notify meta update)
     * - General chat broadcast
     *
     * @param ConnectionInterface $from
     * @param string $msg
     */
    public function onMessage(ConnectionInterface $from, $msg)
    {
        $dir = dirname(__DIR__) . "/";
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
        } elseif (isset($data['type']) && $data['type'] === 'setMainScreen') {
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
        } elseif (isset($data['type']) && $data['type'] === 'requestChatHistory') {
            $from->send(json_encode(array(
                'type'        => 'chatHistory',
                'chatHistory' => $this->loadChatHistory($roomId)
            )));
        } elseif (isset($data['type']) && $data['type'] === 'requestChatEvent') {
            $from->send(json_encode(array(
                'type'        => 'chatEvent',
                'chatEvent' => $this->loadChatEvent($roomId)
            )));
        } elseif (isset($data['type']) && $data['type'] === 'fileRequest') {
            $fileId = $data['fileId'];
            $metaFile = $dir . $fileId . "-meta.json";
            if (!is_file($metaFile)) {
                // meta not available
                $from->send(json_encode(['type' => 'error', 'message' => 'meta not found', 'fileId' => $fileId]));
                return;
            }

            $meta = json_decode(file_get_contents($metaFile), true);
            if (empty($meta) || empty($meta['complete'])) {
                // not finished uploading yet
                $from->send(json_encode(['type' => 'error', 'message' => 'file not available yet', 'fileId' => $fileId]));
                return;
            }

            // use chunkSize from meta but limit maximum to avoid overflow
            $chunkSize = isset($meta['chunkSize']) ? (int)$meta['chunkSize'] : 16 * 1024;
            if ($chunkSize <= 0 || $chunkSize > 128 * 1024) $chunkSize = 16 * 1024; // default 16KB, max 128KB

            $fileSize  = isset($meta['size']) ? (int)$meta['size'] : 0;
            $extension = isset($meta['extension']) ? $meta['extension'] : '';

            // Send short meta first (client needs to know name/size/extension)
            $sendMeta = [
                'type'      => 'fileMeta',
                'fileId'    => $meta['fileId'],
                'name'      => $meta['name'],
                'extension' => $extension,
                'size'      => $fileSize,
                'chunkSize' => $chunkSize,
                'from'      => $meta['from']
            ];
            $from->send(json_encode($sendMeta));

            $filePath = $dir . $fileId . ($extension ? '.' . $extension : '');

            if (!is_file($filePath) || $fileSize === 0) {
                $from->send(json_encode(['type' => 'error', 'message' => 'file not found or empty', 'fileId' => $fileId]));
                return;
            }

            $fh = fopen($filePath, 'rb');
            if (!$fh) {
                $from->send(json_encode(['type' => 'error', 'message' => 'failed to open file', 'fileId' => $fileId]));
                return;
            }

            // loop and send per-chunk. Be careful with memory: unset & collect GC immediately
            $bytesSent = 0;
            $chunksBeforeGc = 32; // after 32 chunks, call gc_collect_cycles
            $chunkCounter = 0;

            while (!feof($fh) && $bytesSent < $fileSize) {
                $remaining = $fileSize - $bytesSent;
                $read = ($remaining >= $chunkSize) ? $chunkSize : $remaining;
                $buff = fread($fh, $read);
                if ($buff === false || $buff === '') break;

                // base64 encode chunk (needed to embed in JSON)
                $encoded = base64_encode($buff);

                $result = [
                    'type'      => 'fileChunk',
                    'fileId'    => $meta['fileId'],
                    'offset'    => $bytesSent,
                    'chunkSize' => strlen($buff), // actual bytes read
                    'data'      => $encoded,
                    'from'      => $meta['from']
                ];

                $from->send(json_encode($result));

                // update counters & free memory as soon as possible
                $bytesSent += strlen($buff);
                $chunkCounter++;

                // delete large variables so memory can be freed
                unset($buff, $encoded, $result);

                // lighten event loop / network buffer every few chunks
                if (($chunkCounter % 4) === 0) {
                    // give a short delay so socket can flush; value can be adjusted
                    usleep(1000); // 1ms
                }
                if (($chunkCounter % $chunksBeforeGc) === 0) {
                    gc_collect_cycles();
                }
            }

            fclose($fh);

            // done: notify client
            $from->send(json_encode([
                'type'   => 'fileComplete',
                'fileId' => $fileId,
                'from'   => $meta['from']
            ]));
        } else {

            if (isset($data['type']) && $data['type'] === 'fileMeta') {
                $fileId = $data['fileId'];
                $data['realtime'] = false; // Set realtime to false
                file_put_contents($dir . $fileId . "-meta.json", json_encode($data));
            } else if (isset($data['type']) && $data['type'] === 'fileComplete') {
                $fileId = $data['fileId'];
                $meta = json_decode(file_get_contents($dir . $fileId . "-meta.json"), true);
                $meta['complete'] = true; // Set complete to true
                file_put_contents($dir . $fileId . "-meta.json", json_encode($meta));
            } else if (isset($data['type']) && $data['type'] === 'fileChunk') {
                $fileId = $data['fileId'];
                $extension = $data['extension'];
                $offset = (int) $data['offset'];
                if ($offset === 0) {
                    file_put_contents($dir . $fileId . "." . $extension, base64_decode($data['data']));
                } else {
                    file_put_contents($dir . $fileId . "." . $extension, base64_decode($data['data']), FILE_APPEND);
                }
            }

            // Only for peer who request update
            if (isset($data['type']) && $data['type'] === 'fileUpdate') {
                $fileId = $data['fileId'];
                $meta = json_decode(file_get_contents($dir . $fileId . "-meta.json"), true);
                $meta['type'] = 'fileUpdate';
                $msg = json_encode($meta);
                $from->send($msg);
            }
            else if (isset($data['type']) && $data['type'] === 'fileRequest') {
            }
            else
            {
                // Broadcast to all peers in room
                foreach ($this->clients as $client) {
                    $targetPeerId = $this->clients[$client];
                    if ($client !== $from && $this->users[$targetPeerId]['roomId'] === $roomId) {
                        $client->send($msg);
                    }
                }
            }
        }

        // Save history to file
        if (isset($data['type']) && ($data['type'] === 'chat' || $data['type'] === 'fileMeta')) {
            $str = json_encode($data);
            file_put_contents(dirname(__DIR__) . "/history_" . $roomId . ".txt", $str . "\r\n", FILE_APPEND);
        }
        
        // Save event to file
        if (isset($data['type']) && ($data['type'] === 'demoteStream' || $data['type'] === 'promoteStream' || $data['type'] === 'stopSharing' || $data['type'] === "streamUpdate")) {
            $str = json_encode($data);
            file_put_contents(dirname(__DIR__) . "/event_" . $roomId . ".txt", $str . "\r\n", FILE_APPEND);
        }
    }


    /**
     * Handle client disconnection.
     * Remove peer from tracking and notify room peers.
     *
     * @param ConnectionInterface $conn
     */
    public function onClose(ConnectionInterface $conn)
    {
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

    /**
     * Handle error event for a client.
     *
     * @param ConnectionInterface $conn
     * @param Exception $e
     */
    public function onError(ConnectionInterface $conn, Exception $e)
    {
        echo "Error: " . $e->getMessage() . "\n";
        $conn->close();
    }

    /**
     * Load user information from PHP session file.
     * NOTE: This is a demo implementation and not secure for production.
     *
     * @param string $sessionId
     * @return array
     */
    private function getUserFromSession($sessionId)
    {
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
