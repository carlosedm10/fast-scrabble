import type { GameRoom } from "./types";

export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export function nowIso(date = new Date()): string {
  return date.toISOString();
}

export function touchActivity(room: GameRoom, at = new Date()): GameRoom {
  return { ...room, lastMoveAt: nowIso(at) };
}

export function roomActivityMs(room: GameRoom): number {
  const raw = room.lastMoveAt ?? room.createdAt;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

export function isRoomExpired(room: GameRoom, now = Date.now()): boolean {
  return now - roomActivityMs(room) > ROOM_TTL_MS;
}

export function finalizeExpiredRoom(room: GameRoom): GameRoom {
  return {
    ...room,
    status: "finished",
  };
}

export interface RankingEntry {
  id: string;
  nickname: string;
  score: number;
  place: number;
}

export function ranking(room: GameRoom): RankingEntry[] {
  return [...room.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      place: i + 1,
    }));
}

export function clampMaxPlayers(value: unknown): 2 | 3 | 4 {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 2;
}

export function hydrateRoom(room: GameRoom): GameRoom {
  return {
    ...room,
    maxPlayers: room.maxPlayers ?? 4,
    lastMoveAt: room.lastMoveAt ?? room.createdAt,
  };
}
