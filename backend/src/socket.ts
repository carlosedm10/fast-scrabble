import type { Server, Socket } from "socket.io";
import { deleteRoom, initDb, listRoomsUpdatedBefore, loadRoom, saveRoom } from "./db";
import {
  finalizeExpiredRoom,
  hydrateRoom,
  isRoomExpired,
  ranking,
  ROOM_TTL_MS,
} from "./game/expire";
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
let ioRef: Server | null = null;

function remember(room: GameRoom): GameRoom {
  const hydrated = hydrateRoom(room);
  rooms.set(hydrated.code, hydrated);
  return hydrated;
}

async function expireRoomNow(room: GameRoom): Promise<GameRoom> {
  const finished = finalizeExpiredRoom(hydrateRoom(room));
  const board = ranking(finished);
  ioRef?.to(finished.code).emit("room:updated", sanitizeRoomForClient(finished));
  ioRef?.to(finished.code).emit("game:expired", {
    ranking: board,
    room: sanitizeRoomForClient(finished),
  });
  rooms.delete(finished.code);
  await deleteRoom(finished.code);
  return finished;
}

type LoadResult =
  | { status: "ok"; room: GameRoom }
  | { status: "expired" }
  | { status: "missing" };

async function getOrLoadRoom(code: string): Promise<LoadResult> {
  const upper = code.toUpperCase();
  let room = rooms.get(upper) ?? (await loadRoom(upper));
  if (!room) return { status: "missing" };
  room = remember(room);
  if (isRoomExpired(room)) {
    await expireRoomNow(room);
    return { status: "expired" };
  }
  return { status: "ok", room };
}

async function persistRoom(room: GameRoom): Promise<void> {
  const hydrated = remember(room);
  await saveRoom(hydrated);
}

function missingError(result: Exclude<LoadResult, { status: "ok" }>): string {
  return result.status === "expired" ? "expired" : "Room not found";
}

export function registerSocketHandlers(io: Server): void {
  ioRef = io;
  io.on("connection", (socket: Socket) => {
    socket.on(
      "room:create",
      async (data: { nickname: string; language: Language; maxPlayers?: number }, cb) => {
        try {
          const room = createRoom(data.language, data.nickname, data.maxPlayers);
          await persistRoom(room);
          const player = room.players[0];
          socket.join(room.code);
          cb({ ok: true, room: sanitizeRoomForClient(room, player.token), token: player.token });
          io.to(room.code).emit("room:updated", sanitizeRoomForClient(room));
        } catch (err) {
          cb({ ok: false, error: String(err) });
        }
      },
    );

    socket.on("room:join", async (data: { code: string; nickname: string }, cb) => {
      try {
        const loaded = await getOrLoadRoom(data.code);
        if (loaded.status !== "ok") return cb({ ok: false, error: missingError(loaded) });
        const room = loaded.room;

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
        const loaded = await getOrLoadRoom(data.code);
        if (loaded.status !== "ok") return cb({ ok: false, error: missingError(loaded) });
        const room = loaded.room;

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
        const loaded = await getOrLoadRoom(data.code);
        if (loaded.status !== "ok") return cb({ ok: false, error: missingError(loaded) });
        const room = loaded.room;

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
        const loaded = await getOrLoadRoom(data.code);
        if (loaded.status !== "ok") return cb({ ok: false, error: missingError(loaded) });
        const room = loaded.room;

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
        const loaded = await getOrLoadRoom(data.code);
        if (loaded.status !== "ok") return cb({ ok: false, error: missingError(loaded) });
        const room = loaded.room;

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
        const loaded = await getOrLoadRoom(data.code);
        if (loaded.status !== "ok") return cb({ ok: false, error: missingError(loaded) });
        cb({ ok: true, room: sanitizeRoomForClient(loaded.room, data.token) });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });
  });
}

export async function sweepExpiredRooms(): Promise<number> {
  const cutoff = new Date(Date.now() - ROOM_TTL_MS);
  const fromDb = await listRoomsUpdatedBefore(cutoff);
  const seen = new Set<string>();
  let expired = 0;

  const candidates = [...fromDb, ...rooms.values()];
  for (const raw of candidates) {
    const room = hydrateRoom(raw);
    if (seen.has(room.code)) continue;
    seen.add(room.code);
    if (!isRoomExpired(room)) continue;
    await expireRoomNow(room);
    expired += 1;
  }
  return expired;
}

export function startExpiryJob(io: Server): void {
  ioRef = io;
  const tick = () => {
    void sweepExpiredRooms().catch((err) => {
      console.error("expiry sweep failed", err);
    });
  };
  setInterval(tick, 5 * 60 * 1000);
  tick();
}

export async function bootstrapDb(): Promise<void> {
  await initDb();
}
