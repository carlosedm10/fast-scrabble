import { describe, expect, test } from "bun:test";
import { createTileBag } from "../src/game/tiles";
import { validatePlacement, createEmptyBoard } from "../src/game/placement";
import type { Tile } from "../src/game/types";

describe("Spanish digraphs", () => {
  test("Spanish bag contains CH, LL, RR as single tiles", () => {
    const bag = createTileBag("es");
    const letters = bag.map((t) => t.letter);
    expect(letters).toContain("CH");
    expect(letters).toContain("LL");
    expect(letters).toContain("RR");
    expect(letters).toContain("Ñ");
    expect(letters.filter((l) => l === "K")).toHaveLength(0);
    expect(letters.filter((l) => l === "W")).toHaveLength(0);
    expect(bag.filter((t) => t.kind === "blank")).toHaveLength(2);
    expect(bag.length).toBe(100);
  });

  test("Spanish bag has exactly 100 tiles", () => {
    const bag = createTileBag("es");
    expect(bag.length).toBe(100);
  });

  test("English bag has K and W", () => {
    const bag = createTileBag("en");
    const letters = bag.map((t) => t.letter);
    expect(letters).toContain("K");
    expect(letters).toContain("W");
    expect(bag.length).toBe(100);
  });

  test("CH tile can be placed in Spanish word", () => {
    const board = createEmptyBoard();
    const rack: Tile[] = [
      { id: "ch", letter: "CH", points: 5, kind: "letter" },
      { id: "i", letter: "I", points: 1, kind: "letter" },
      { id: "c", letter: "C", points: 3, kind: "letter" },
      { id: "o", letter: "O", points: 1, kind: "letter" },
    ];
    const result = validatePlacement(
      board,
      [
        { row: 7, col: 5, tileId: "ch" },
        { row: 7, col: 6, tileId: "i" },
        { row: 7, col: 7, tileId: "c" },
        { row: 7, col: 8, tileId: "o" },
      ],
      rack,
      "es",
      true,
    );
    expect(result.valid).toBe(true);
  });
});
