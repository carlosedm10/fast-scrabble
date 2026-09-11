import { describe, expect, test } from "bun:test";
import { createEmptyBoard, validatePlacement } from "../src/game/placement";
import { isWildcardForbidden } from "../src/game/tiles";
import { playTiles, createRoom, startGame } from "../src/game/room";
import type { Tile } from "../src/game/types";

function blankTile(id = "blank1"): Tile {
  return { id, letter: "", points: 0, kind: "blank" };
}

describe("wildcard rules", () => {
  test("Spanish wildcards cannot be K or W", () => {
    expect(isWildcardForbidden("es", "K")).toBe(true);
    expect(isWildcardForbidden("es", "W")).toBe(true);
    expect(isWildcardForbidden("es", "A")).toBe(false);
    expect(isWildcardForbidden("es", "Ñ")).toBe(false);
  });

  test("English wildcards can be any A-Z", () => {
    expect(isWildcardForbidden("en", "K")).toBe(false);
    expect(isWildcardForbidden("en", "W")).toBe(false);
    expect(isWildcardForbidden("en", "Z")).toBe(false);
  });

  test("blank tile placement with assigned letter", () => {
    const board = createEmptyBoard();
    const rack = [blankTile(), makeTile("A", "a1"), makeTile("T", "t1")];
    const result = validatePlacement(
      board,
      [
        { row: 7, col: 6, tileId: "blank1", assignedLetter: "C" },
        { row: 7, col: 7, tileId: "a1" },
        { row: 7, col: 8, tileId: "t1" },
      ],
      rack,
      "en",
      true,
    );
    expect(result.valid).toBe(true);
  });

  test("playTiles rejects K wildcard in Spanish", () => {
    let room = createRoom("es", "Host");
    const host = room.players[0];
    room = {
      ...room,
      players: [
        host,
        { id: "p2", nickname: "Guest", token: "t2", rack: [], score: 0 },
      ],
    };
    const started = startGame(room, host.id);
    if ("error" in started) throw new Error(started.error);
    room = started;

    const blank = blankTile("b1");
    room.players[0].rack = [blank, { id: "a1", letter: "A", points: 1, kind: "letter" }];

    const result = playTiles(room, host.id, [
      { row: 7, col: 7, tileId: "b1", assignedLetter: "K" },
      { row: 7, col: 8, tileId: "a1" },
    ]);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("K");
    }
  });
});

function makeTile(letter: string, id?: string): Tile {
  const points: Record<string, number> = { A: 1, T: 1, C: 3 };
  return { id: id ?? letter, letter, points: points[letter] ?? 1, kind: "letter" };
}
