import express from "express";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";

import {
  type PresentationData,
  type WsCommandMessage,
  type WsMessage,
  type WsStateMessage,
} from "@jappyjan/powerslides-shared";

type Room = {
  password: string;
  clients: Set<WebSocket>;
  lastState: PresentationData | null;
  extension: WebSocket | null;
};

const PORT = Number(process.env.PORT ?? 4001);

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, Room>();
const socketRooms = new Map<WebSocket, string>();
let socketSequence = 0;

const getOrCreateRoom = (name: string, password: string): Room => {
  const existing = rooms.get(name);
  if (existing) {
    if (existing.password !== password) {
      throw new Error("Invalid password");
    }
    return existing;
  }
  const next: Room = { clients: new Set(), lastState: null, extension: null, password };
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
  const socketId = ++socketSequence;
  console.info(`[powerslides-server] ws connected id=${socketId}`);

  socket.on("message", async (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    let message: WsMessage | null = null;
    try {
      message = JSON.parse(raw) as WsMessage;
    } catch {
      console.warn(`[powerslides-server] ws invalid json id=${socketId}`);
      return;
    }

    if (message.type === "join") {
      if (!message.slideId || typeof message.slideId !== "string") {
        console.warn(`[powerslides-server] ws join missing slideId id=${socketId}`);
        return;
      }

      if (!message.password || typeof message.password !== "string") {
        console.warn(`[powerslides-server] ws join missing password id=${socketId}`);
        return;
      }

      if (!message.createRoom && !rooms.has(message.slideId)) {
        console.warn(
          `[powerslides-server] ws join room missing id=${socketId} slideId=${message.slideId}`,
        );
        socket.close();
        return;
      }

      try {
        const room = getOrCreateRoom(message.slideId, message.password);
        room.clients.add(socket);
        socketRooms.set(socket, message.slideId);
        console.info(
          `[powerslides-server] ws joined id=${socketId} slideId=${message.slideId} clients=${room.clients.size}`,
        );
        if (room.lastState) {
          sendMessage(socket, { type: "state", payload: room.lastState });
          console.info(
            `[powerslides-server] ws sent lastState id=${socketId} slideId=${message.slideId}`,
          );
        }
      } catch (error) {
        console.warn(
          `[powerslides-server] ws join failed id=${socketId} slideId=${message.slideId}`,
        );
        socket.close();
        return;
      }
      return;
    }

    const roomName = socketRooms.get(socket);
    if (!roomName) {
      console.warn(`[powerslides-server] ws message without room id=${socketId}`);
      socket.close();
      return;
    }
    const room = rooms.get(roomName);
    if (!room) {
      console.warn(`[powerslides-server] ws room missing id=${socketId} room=${roomName}`);
      socket.close();
      return;
    }

    if (message.type === "state") {
      const payload = (message as WsStateMessage).payload;
      if (!payload) {
        console.warn(`[powerslides-server] ws state missing payload id=${socketId}`);
        return;
      }
      room.lastState = payload;
      room.extension = socket;
      console.info(
        `[powerslides-server] ws state id=${socketId} room=${roomName} clients=${room.clients.size}`,
      );
      broadcast(room, message);
      return;
    }

    if (message.type === "command") {
      const payload = (message as WsCommandMessage).payload;
      if (!payload || !room.extension) {
        console.warn(
          `[powerslides-server] ws command ignored id=${socketId} room=${roomName} hasExtension=${Boolean(
            room.extension,
          )}`,
        );
        return;
      }
      console.info(`[powerslides-server] ws command id=${socketId} room=${roomName}`);
      sendMessage(room.extension, message);
    }
  });

  socket.on("close", () => {
    removeFromRoom(socket);
    console.info(`[powerslides-server] ws closed id=${socketId}`);
  });
});

server.listen(PORT, () => {
  console.info(`[powerslides-server] listening on ${PORT}`);
});
