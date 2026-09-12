import { describe, expect, test } from "bun:test";
import { createRoom, joinRoom, playTiles, previewPlay, startGame } from "../src/game/room";
import type { Tile } from "../src/game/types";

function letter(id: string, ch: string, points = 1): Tile {
  return { id, letter: ch, points, kind: "letter" };
}

function twoPlayerStarted() {
  let room = createRoom("en", "Host", 2);
  const host = room.players[0];
  const joined = joinRoom(room, "Guest");
  if ("error" in joined) throw new Error(joined.error);
  room = joined.room;
  const started = startGame(room, host.id);
  if ("error" in started) throw new Error(started.error);
  return { room: started, host: started.players[0], guest: started.players[1] };
}

describe("previewPlay", () => {
  test("scores a trial word on someone else's turn", () => {
    const { room, host, guest } = twoPlayerStarted();
    expect(room.currentPlayerIndex).toBe(0);
    guest.rack = [letter("c", "C", 3), letter("a", "A"), letter("t", "T")];

    const preview = previewPlay(room, guest.id, [
      { row: 7, col: 6, tileId: "c" },
      { row: 7, col: 7, tileId: "a" },
      { row: 7, col: 8, tileId: "t" },
    ]);
    expect("error" in preview).toBe(false);
    if ("error" in preview) return;
    expect(preview.score).toBeGreaterThan(0);
    expect(preview.words).toContain("CAT");
    expect(room.board[7][7]).toBeNull();

    const play = playTiles(room, guest.id, [
      { row: 7, col: 6, tileId: "c" },
      { row: 7, col: 7, tileId: "a" },
      { row: 7, col: 8, tileId: "t" },
    ]);
    expect("error" in play).toBe(true);
    if ("error" in play) expect(play.error).toBe("Not your turn");
  });

  test("still scores on your own turn", () => {
    const { room, host } = twoPlayerStarted();
    host.rack = [letter("c", "C", 3), letter("a", "A"), letter("t", "T")];
    const preview = previewPlay(room, host.id, [
      { row: 7, col: 6, tileId: "c" },
      { row: 7, col: 7, tileId: "a" },
      { row: 7, col: 8, tileId: "t" },
    ]);
    expect("error" in preview).toBe(false);
    if ("error" in preview) return;
    expect(preview.words).toContain("CAT");
  });
});
