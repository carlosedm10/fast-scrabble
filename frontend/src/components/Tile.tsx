import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";

export interface TileData {
  id: string;
  letter: string;
  points: number;
  kind: "letter" | "blank";
  assigned?: string;
}

interface TileProps {
  tile: TileData;
  selected?: boolean;
  onClick?: () => void;
  onPointerDown?: (event: PointerEvent) => void;
  size?: "sm" | "md" | "lg";
  displayLetter?: string;
  dragging?: boolean;
  popping?: boolean;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Tile({
  tile,
  selected,
  onClick,
  onPointerDown,
  size = "md",
  displayLetter,
  dragging,
  popping,
}: TileProps) {
  const letter = displayLetter ?? (tile.kind === "blank" ? (tile.assigned ?? "") : tile.letter);
  const showPoints = tile.kind !== "blank" || tile.assigned;

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={cn(
        "relative flex items-center justify-center rounded border-2 font-bold transition-all select-none touch-none",
        "bg-amber-100 text-brand-dark border-amber-300",
        sizes[size],
        selected && "ring-2 ring-brand-cyan scale-105",
        (onClick || onPointerDown) && "cursor-grab active:cursor-grabbing hover:scale-105",
        tile.kind === "blank" && !letter && "bg-amber-50 border-dashed",
        dragging && "opacity-20",
        popping && "tile-pop-in",
      )}
    >
      <span className="uppercase">{letter || "·"}</span>
      {showPoints && tile.points > 0 && (
        <span className="absolute bottom-0 right-0.5 text-[8px] leading-none opacity-70">
          {tile.points}
        </span>
      )}
    </button>
  );
}
