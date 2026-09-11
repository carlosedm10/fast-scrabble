import { BOARD_SIZE } from "./board-layout";
import { isValidWord } from "./dictionary";
import type { Language, MovePlacement, PlacedTile, Tile } from "./types";

export interface PlacementResult {
  valid: boolean;
  error?: string;
  formedWords: string[];
  placements: PlacedTile[];
}

function getCell(board: (PlacedTile | null)[][] , row: number, col: number): PlacedTile | null {
  if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
  return board[row][col];
}

function cloneBoard(board: (PlacedTile | null)[][]): (PlacedTile | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell, tile: { ...cell.tile } } : null)));
}

function applyPlacements(
  board: (PlacedTile | null)[][],
  moves: MovePlacement[],
  rack: Tile[],
): { board: (PlacedTile | null)[][]; placements: PlacedTile[]; error?: string } {
  const next = cloneBoard(board);
  const placements: PlacedTile[] = [];

  for (const move of moves) {
    const tile = rack.find((t) => t.id === move.tileId);
    if (!tile) return { board, placements, error: "Tile not on rack" };

    const letter =
      tile.kind === "blank"
        ? (move.assignedLetter ?? "").toUpperCase()
        : tile.letter;

    if (!letter) return { board, placements, error: "Blank tile needs assigned letter" };

    if (getCell(next, move.row, move.col)) {
      return { board, placements, error: "Cell already occupied" };
    }

    const placed: PlacedTile = {
      row: move.row,
      col: move.col,
      tile: { ...tile },
      letter,
    };
    next[move.row][move.col] = placed;
    placements.push(placed);
  }

  return { board: next, placements };
}

function isContiguousLine(moves: MovePlacement[]): boolean {
  if (moves.length === 0) return false;
  const rows = moves.map((m) => m.row);
  const cols = moves.map((m) => m.col);
  const sameRow = rows.every((r) => r === rows[0]);
  const sameCol = cols.every((c) => c === cols[0]);
  if (!sameRow && !sameCol) return false;

  if (sameRow) {
    const sorted = [...cols].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== 1) return false;
    }
  } else {
    const sorted = [...rows].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== 1) return false;
    }
  }
  return true;
}

function touchesExisting(board: (PlacedTile | null)[][] , moves: MovePlacement[]): boolean {
  const hasExisting = board.some((row) => row.some((cell) => cell !== null));
  if (!hasExisting) {
    return moves.some((m) => m.row === 7 && m.col === 7);
  }

  for (const move of moves) {
    const neighbors = [
      [move.row - 1, move.col],
      [move.row + 1, move.col],
      [move.row, move.col - 1],
      [move.row, move.col + 1],
    ];
    for (const [r, c] of neighbors) {
      const cell = getCell(board, r, c);
      if (cell) return true;
    }
  }
  return false;
}

function readWord(
  board: (PlacedTile | null)[][],
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number,
): string {
  let letters = "";
  let r = startRow;
  let c = startCol;
  while (getCell(board, r, c)) {
    const cell = getCell(board, r, c)!;
    letters += cell.letter;
    r += dRow;
    c += dCol;
  }
  return letters;
}

function collectFormedWords(
  board: (PlacedTile | null)[][],
  moves: MovePlacement[],
): string[] {
  const words = new Set<string>();

  for (const move of moves) {
    const horizontal = readWord(board, move.row, 0, 0, 1);
    const vertical = readWord(board, 0, move.col, 1, 0);

    const hWord = extractWordAt(board, move.row, move.col, 0, 1);
    const vWord = extractWordAt(board, move.row, move.col, 1, 0);

    if (hWord.length > 1) words.add(hWord);
    if (vWord.length > 1) words.add(vWord);
    if (hWord.length === 1 && vWord.length === 1) words.add(hWord);
  }

  return [...words];
}

function extractWordAt(
  board: (PlacedTile | null)[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): string {
  let r = row;
  let c = col;
  while (getCell(board, r - dRow, c - dCol)) {
    r -= dRow;
    c -= dCol;
  }
  return readWord(board, r, c, dRow, dCol);
}

export function validatePlacement(
  board: (PlacedTile | null)[][],
  moves: MovePlacement[],
  rack: Tile[],
  language: Language,
  isFirstMove: boolean,
): PlacementResult {
  if (moves.length === 0) {
    return { valid: false, error: "No tiles placed", formedWords: [], placements: [] };
  }

  if (!isContiguousLine(moves)) {
    return { valid: false, error: "Tiles must form a straight line", formedWords: [], placements: [] };
  }

  const { board: nextBoard, placements, error } = applyPlacements(board, moves, rack);
  if (error) {
    return { valid: false, error, formedWords: [], placements: [] };
  }

  if (!touchesExisting(board, moves)) {
    return { valid: false, error: "Must connect to existing tiles or center star", formedWords: [], placements: [] };
  }

  if (isFirstMove && !moves.some((m) => m.row === 7 && m.col === 7)) {
    return { valid: false, error: "First word must cover center star", formedWords: [], placements: [] };
  }

  const formedWords = collectFormedWords(nextBoard, moves);
  for (const word of formedWords) {
    if (!isValidWord(language, word)) {
      return { valid: false, error: `Invalid word: ${word}`, formedWords, placements };
    }
  }

  return { valid: true, formedWords, placements };
}

export function createEmptyBoard(): (PlacedTile | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}
