import { createBoardLayout, BOARD_SIZE } from "./board-layout";
import type { MovePlacement, PlacedTile } from "./types";

const layout = createBoardLayout();

function getMultiplier(row: number, col: number): "normal" | "dl" | "tl" | "dw" | "tw" | "star" {
  return layout[row][col].multiplier;
}

function extractWordAt(
  board: (PlacedTile | null)[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): { word: string; cells: { row: number; col: number }[] } {
  let r = row;
  let c = col;
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && board[r][c]) {
    r -= dRow;
    c -= dCol;
  }
  r += dRow;
  c += dCol;

  let word = "";
  const cells: { row: number; col: number }[] = [];
  while (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && board[r][c]) {
    const cell = board[r][c]!;
    word += cell.letter;
    cells.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }
  return { word, cells };
}

function letterPoints(cell: PlacedTile): number {
  if (cell.tile.kind === "blank") return 0;
  return cell.tile.points;
}

export function scoreMove(
  board: (PlacedTile | null)[][],
  newPlacements: PlacedTile[],
  moves: MovePlacement[],
): number {
  const newCells = new Set(newPlacements.map((p) => `${p.row},${p.col}`));
  let total = 0;
  const scoredWords = new Set<string>();

  for (const move of moves) {
    for (const [dRow, dCol] of [[0, 1], [1, 0]] as const) {
      const { word, cells } = extractWordAt(board, move.row, move.col, dRow, dCol);
      if (word.length < 2 || scoredWords.has(word)) continue;
      scoredWords.add(word);

      let wordScore = 0;
      let wordMultiplier = 1;

      for (const { row, col } of cells) {
        const cell = board[row][col]!;
        let letterScore = letterPoints(cell);
        const mult = getMultiplier(row, col);
        const isNew = newCells.has(`${row},${col}`);

        if (isNew) {
          if (mult === "dl") letterScore *= 2;
          if (mult === "tl") letterScore *= 3;
          if (mult === "dw" || mult === "star") wordMultiplier *= 2;
          if (mult === "tw") wordMultiplier *= 3;
        }

        wordScore += letterScore;
      }

      total += wordScore * wordMultiplier;
    }
  }

  if (newPlacements.length === 7) {
    total += 50;
  }

  return total;
}
