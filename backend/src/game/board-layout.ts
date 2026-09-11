import type { BoardCell } from "./types";

const STANDARD_LAYOUT: string[][] = [
  ["tw", "n", "n", "dl", "n", "n", "n", "tw", "n", "n", "n", "dl", "n", "n", "tw"],
  ["n", "dw", "n", "n", "n", "tl", "n", "n", "n", "tl", "n", "n", "n", "dw", "n"],
  ["n", "n", "dw", "n", "n", "n", "dl", "n", "dl", "n", "n", "n", "dw", "n", "n"],
  ["dl", "n", "n", "dw", "n", "n", "n", "dl", "n", "n", "n", "dw", "n", "n", "dl"],
  ["n", "n", "n", "n", "dw", "n", "n", "n", "n", "n", "dw", "n", "n", "n", "n"],
  ["n", "tl", "n", "n", "n", "tl", "n", "n", "n", "tl", "n", "n", "n", "tl", "n"],
  ["n", "n", "dl", "n", "n", "n", "dl", "n", "dl", "n", "n", "n", "dl", "n", "n"],
  ["tw", "n", "n", "dl", "n", "n", "n", "star", "n", "n", "n", "dl", "n", "n", "tw"],
  ["n", "n", "dl", "n", "n", "n", "dl", "n", "dl", "n", "n", "n", "dl", "n", "n"],
  ["n", "tl", "n", "n", "n", "tl", "n", "n", "n", "tl", "n", "n", "n", "tl", "n"],
  ["n", "n", "n", "n", "dw", "n", "n", "n", "n", "n", "dw", "n", "n", "n", "n"],
  ["dl", "n", "n", "dw", "n", "n", "n", "dl", "n", "n", "n", "dw", "n", "n", "dl"],
  ["n", "n", "dw", "n", "n", "n", "dl", "n", "dl", "n", "n", "n", "dw", "n", "n"],
  ["n", "dw", "n", "n", "n", "tl", "n", "n", "n", "tl", "n", "n", "n", "dw", "n"],
  ["tw", "n", "n", "dl", "n", "n", "n", "tw", "n", "n", "n", "dl", "n", "n", "tw"],
];

const MAP: Record<string, BoardCell["multiplier"]> = {
  n: "normal",
  dl: "dl",
  tl: "tl",
  dw: "dw",
  tw: "tw",
  star: "star",
};

export const BOARD_SIZE = 15;

export function createBoardLayout(): BoardCell[][] {
  return STANDARD_LAYOUT.map((row) =>
    row.map((cell) => ({ multiplier: MAP[cell] ?? "normal" })),
  );
}
