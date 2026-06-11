// path: socket-server.js
const { WebSocketServer } = require("ws");
const WebSocket = require("ws");

const wss = new WebSocketServer({ port: 3002 });

// Store room information
const rooms = new Map();

// Helper function to log objects completely
const deepLog = (obj) => {
  console.log(JSON.stringify(obj, null, 2));
};

wss.on("connection", (ws) => {
  let userRoom = null;
  let username = null;

  const broadcastUserCount = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const message = JSON.stringify({
      type: "userCount",
      count: room.users.size,
    });

    room.users.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  };

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received message type:", data.type);
      console.log("Room ID:", data.roomId);

      if (data.delta) {
        console.log("Delta operations:");
        deepLog(data.delta); // Log the full delta object
      }

      if (data.contents) {
        console.log("Contents:");
        deepLog(data.contents); // Log the full contents object
      }

      if (data.type === "join") {
        userRoom = data.roomId;
        username = data.username;
        console.log(`User ${username} joining room ${userRoom}`);

        if (!rooms.has(userRoom)) {
          console.log(`Creating new room ${userRoom}`);
          rooms.set(userRoom, {
            users: new Map(),
            content: null,
          });
        }

        const room = rooms.get(userRoom);
        room.users.set(ws, { username, ws });
        console.log(`Room ${userRoom} now has ${room.users.size} users`);

        if (room.content) {
          console.log("Sending initial content to new user");
          ws.send(
            JSON.stringify({
              type: "init-content",
              roomId: userRoom,
              contents: room.content,
            }),
          );
        }

        broadcastUserCount(userRoom);
      } else if (data.type === "content") {
        const room = rooms.get(data.roomId);
        if (room) {
          room.content = data.contents;
          console.log(`Broadcasting content update in room ${data.roomId}`);

          room.users.forEach((user) => {
            if (user.ws !== ws && user.ws.readyState === WebSocket.OPEN) {
              user.ws.send(
                JSON.stringify({
                  type: "content",
                  roomId: data.roomId,
                  delta: data.delta,
                }),
              );
            }
          });
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      console.error(error.stack);
    }
  });

  ws.on("close", () => {
    if (userRoom && rooms.has(userRoom)) {
      console.log(`User ${username} leaving room ${userRoom}`);
      const room = rooms.get(userRoom);
      room.users.delete(ws);

      if (room.users.size === 0) {
        console.log(`Removing empty room ${userRoom}`);
        rooms.delete(userRoom);
      } else {
        console.log(`Room ${userRoom} now has ${room.users.size} users`);
        broadcastUserCount(userRoom);
      }
    }
  });
});

console.log("WebSocket server is running on ws://localhost:3002");
