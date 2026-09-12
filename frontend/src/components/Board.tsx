import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { Tile, type TileData } from "./Tile";

const MULTIPLIERS: Record<string, string> = {
  tw: "TW",
  dw: "DW",
  tl: "TL",
  dl: "DL",
  star: "★",
};

const LAYOUT = [
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

interface PlacedCell {
  row: number;
  col: number;
  letter: string;
  tile: { points: number; kind: string };
}

interface PendingPlacement {
  row: number;
  col: number;
  tileId: string;
  assignedLetter?: string;
}

interface BoardProps {
  board: (PlacedCell | null)[][] | null;
  pendingPlacements: PendingPlacement[];
  rack: { id: string; letter: string; points: number; kind: string }[];
  onCellTap: (row: number, col: number) => void;
  onPendingPointerDown?: (tileId: string, event: PointerEvent) => void;
  draggingTileId?: string | null;
  hoverCell?: { row: number; col: number } | null;
}

export function Board({
  board,
  pendingPlacements,
  rack,
  onCellTap,
  onPendingPointerDown,
  draggingTileId,
  hoverCell,
}: BoardProps) {
  const getPending = (row: number, col: number) =>
    pendingPlacements.find((p) => p.row === row && p.col === col);

  const getRackTile = (tileId: string) => rack.find((t) => t.id === tileId);

  return (
    <div className="scrabble-board-frame">
      <div className="scrabble-board">
        {LAYOUT.map((row, r) =>
          row.map((cell, c) => {
            const placed = board?.[r]?.[c];
            const pending = getPending(r, c);
            const mult = cell === "n" ? null : MULTIPLIERS[cell];
            const hovered = hoverCell?.row === r && hoverCell?.col === c;

            if (placed) {
              return (
                <div key={`${r}-${c}`} className="scrabble-cell" data-board-cell data-row={r} data-col={c}>
                  <Tile
                    tile={{
                      id: `${r}-${c}`,
                      letter: placed.letter,
                      points: placed.tile.points,
                      kind: placed.tile.kind as "letter" | "blank",
                    }}
                    size="fill"
                    displayLetter={placed.letter}
                  />
                </div>
              );
            }

            if (pending) {
              const rackTile = getRackTile(pending.tileId);
              if (rackTile) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className="scrabble-cell"
                    data-board-cell
                    data-row={r}
                    data-col={c}
                  >
                    <Tile
                      tile={rackTile as TileData}
                      size="fill"
                      displayLetter={pending.assignedLetter ?? rackTile.letter}
                      dragging={draggingTileId === pending.tileId}
                      popping={draggingTileId !== pending.tileId}
                      onPointerDown={(event) => onPendingPointerDown?.(pending.tileId, event)}
                    />
                  </div>
                );
              }
            }

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-board-cell
                data-row={r}
                data-col={c}
                onClick={() => onCellTap(r, c)}
                className={cn(
                  "scrabble-cell scrabble-cell-mult flex items-center justify-center font-semibold",
                  "border border-white/8 transition-colors",
                  cell === "tw" && "bg-[#7d1524] text-red-100",
                  cell === "dw" && "bg-[#5d2346] text-pink-100",
                  cell === "tl" && "bg-[#124978] text-blue-100",
                  cell === "dl" && "bg-[#0d5968] text-cyan-100",
                  cell === "star" && "bg-brand-cyan/35 text-white",
                  cell === "n" && "bg-[#111b2c] text-white/30 hover:bg-[#16263d]",
                  hovered && "is-drop-target",
                )}
              >
                {mult}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
