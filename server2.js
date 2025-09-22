// server.js
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const url = require("url");

class SignallingServer {
    constructor() {
        this.clients = new Map(); // ws -> peerId
        this.users = {}; // peerId -> user info
    }

    getUserFromSession(sessionId) {
        if (!sessionId) return {};
        let sessionFile = path.join(require("os").tmpdir(), `sess_${sessionId}`);
        if (fs.existsSync(sessionFile)) {
            let data = fs.readFileSync(sessionFile, "utf8");
            if (data.includes("username")) {
                return {
                    username: "demoUser",
                    name: "Demo Name"
                };
            }
        }
        return {};
    }

    loadHistory(roomId) {
        const dir = path.join(__dirname, "..");
        const filePath = path.join(dir, `history_${roomId}.txt`);
        if (!fs.existsSync(filePath)) return [];
        let lines = fs.readFileSync(filePath, "utf8").split("\n");
        let data = [];
        for (let line of lines) {
            if (line.trim() !== "") {
                let row = JSON.parse(line);
                if (row.type === "fileMeta") {
                    const metaFile = path.join(dir, `${row.fileId}-meta.json`);
                    if (fs.existsSync(metaFile)) {
                        let saved = JSON.parse(fs.readFileSync(metaFile, "utf8"));
                        if (saved) row = saved;
                    }
                }
                data.push(row);
            }
        }
        return data;
    }

    onConnection(ws, req) {
        const query = url.parse(req.url, true).query;
        const sessionId = query.PHPSESSID || null;
        const roomId = query.roomId || "default";
        const peerId = uuidv4().substring(0, 8);
        const user = this.getUserFromSession(sessionId);

        this.clients.set(ws, peerId);
        this.users[peerId] = {
            peerId,
            username: user.username || "guest",
            name: user.name || "Guest User",
            session: sessionId,
            roomId
        };

        console.log(`New connection! PeerId=${peerId}, Room=${roomId}, User=${this.users[peerId].username}`);

        // Peers in same room
        const peersInRoom = {};
        for (let id in this.users) {
            if (this.users[id].roomId === roomId) {
                peersInRoom[id] = this.users[id];
            }
        }

        ws.send(JSON.stringify({
            type: "peers",
            myId: peerId,
            peers: Object.keys(peersInRoom),
            peerDetails: peersInRoom
        }));

        // Notify others
        this.broadcast(roomId, ws, {
            type: "newPeer",
            peerId,
            peerDetail: this.users[peerId]
        });

        ws.on("message", (msg) => this.onMessage(ws, msg));
        ws.on("close", () => this.onClose(ws));
        ws.on("error", (err) => this.onError(ws, err));
    }

