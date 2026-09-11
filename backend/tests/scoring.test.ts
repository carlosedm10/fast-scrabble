import { describe, expect, test } from "bun:test";
import { createEmptyBoard } from "../src/game/placement";
import { scoreMove } from "../src/game/scoring";
import type { PlacedTile, MovePlacement } from "../src/game/types";

function place(
  row: number,
  col: number,
  letter: string,
  points: number,
): PlacedTile {
  return {
    row,
    col,
    letter,
    tile: { id: `${row}-${col}`, letter, points, kind: "letter" },
  };
}

describe("scoring", () => {
  test("scores simple horizontal word", () => {
    const board = createEmptyBoard();
    const placements = [
      place(7, 6, "C", 3),
      place(7, 7, "A", 1),
      place(7, 8, "T", 1),
    ];
    for (const p of placements) {
      board[p.row][p.col] = p;
    }
    const moves: MovePlacement[] = placements.map((p) => ({
      row: p.row,
      col: p.col,
      tileId: p.tile.id,
    }));
    const score = scoreMove(board, placements, moves);
    expect(score).toBeGreaterThan(0);
  });

  test("bingo bonus for 7 tiles", () => {
    const board = createEmptyBoard();
    const placements: PlacedTile[] = [];
    const letters = ["S", "C", "R", "A", "B", "B", "L"];
    for (let i = 0; i < 7; i++) {
      const p = place(7, 1 + i, letters[i], 1);
      placements.push(p);
      board[p.row][p.col] = p;
    }
    const moves = placements.map((p) => ({
      row: p.row,
      col: p.col,
      tileId: p.tile.id,
    }));
    const score = scoreMove(board, placements, moves);
    expect(score).toBeGreaterThanOrEqual(50);
  });
});
