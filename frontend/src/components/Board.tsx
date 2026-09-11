import { cn } from "@/lib/utils";
import { Tile, type TileData } from "./Tile";

const BOARD_SIZE = 15;

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
}

export function Board({ board, pendingPlacements, rack, onCellTap }: BoardProps) {
  const getPending = (row: number, col: number) =>
    pendingPlacements.find((p) => p.row === row && p.col === col);

  const getRackTile = (tileId: string) => rack.find((t) => t.id === tileId);

  return (
    <div className="overflow-auto rounded-lg border border-brand-cyan/20 p-2 bg-brand-surface">
      <div
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          width: "min(100%, 600px)",
        }}
      >
        {LAYOUT.map((row, r) =>
          row.map((cell, c) => {
            const placed = board?.[r]?.[c];
            const pending = getPending(r, c);
            const mult = cell === "n" ? null : MULTIPLIERS[cell];

            if (placed) {
              return (
                <div key={`${r}-${c}`} className="aspect-square">
                  <Tile
                    tile={{
                      id: `${r}-${c}`,
                      letter: placed.letter,
                      points: placed.tile.points,
                      kind: placed.tile.kind as "letter" | "blank",
                    }}
                    size="sm"
                    displayLetter={placed.letter}
                  />
                </div>
              );
            }

            if (pending) {
              const rackTile = getRackTile(pending.tileId);
              if (rackTile) {
                return (
                  <div key={`${r}-${c}`} className="aspect-square">
                    <Tile
                      tile={rackTile as TileData}
                      size="sm"
                      displayLetter={pending.assignedLetter ?? rackTile.letter}
                    />
                  </div>
                );
              }
            }

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => onCellTap(r, c)}
                className={cn(
                  "aspect-square rounded text-[7px] font-semibold flex items-center justify-center",
                  "border border-brand-cyan/10 hover:border-brand-cyan/40 transition-colors",
                  cell === "tw" && "bg-red-900/40 text-red-300",
                  cell === "dw" && "bg-pink-900/30 text-pink-300",
                  cell === "tl" && "bg-blue-900/40 text-blue-300",
                  cell === "dl" && "bg-cyan-900/30 text-cyan-300",
                  cell === "star" && "bg-brand-cyan/20 text-brand-cyan-light",
                  cell === "n" && "bg-brand-dark/50 text-white/20",
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