    onMessage(ws, msg) {
        const dir = path.join(__dirname, "..");
        const peerId = this.clients.get(ws);
        const user = this.users[peerId];
        if (!user) return;

        const roomId = user.roomId;
        let data;
        try {
            data = JSON.parse(msg);
        } catch {
            return;
        }

        // Private message
        if (data.to && this.users[data.to]) {
            const targetPeerId = data.to;
            const targetUser = this.users[targetPeerId];
            if (targetUser.roomId === roomId) {
                for (let [client, id] of this.clients) {
                    if (id === targetPeerId) {
                        client.send(msg);
                        return;
                    }
                }
            }
        }

        switch (data.type) {
            case "setMainScreen":
                this.broadcast(roomId, ws, {
                    type: "setMainScreen",
                    from: peerId,
                    streamId: data.streamId
                });
                break;

            case "requestChatHistory":
                ws.send(JSON.stringify({
                    type: "chatHistory",
                    chatHistory: this.loadHistory(roomId)
                }));
                break;

            case "fileRequest": {
                const fileId = data.fileId;
                const metaFile = path.join(dir, `${fileId}-meta.json`);
                if (!fs.existsSync(metaFile)) {
                    ws.send(JSON.stringify({ type: "error", message: "meta not found", fileId }));
                    return;
                }
                const meta = JSON.parse(fs.readFileSync(metaFile));
                if (!meta || !meta.complete) {
                    ws.send(JSON.stringify({ type: "error", message: "file not available yet", fileId }));
                    return;
                }

                let chunkSize = parseInt(meta.chunkSize) || 16 * 1024;
                if (chunkSize <= 0 || chunkSize > 128 * 1024) chunkSize = 16 * 1024;
                const fileSize = meta.size || 0;
                const extension = meta.extension || "";
                const filePath = path.join(dir, `${fileId}${extension ? "." + extension : ""}`);

                ws.send(JSON.stringify({
                    type: "fileMeta",
                    fileId: meta.fileId,
                    name: meta.name,
                    extension,
                    size: fileSize,
                    chunkSize,
                    from: meta.from
                }));

                if (!fs.existsSync(filePath) || fileSize === 0) {
                    ws.send(JSON.stringify({ type: "error", message: "file not found or empty", fileId }));
                    return;
                }

                const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
                let offset = 0;
                stream.on("data", (chunk) => {
                    ws.send(JSON.stringify({
                        type: "fileChunk",
                        fileId: meta.fileId,
                        offset,
                        chunkSize: chunk.length,
                        data: chunk.toString("base64"),
                        from: meta.from
                    }));
                    offset += chunk.length;
                });
                stream.on("end", () => {
                    ws.send(JSON.stringify({
                        type: "fileComplete",
                        fileId,
                        from: meta.from
                    }));
                });
                break;
            }

            case "fileMeta":
                data.realtime = false;
                fs.writeFileSync(path.join(dir, `${data.fileId}-meta.json`), JSON.stringify(data));
                break;

            case "fileComplete": {
                const fileId = data.fileId;
                const metaFile = path.join(dir, `${fileId}-meta.json`);
                if (fs.existsSync(metaFile)) {
                    let meta = JSON.parse(fs.readFileSync(metaFile));
                    meta.complete = true;
                    fs.writeFileSync(metaFile, JSON.stringify(meta));
                }
                break;
            }

            case "fileChunk": {
                const { fileId, extension, offset, data: chunkData } = data;
                const filePath = path.join(dir, `${fileId}.${extension}`);
                const buffer = Buffer.from(chunkData, "base64");
                if (offset === 0) {
                    fs.writeFileSync(filePath, buffer);
                } else {
                    fs.appendFileSync(filePath, buffer);
                }
                break;
            }

            case "fileUpdate": {
                const fileId = data.fileId;
                const metaFile = path.join(dir, `${fileId}-meta.json`);
                if (fs.existsSync(metaFile)) {
                    let meta = JSON.parse(fs.readFileSync(metaFile));
                    meta.type = "fileUpdate";
                    ws.send(JSON.stringify(meta));
                }
                break;
            }

            default:
                this.broadcast(roomId, ws, data);
        }

        // Save chat/fileMeta to history
        if (["chat", "fileMeta"].includes(data.type)) {
            const str = JSON.stringify(data);
            fs.appendFileSync(path.join(dir, `history_${roomId}.txt`), str + "\r\n");
        }
    }

    broadcast(roomId, excludeWs, payload) {
        const msg = JSON.stringify(payload);
        for (let [client, id] of this.clients) {
            if (client !== excludeWs && this.users[id]?.roomId === roomId) {
                client.send(msg);
            }
        }
    }

    onClose(ws) {
        const peerId = this.clients.get(ws);
        if (!peerId) return;
        const roomId = this.users[peerId].roomId;
        console.log(`Client disconnected: ${peerId} from Room=${roomId}`);
        this.clients.delete(ws);
        delete this.users[peerId];
        this.broadcast(roomId, ws, { type: "peerLeave", peerId });
    }

    onError(ws, err) {
        console.error("Error:", err.message);
        ws.close();
    }
}

// Run server
const wss = new WebSocket.Server({ port: 3000 });
const server = new SignallingServer();
wss.on("connection", (ws, req) => server.onConnection(ws, req));

console.log("WebSocket signalling server running on ws://localhost:3000");
