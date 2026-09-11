import { describe, expect, test } from "bun:test";
import { createEmptyBoard, validatePlacement } from "../src/game/placement";
import type { Tile } from "../src/game/types";

function makeTile(letter: string, id?: string): Tile {
  const points: Record<string, number> = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
    N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
  };
  return { id: id ?? letter, letter, points: points[letter] ?? 1, kind: "letter" };
}

describe("placement validation", () => {
  test("first word must cover center star", () => {
    const board = createEmptyBoard();
    const rack = [makeTile("C"), makeTile("A"), makeTile("T")];
    const result = validatePlacement(
      board,
      [
        { row: 7, col: 6, tileId: "C" },
        { row: 7, col: 7, tileId: "A" },
        { row: 7, col: 8, tileId: "T" },
      ],
      rack,
      "en",
      true,
    );
    expect(result.valid).toBe(true);
    expect(result.formedWords).toContain("CAT");
  });

  test("rejects disconnected placement", () => {
    const board = createEmptyBoard();
    const rack = [makeTile("D"), makeTile("O"), makeTile("G")];
    const result = validatePlacement(
      board,
      [
        { row: 0, col: 0, tileId: "D" },
        { row: 0, col: 1, tileId: "O" },
        { row: 0, col: 2, tileId: "G" },
      ],
      rack,
      "en",
      true,
    );
    expect(result.valid).toBe(false);
  });

  test("rejects non-contiguous line", () => {
    const board = createEmptyBoard();
    const rack = [makeTile("C"), makeTile("A"), makeTile("T")];
    const result = validatePlacement(
      board,
      [
        { row: 7, col: 6, tileId: "C" },
        { row: 7, col: 8, tileId: "T" },
      ],
      rack,
      "en",
      true,
    );
    expect(result.valid).toBe(false);
  });
});
