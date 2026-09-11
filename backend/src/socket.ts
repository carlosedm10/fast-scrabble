import type { Server, Socket } from "socket.io";
import { initDb, loadRoom, saveRoom } from "./db";
import {
  createRoom,
  exchangeTiles,
  getPlayerByToken,
  joinRoom,
  passTurn,
  playTiles,
  sanitizeRoomForClient,
  startGame,
} from "./game/room";
import type { GameRoom, Language, MovePlacement } from "./game/types";

const rooms = new Map<string, GameRoom>();

async function getOrLoadRoom(code: string): Promise<GameRoom | null> {
  const upper = code.toUpperCase();
  if (rooms.has(upper)) return rooms.get(upper)!;
  const loaded = await loadRoom(upper);
  if (loaded) rooms.set(upper, loaded);
  return loaded;
}

async function persistRoom(room: GameRoom): Promise<void> {
  rooms.set(room.code, room);
  await saveRoom(room);
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on("room:create", async (data: { nickname: string; language: Language }, cb) => {
      try {
        const room = createRoom(data.language, data.nickname);
        await persistRoom(room);
        const player = room.players[0];
        socket.join(room.code);
        cb({ ok: true, room: sanitizeRoomForClient(room, player.token), token: player.token });
        io.to(room.code).emit("room:updated", sanitizeRoomForClient(room));
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });

    socket.on("room:join", async (data: { code: string; nickname: string }, cb) => {
      try {
        const room = await getOrLoadRoom(data.code);
        if (!room) return cb({ ok: false, error: "Room not found" });

        const result = joinRoom(room, data.nickname);
        if ("error" in result) return cb({ ok: false, error: result.error });

        await persistRoom(result.room);
        socket.join(result.room.code);
        cb({
          ok: true,
          room: sanitizeRoomForClient(result.room, result.player.token),
          token: result.player.token,
        });
        io.to(result.room.code).emit("room:updated", sanitizeRoomForClient(result.room));
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });

    socket.on("room:start", async (data: { code: string; token: string }, cb) => {
      try {
        const room = await getOrLoadRoom(data.code);
        if (!room) return cb({ ok: false, error: "Room not found" });

        const player = getPlayerByToken(room, data.token);
        if (!player) return cb({ ok: false, error: "Invalid token" });

        const result = startGame(room, player.id);
        if ("error" in result) return cb({ ok: false, error: result.error });

        await persistRoom(result);
        io.to(result.code).emit("room:updated", sanitizeRoomForClient(result));
        cb({ ok: true, room: sanitizeRoomForClient(result, data.token) });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });

    socket.on("game:play", async (data: { code: string; token: string; moves: MovePlacement[] }, cb) => {
      try {
        const room = await getOrLoadRoom(data.code);
        if (!room) return cb({ ok: false, error: "Room not found" });

        const player = getPlayerByToken(room, data.token);
        if (!player) return cb({ ok: false, error: "Invalid token" });

        const result = playTiles(room, player.id, data.moves);
        if ("error" in result) return cb({ ok: false, error: result.error });

        await persistRoom(result.room);
        io.to(result.room.code).emit("room:updated", sanitizeRoomForClient(result.room));
        io.to(result.room.code).emit("game:scored", { playerId: player.id, score: result.score });
        cb({ ok: true, room: sanitizeRoomForClient(result.room, data.token), score: result.score });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });

    socket.on("game:pass", async (data: { code: string; token: string }, cb) => {
      try {
        const room = await getOrLoadRoom(data.code);
        if (!room) return cb({ ok: false, error: "Room not found" });

        const player = getPlayerByToken(room, data.token);
        if (!player) return cb({ ok: false, error: "Invalid token" });

        const result = passTurn(room, player.id);
        if ("error" in result) return cb({ ok: false, error: result.error });

        await persistRoom(result);
        io.to(result.code).emit("room:updated", sanitizeRoomForClient(result));
        cb({ ok: true, room: sanitizeRoomForClient(result, data.token) });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });

    socket.on("game:exchange", async (data: { code: string; token: string; tileIds: string[] }, cb) => {
      try {
        const room = await getOrLoadRoom(data.code);
        if (!room) return cb({ ok: false, error: "Room not found" });

        const player = getPlayerByToken(room, data.token);
        if (!player) return cb({ ok: false, error: "Invalid token" });

        const result = exchangeTiles(room, player.id, data.tileIds);
        if ("error" in result) return cb({ ok: false, error: result.error });

        await persistRoom(result);
        io.to(result.code).emit("room:updated", sanitizeRoomForClient(result));
        cb({ ok: true, room: sanitizeRoomForClient(result, data.token) });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });

    socket.on("room:sync", async (data: { code: string; token?: string }, cb) => {
      try {
        const room = await getOrLoadRoom(data.code);
        if (!room) return cb({ ok: false, error: "Room not found" });
        cb({ ok: true, room: sanitizeRoomForClient(room, data.token) });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });
  });
}

export async function bootstrapDb(): Promise<void> {
  await initDb();
}
