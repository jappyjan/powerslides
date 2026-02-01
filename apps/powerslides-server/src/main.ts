import express from "express";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";

import {
  derivePairingRoomName,
  type SlideState,
  type WsCommandMessage,
  type WsMessage,
  type WsStateMessage,
} from "@jappyjan/powerslides-shared";

type Room = {
  clients: Set<WebSocket>;
  lastState: SlideState | null;
  extension: WebSocket | null;
};

const PORT = Number(process.env.PORT ?? 4001);

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, Room>();
const socketRooms = new Map<WebSocket, string>();

const getOrCreateRoom = (name: string): Room => {
  const existing = rooms.get(name);
  if (existing) {
    return existing;
  }
  const next: Room = { clients: new Set(), lastState: null, extension: null };
  rooms.set(name, next);
  return next;
};

const sendMessage = (socket: WebSocket, message: WsMessage) => {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(message));
};

const broadcast = (room: Room, message: WsMessage) => {
  for (const client of room.clients) {
    sendMessage(client, message);
  }
};

const removeFromRoom = (socket: WebSocket) => {
  const roomName = socketRooms.get(socket);
  if (!roomName) {
    return;
  }
  const room = rooms.get(roomName);
  socketRooms.delete(socket);
  if (!room) {
    return;
  }
  room.clients.delete(socket);
  if (room.extension === socket) {
    room.extension = null;
  }
  if (room.clients.size === 0) {
    rooms.delete(roomName);
  }
};

wss.on("connection", (socket) => {
  socket.on("message", async (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    let message: WsMessage | null = null;
    try {
      message = JSON.parse(raw) as WsMessage;
    } catch {
      return;
    }

    if (message.type === "join") {
      if (!message.pairingCode || typeof message.pairingCode !== "string") {
        return;
      }
      const roomName = await derivePairingRoomName(message.pairingCode);
      const room = getOrCreateRoom(roomName);
      room.clients.add(socket);
      socketRooms.set(socket, roomName);
      if (room.lastState) {
        sendMessage(socket, { type: "state", payload: room.lastState });
      }
      return;
    }

    const roomName = socketRooms.get(socket);
    if (!roomName) {
      return;
    }
    const room = rooms.get(roomName);
    if (!room) {
      return;
    }

    if (message.type === "state") {
      const payload = (message as WsStateMessage).payload;
      if (!payload) {
        return;
      }
      room.lastState = payload;
      room.extension = socket;
      broadcast(room, message);
      return;
    }

    if (message.type === "command") {
      const payload = (message as WsCommandMessage).payload;
      if (!payload || !room.extension) {
        return;
      }
      sendMessage(room.extension, message);
    }
  });

  socket.on("close", () => {
    removeFromRoom(socket);
  });
});

server.listen(PORT, () => {
  console.info(`[powerslides-server] listening on ${PORT}`);
});
