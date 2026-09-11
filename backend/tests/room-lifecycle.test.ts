import { describe, expect, test } from "bun:test";
import { createRoom, joinRoom, sanitizeRoomForClient } from "../src/game/room";
import {
  clampMaxPlayers,
  finalizeExpiredRoom,
  isRoomExpired,
  ranking,
  ROOM_TTL_MS,
  touchActivity,
} from "../src/game/expire";

describe("maxPlayers", () => {
  test("clamps to 2, 3 or 4", () => {
    expect(clampMaxPlayers(2)).toBe(2);
    expect(clampMaxPlayers(3)).toBe(3);
    expect(clampMaxPlayers(4)).toBe(4);
    expect(clampMaxPlayers(1)).toBe(2);
    expect(clampMaxPlayers(9)).toBe(2);
  });

  test("rejects a third player when max is 2", () => {
    const room = createRoom("es", "host", 2);
    const second = joinRoom(room, "p2");
    expect("error" in second).toBe(false);
    if ("error" in second) return;
    const third = joinRoom(second.room, "p3");
    expect("error" in third).toBe(true);
    if ("error" in third) expect(third.error).toBe("Room is full");
  });

  test("allows four players when max is 4", () => {
    let room = createRoom("en", "host", 4);
    for (const name of ["p2", "p3", "p4"]) {
      const result = joinRoom(room, name);
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      room = result.room;
    }
    const fifth = joinRoom(room, "p5");
    expect("error" in fifth).toBe(true);
  });

  test("exposes maxPlayers to clients", () => {
    const room = createRoom("es", "host", 3);
    const view = sanitizeRoomForClient(room);
    expect(view.maxPlayers).toBe(3);
  });
});

describe("room expiry", () => {
  test("fresh rooms are not expired", () => {
    const room = createRoom("es", "host", 2);
    expect(isRoomExpired(room)).toBe(false);
  });

  test("rooms older than 24h are expired", () => {
    const room = createRoom("es", "host", 2);
    const stale = touchActivity(room, new Date(Date.now() - ROOM_TTL_MS - 1000));
    expect(isRoomExpired(stale)).toBe(true);
  });

  test("finalizes scores on expiry", () => {
    let room = createRoom("es", "host", 2);
    const joined = joinRoom(room, "p2");
    if ("error" in joined) throw new Error(joined.error);
    room = joined.room;
    room.players[0].score = 42;
    room.players[1].score = 10;
    const finished = finalizeExpiredRoom(room);
    expect(finished.status).toBe("finished");
    expect(ranking(finished).map((r) => r.score)).toEqual([42, 10]);
    expect(ranking(finished)[0]?.nickname).toBe("host");
  });
});
