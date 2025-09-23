const WebSocket = require("ws");
const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

class SignallingServer {
    constructor() {
        this.clients = new Map(); // ws => peerId
        this.users = {};          // peerId => user info
    }

    generatePeerId() {
        return Math.random().toString(16).substr(2, 8);
    }

    getUserFromSession(sessionId) {
        if (!sessionId) return {};
        const sessionPath = path.join(require("os").tmpdir(), "sess_" + sessionId);
        if (fs.existsSync(sessionPath)) {
            const data = fs.readFileSync(sessionPath, "utf8");
            if (data.includes("username")) {
                return { username: "demoUser", name: "Demo Name" };
            }
        }
        return {};
    }

    onOpen(ws, req) {
        const query = url.parse(req.url, true).query;
        const sessionId = query["PHPSESSID"] || null;
        const roomId = query["roomId"] || "default";
        const peerId = this.generatePeerId();
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

        const peersInRoom = {};
        for (const id in this.users) {
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

        for (const [client, id] of this.clients.entries()) {
            if (client !== ws && this.users[id].roomId === roomId) {
                const message = JSON.stringify({
                    type: "newPeer",
                    peerId: peerId,
                    peerDetail: this.users[peerId]
                });
                client.send(message);
            }
        }
    }

    loadHistory(roomId) {
        const dir = path.join(__dirname, "..");
        const filePath = path.join(__dirname, "..", `history_${roomId}.txt`);
        if (!fs.existsSync(filePath)) return [];
        const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
        const data = [];
        for (const line of lines) {
            if (line.trim() !== "") {
                let row = JSON.parse(line);
                if (row.type === "fileMeta") {
                    const savedPath = path.join(dir, `${row.fileId}-meta.json`);
                    if (fs.existsSync(savedPath)) {
                        row = JSON.parse(fs.readFileSync(savedPath, "utf8"));
                    }
                }
                data.push(row);
            }
        }
        return data;
    }

    onMessage(ws, msg) {
        const dir = __dirname + "/../";
        const peerId = this.clients.get(ws);
        const user   = this.users[peerId];
        const roomId = user.roomId;

        let data;
        try {
            data = JSON.parse(msg);
        } catch (e) {
            return;
        }
        if (!data) return;

        // Direct message (private)
        if (data.to && this.users[data.to]) {
            const target = this.users[data.to];
            if (target.roomId === roomId) {
                for (const [client, id] of this.clients) {
                    if (id === data.to) {
                        client.send(typeof msg === "string" ? msg : JSON.stringify(msg));
                        break;
                    }
                }
            }
        }
        else if (data.type === "setMainScreen") {
            for (const [client, id] of this.clients) {
                if (client !== ws && this.users[id].roomId === roomId) {
                    client.send(JSON.stringify({
                        type: "setMainScreen",
                        from: peerId,
                        streamId: data.streamId
                    }));
                }
            }
        }
        else if (data.type === "requestChatHistory") {
            ws.send(JSON.stringify({
                type: "chatHistory",
                chatHistory: this.loadHistory(roomId)
            }));
        }
        else if (data.type === "fileRequest") {
            const fileId = data.fileId;
            const metaFile = dir + fileId + "-meta.json";
            if (!fs.existsSync(metaFile)) {
                ws.send(JSON.stringify({type:"error", message:"meta not found", fileId}));
                return;
            }

            const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
            if (!meta || !meta.complete) {
                ws.send(JSON.stringify({type:"error", message:"file not available yet", fileId}));
                return;
            }

            let chunkSize = meta.chunkSize ? parseInt(meta.chunkSize) : 16*1024;
            if (chunkSize <= 0 || chunkSize > 128*1024) chunkSize = 16*1024;

            const fileSize  = meta.size ? parseInt(meta.size) : 0;
            const extension = meta.extension || "";

            ws.send(JSON.stringify({
                type: "fileMeta",
                fileId: meta.fileId,
                name: meta.name,
                extension,
                size: fileSize,
                chunkSize,
                from: meta.from
            }));

            const filePath = dir + fileId + (extension ? "." + extension : "");
            if (!fs.existsSync(filePath) || fileSize === 0) {
                ws.send(JSON.stringify({type:"error", message:"file not found or empty", fileId}));
                return;
            }

            const fh = fs.openSync(filePath, "r");
            let bytesSent = 0;
            let chunkCounter = 0;
            const chunksBeforeGc = 32;
            const buffer = Buffer.alloc(chunkSize);

            while (bytesSent < fileSize) {
                const read = fs.readSync(fh, buffer, 0, chunkSize, bytesSent);
                if (read <= 0) break;

                const slice = buffer.slice(0, read);
                const encoded = slice.toString("base64");

                ws.send(JSON.stringify({
                    type: "fileChunk",
                    fileId: meta.fileId,
                    offset: bytesSent,
                    chunkSize: read,
                    data: encoded,
                    from: meta.from
                }));

                bytesSent += read;
                chunkCounter++;

                if (chunkCounter % 4 === 0) {
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1); // usleep(1ms) setara
                }
                if (chunkCounter % chunksBeforeGc === 0) {
                    global.gc && global.gc();
                }
            }
            fs.closeSync(fh);

            ws.send(JSON.stringify({
                type: "fileComplete",
                fileId,
                from: meta.from
            }));
        }
        else {
            if (data.type === "fileMeta") {
                const fileId = data.fileId;
                data.realtime = false;
                fs.writeFileSync(dir + fileId + "-meta.json", JSON.stringify(data));
            }
            else if (data.type === "fileComplete") {
                const fileId = data.fileId;
                const meta = JSON.parse(fs.readFileSync(dir + fileId + "-meta.json", "utf8"));
                meta.complete = true;
                fs.writeFileSync(dir + fileId + "-meta.json", JSON.stringify(meta));
            }
            else if (data.type === "fileChunk") {
                const fileId = data.fileId;
                const extension = data.extension;
                const offset = parseInt(data.offset);
                const filePath = dir + fileId + "." + extension;
                const chunk = Buffer.from(data.data, "base64");
                if (offset === 0) {
                    fs.writeFileSync(filePath, chunk);
                } else {
                    fs.appendFileSync(filePath, chunk);
                }
            }

            if (data.type === "fileUpdate") {
                const fileId = data.fileId;
                const meta = JSON.parse(fs.readFileSync(dir + fileId + "-meta.json", "utf8"));
                meta.type = "fileUpdate";
                ws.send(JSON.stringify(meta));
            }
            else if (data.type === "fileRequest") {
                // do nothing
            }
            else {
                for (const [client, id] of this.clients) {
                    if (client !== ws && this.users[id].roomId === roomId) {
                        client.send(typeof msg === "string" ? msg : JSON.stringify(msg));
                    }
                }
            }
        }

        // Save history
        if (data.type === "chat" || data.type === "fileMeta") {
            const str = JSON.stringify(data);
            fs.appendFileSync(__dirname + "/../history_" + roomId + ".txt", str + "\r\n");
        }
    }


    onClose(ws) {
        const peerId = this.clients.get(ws);
        if (!peerId) return;
        const roomId = this.users[peerId].roomId;
        console.log(`Client disconnected: ${peerId} from Room=${roomId}`);

        this.clients.delete(ws);
        delete this.users[peerId];

        for (const [client, id] of this.clients.entries()) {
            if (this.users[id].roomId === roomId) {
                client.send(JSON.stringify({
                    type: "peerLeave",
                    peerId: peerId
                }));
            }
        }
    }
}

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const signalling = new SignallingServer();

wss.on("connection", (ws, req) => {
    signalling.onOpen(ws, req);

    ws.on("message", msg => signalling.onMessage(ws, msg.toString()));
    ws.on("close", () => signalling.onClose(ws));
    ws.on("error", err => console.error("Error:", err.message));
});

server.listen(3000, () => {
    console.log("Signalling server running at ws://localhost:3000");
});
