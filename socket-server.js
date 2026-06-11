const http = require("http");
const { WebSocketServer } = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils");

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});

server.listen(3002, () => {
  console.log("Yjs WebSocket server running on ws://localhost:3002");
});
