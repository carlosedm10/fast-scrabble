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
                  "scrabble-cell flex items-center justify-center font-semibold leading-none",
                  "border border-brand-cyan/15 text-[length:clamp(6px,1.8vw,10px)]",
                  cell === "tw" && "bg-red-900/40 text-red-300",
                  cell === "dw" && "bg-pink-900/30 text-pink-300",
                  cell === "tl" && "bg-blue-900/40 text-blue-300",
                  cell === "dl" && "bg-cyan-900/30 text-cyan-300",
                  cell === "star" && "bg-brand-cyan/20 text-brand-cyan-light",
                  cell === "n" && "bg-brand-dark/80 text-white/25",
                  hovered && "ring-2 ring-inset ring-brand-cyan-light bg-brand-cyan/30",
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
