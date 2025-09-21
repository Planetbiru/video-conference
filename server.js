// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });
const clients = new Map(); // ws.id -> ws

wss.on('connection', ws => {
    ws.id = Math.random().toString(36).substring(2, 10);

    // default room jika tidak join
    ws.roomId = "default";

    clients.set(ws.id, ws);
    console.log(`New client connected with ID: ${ws.id}, room=${ws.roomId}`);

    // saat koneksi baru, kirim daftar peers di room yg sama
    const otherClientIds = Array.from(clients.values())
        .filter(c => c.id !== ws.id && c.roomId === ws.roomId)
        .map(c => c.id);

    ws.send(JSON.stringify({
        type: 'peers',
        peers: otherClientIds,
        myId: ws.id
    }));

    // broadcast newPeer ke room yg sama
    clients.forEach(client => {
        if (
            client !== ws &&
            client.readyState === WebSocket.OPEN &&
            client.roomId === ws.roomId
        ) {
            client.send(JSON.stringify({
                type: 'newPeer',
                peerId: ws.id,
                peerDetail: { roomId: ws.roomId }
            }));
        }
    });

    ws.on('message', rawMsg => {
        let data;
        try {
            data = JSON.parse(rawMsg);
        } catch (e) {
            console.error("Failed to parse message:", rawMsg);
            return;
        }

        // --- routing logic by room ---
        if (data.type === "joinRoom") {
            const oldRoom = ws.roomId;
            ws.roomId = data.roomId || "default";
            console.log(`Client ${ws.id} moved from room=${oldRoom} to room=${ws.roomId}`);

            // kirim daftar peers baru
            const peersInRoom = Array.from(clients.values())
                .filter(c => c.id !== ws.id && c.roomId === ws.roomId)
                .map(c => c.id);

            ws.send(JSON.stringify({
                type: 'peers',
                peers: peersInRoom,
                myId: ws.id
            }));
            return;
        }

        // direct message (hanya jika target di room yg sama)
        if (data.to && clients.has(data.to)) {
            const targetClient = clients.get(data.to);
            if (
                targetClient.readyState === WebSocket.OPEN &&
                targetClient.roomId === ws.roomId
            ) {
                targetClient.send(JSON.stringify({ ...data, from: ws.id }));
            }
        }
        else if (data.type === 'setMainScreen') {
            clients.forEach(client => {
                if (
                    client !== ws &&
                    client.readyState === WebSocket.OPEN &&
                    client.roomId === ws.roomId
                ) {
                    client.send(JSON.stringify({
                        type: 'setMainScreen',
                        streamId: data.streamId
                    }));
                }
            });
        }
        else if (data.type === 'requestChatHistory') {
            // contoh: tiap room bisa punya history sendiri
            ws.send(JSON.stringify({
                type: 'chatHistory',
                chatHistory: [] // TODO: load dari file per-room
            }));
        }
        else {
            // broadcast ke semua peer di room yg sama
            clients.forEach(client => {
                if (
                    client !== ws &&
                    client.readyState === WebSocket.OPEN &&
                    client.roomId === ws.roomId
                ) {
                    client.send(JSON.stringify({ ...data, from: ws.id }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${ws.id} (room=${ws.roomId})`);
        clients.delete(ws.id);

        clients.forEach(client => {
            if (
                client.readyState === WebSocket.OPEN &&
                client.roomId === ws.roomId
            ) {
                client.send(JSON.stringify({ type: 'peerLeave', peerId: ws.id }));
            }
        });
    });
});

console.log('Signalling server running on ws://localhost:3000');
