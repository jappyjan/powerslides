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

const getSocketInfo = (req: http.IncomingMessage) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  const userAgent = req.headers["user-agent"] ?? "unknown";
  return { ip, userAgent };
};

const logSocketPrefix = (socketId: number) => `[powerslides-server] ws id=${socketId}`;

wss.on("connection", (socket, req) => {
  const socketId = ++socketSequence;
  const { ip, userAgent } = getSocketInfo(req);
  console.info(`${logSocketPrefix(socketId)} connected ip=${ip} ua=${userAgent}`);

  socket.on("message", async (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    let message: WsMessage | null = null;
    try {
      message = JSON.parse(raw) as WsMessage;
    } catch {
      console.warn(`${logSocketPrefix(socketId)} invalid json size=${raw.length}`);
      return;
    }

    if (message.type === "join") {
      if (!message.slideId || typeof message.slideId !== "string") {
        console.warn(`${logSocketPrefix(socketId)} join missing slideId`);
        return;
      }

      if (!message.password || typeof message.password !== "string") {
        console.warn(`${logSocketPrefix(socketId)} join missing password slideId=${message.slideId}`);
        return;
      }

      if (!message.createRoom && !rooms.has(message.slideId)) {
        console.warn(
          `${logSocketPrefix(socketId)} join room missing slideId=${message.slideId}`,
        );
        socket.close();
        return;
      }

      try {
        const roomExisted = rooms.has(message.slideId);
        const room = getOrCreateRoom(message.slideId, message.password);
        room.clients.add(socket);
        socketRooms.set(socket, message.slideId);
        console.info(
          `${logSocketPrefix(socketId)} joined slideId=${message.slideId} clients=${room.clients.size} created=${!roomExisted}`,
        );
        if (room.lastState) {
          sendMessage(socket, { type: "state", payload: room.lastState });
          console.info(
            `${logSocketPrefix(socketId)} sent lastState slideId=${message.slideId}`,
          );
        }
      } catch (error) {
        console.warn(
          `${logSocketPrefix(socketId)} join failed slideId=${message.slideId}`,
        );
        socket.close();
        return;
      }
      return;
    }

    const roomName = socketRooms.get(socket);
    if (!roomName) {
      console.warn(`${logSocketPrefix(socketId)} message without room type=${message.type}`);
      socket.close();
      return;
    }
    const room = rooms.get(roomName);
    if (!room) {
      console.warn(`${logSocketPrefix(socketId)} room missing room=${roomName}`);
      socket.close();
      return;
    }

    if (message.type === "state") {
      const payload = (message as WsStateMessage).payload;
      if (!payload) {
        console.warn(`${logSocketPrefix(socketId)} state missing payload room=${roomName}`);
        return;
      }
      room.lastState = payload;
      room.extension = socket;
      console.info(
        `${logSocketPrefix(socketId)} state room=${roomName} clients=${room.clients.size}`,
      );
      broadcast(room, message);
      return;
    }

    if (message.type === "command") {
      const payload = (message as WsCommandMessage).payload;
      if (!payload || !room.extension) {
        console.warn(
          `${logSocketPrefix(socketId)} command ignored room=${roomName} hasExtension=${Boolean(
            room.extension,
          )}`,
        );
        return;
      }
      console.info(`${logSocketPrefix(socketId)} command room=${roomName}`);
      sendMessage(room.extension, message);
      return;
    }

    const messageType = (message as { type?: string }).type ?? "unknown";
    console.warn(
      `${logSocketPrefix(socketId)} unknown message type=${messageType} room=${roomName}`,
    );
  });

  socket.on("close", () => {
    const roomName = socketRooms.get(socket);
    removeFromRoom(socket);
    if (roomName) {
      const room = rooms.get(roomName);
      console.info(
        `${logSocketPrefix(socketId)} closed room=${roomName} remaining=${room?.clients.size ?? 0}`,
      );
      if (!room) {
        console.info(`${logSocketPrefix(socketId)} room deleted room=${roomName}`);
      }
    } else {
      console.info(`${logSocketPrefix(socketId)} closed`);
    }
  });

  socket.on("error", (error) => {
    console.warn(`${logSocketPrefix(socketId)} error message=${error.message}`);
  });
});

server.listen(PORT, () => {
  console.info(`[powerslides-server] listening on ${PORT}`);
});
