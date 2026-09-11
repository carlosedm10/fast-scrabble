import { describe, expect, test } from "bun:test";
import { canonicalWord, createEmptyBoard, validatePlacement } from "../src/game/placement";
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

  test("accepts Spanish HORNO top to bottom covering the star", () => {
    const board = createEmptyBoard();
    const rack = [
      makeTile("H", "h"),
      makeTile("O", "o1"),
      makeTile("R", "r"),
      makeTile("N", "n"),
      makeTile("O", "o2"),
    ];
    const result = validatePlacement(
      board,
      [
        { row: 5, col: 7, tileId: "h" },
        { row: 6, col: 7, tileId: "o1" },
        { row: 7, col: 7, tileId: "r" },
        { row: 8, col: 7, tileId: "n" },
        { row: 9, col: 7, tileId: "o2" },
      ],
      rack,
      "es",
      true,
    );
    expect(result.valid).toBe(true);
    expect(result.formedWords).toContain("HORNO");
  });

  test("accepts Spanish HORNO when tiles read ONROH top to bottom", () => {
    const board = createEmptyBoard();
    const rack = [
      makeTile("O", "o1"),
      makeTile("N", "n"),
      makeTile("R", "r"),
      makeTile("O", "o2"),
      makeTile("H", "h"),
    ];
    const result = validatePlacement(
      board,
      [
        { row: 5, col: 7, tileId: "o1" },
        { row: 6, col: 7, tileId: "n" },
        { row: 7, col: 7, tileId: "r" },
        { row: 8, col: 7, tileId: "o2" },
        { row: 9, col: 7, tileId: "h" },
      ],
      rack,
      "es",
      true,
    );
    expect(result.valid).toBe(true);
    expect(result.formedWords).toContain("HORNO");
    expect(result.formedWords).not.toContain("ONROH");
  });

  test("rejects a line whose reverse is also not in the lexicon", () => {
    const board = createEmptyBoard();
    const rack = [makeTile("Q", "q1"), makeTile("X", "x"), makeTile("Q", "q2")];
    const result = validatePlacement(
      board,
      [
        { row: 7, col: 6, tileId: "q1" },
        { row: 7, col: 7, tileId: "x" },
        { row: 7, col: 8, tileId: "q2" },
      ],
      rack,
      "es",
      true,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid word: QXQ");
  });

  test("reverses CH/LL/RR as tile units, not characters", () => {
    expect(canonicalWord("es", ["CH", "I", "C", "O"])).toBe("CHICO");
    expect(canonicalWord("es", ["O", "C", "I", "CH"])).toBe("CHICO");

    const board = createEmptyBoard();
    const rack: Tile[] = [
      { id: "o", letter: "O", points: 1, kind: "letter" },
      { id: "c", letter: "C", points: 3, kind: "letter" },
      { id: "i", letter: "I", points: 1, kind: "letter" },
      { id: "ch", letter: "CH", points: 5, kind: "letter" },
    ];
    const result = validatePlacement(
      board,
      [
        { row: 7, col: 5, tileId: "o" },
        { row: 7, col: 6, tileId: "c" },
        { row: 7, col: 7, tileId: "i" },
        { row: 7, col: 8, tileId: "ch" },
      ],
      rack,
      "es",
      true,
    );
    expect(result.valid).toBe(true);
    expect(result.formedWords).toContain("CHICO");
  });
});
