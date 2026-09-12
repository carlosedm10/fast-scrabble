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

function occupiesStraightFilledLine(
  board: (PlacedTile | null)[][],
  moves: MovePlacement[],
): boolean {
  if (moves.length === 0) return false;
  if (moves.length === 1) return true;

  const sameRow = moves.every((m) => m.row === moves[0].row);
  const sameCol = moves.every((m) => m.col === moves[0].col);
  if (!sameRow && !sameCol) return false;

  if (sameRow) {
    const row = moves[0].row;
    const cols = moves.map((m) => m.col);
    const min = Math.min(...cols);
    const max = Math.max(...cols);
    for (let c = min; c <= max; c++) {
      if (!getCell(board, row, c)) return false;
    }
    return true;
  }

  const col = moves[0].col;
  const rows = moves.map((m) => m.row);
  const min = Math.min(...rows);
  const max = Math.max(...rows);
  for (let r = min; r <= max; r++) {
    if (!getCell(board, r, col)) return false;
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

function readLetterUnits(
  board: (PlacedTile | null)[][],
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number,
): string[] {
  const units: string[] = [];
  let r = startRow;
  let c = startCol;
  while (getCell(board, r, c)) {
    units.push(getCell(board, r, c)!.letter);
    r += dRow;
    c += dCol;
  }
  return units;
}

function extractLetterUnitsAt(
  board: (PlacedTile | null)[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): string[] {
  let r = row;
  let c = col;
  while (getCell(board, r - dRow, c - dCol)) {
    r -= dRow;
    c -= dCol;
  }
  return readLetterUnits(board, r, c, dRow, dCol);
}

function collectFormedWords(
  board: (PlacedTile | null)[][],
  moves: MovePlacement[],
  language: Language,
): { words: string[]; invalid?: string } {
  const seen = new Set<string>();
  const words: string[] = [];

  for (const move of moves) {
    const hUnits = extractLetterUnitsAt(board, move.row, move.col, 0, 1);
    const vUnits = extractLetterUnitsAt(board, move.row, move.col, 1, 0);

    const candidates: string[][] = [];
    if (hUnits.length > 1) candidates.push(hUnits);
    if (vUnits.length > 1) candidates.push(vUnits);
    if (hUnits.length === 1 && vUnits.length === 1) candidates.push(hUnits);

    for (const units of candidates) {
      const word = units.join("");
      if (seen.has(word)) continue;
      seen.add(word);

      if (!isValidWord(language, word)) {
        return { words: [...words, word], invalid: word };
      }
      words.push(word);
    }
  }

  return { words };
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

  const { board: nextBoard, placements, error } = applyPlacements(board, moves, rack);
  if (error) {
    return { valid: false, error, formedWords: [], placements: [] };
  }

  if (!occupiesStraightFilledLine(nextBoard, moves)) {
    return { valid: false, error: "Tiles must form a straight line", formedWords: [], placements: [] };
  }

  if (!touchesExisting(board, moves)) {
    return { valid: false, error: "Must connect to existing tiles or center star", formedWords: [], placements: [] };
  }

  if (isFirstMove && !moves.some((m) => m.row === 7 && m.col === 7)) {
    return { valid: false, error: "First word must cover center star", formedWords: [], placements: [] };
  }

  const { words: formedWords, invalid } = collectFormedWords(nextBoard, moves, language);
  if (invalid) {
    return {
      valid: false,
      error: `Invalid word: ${invalid}`,
      formedWords,
      placements,
    };
  }

  return { valid: true, formedWords, placements };
}

export function createEmptyBoard(): (PlacedTile | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}
