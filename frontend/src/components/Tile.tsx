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
  size?: "fill" | "sm" | "md" | "lg" | "rack";
  displayLetter?: string;
  dragging?: boolean;
  popping?: boolean;
}

const sizes = {
  fill: "tile-fill h-full w-full min-h-0 min-w-0",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base sm:h-14 sm:w-14",
  rack: "h-11 w-11 text-sm sm:h-14 sm:w-14 sm:text-base",
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
        "relative flex items-center justify-center font-bold select-none touch-none",
        "bg-linear-to-br from-[#fff8dc] via-[#f5e6b8] to-[#d9bd78] text-[#11131a] border-[#c99f4e]",
        size !== "fill" && "rounded-md border-2 shadow-[0_3px_0_#8e672f,0_7px_14px_rgba(0,0,0,0.28)] transition-transform",
        sizes[size],
        selected && "ring-2 ring-brand-cyan-light ring-offset-2 ring-offset-[#0a1020]",
        size !== "fill" && selected && "-translate-y-1 scale-105",
        (onClick || onPointerDown) && size !== "fill" && "cursor-grab active:cursor-grabbing hover:scale-105",
        (onClick || onPointerDown) && size === "fill" && "cursor-grab active:cursor-grabbing",
        tile.kind === "blank" && !letter && "from-[#fffcef] to-[#ead9aa] border-dashed",
        dragging && "opacity-20",
        popping && "tile-pop-in",
      )}
    >
      <span className={cn("uppercase", size === "fill" && "tile-fill-letter")}>{letter || "·"}</span>
      {showPoints && tile.points > 0 && (
        <span
          className={cn(
            size === "fill" ? "tile-fill-points" : "absolute bottom-0 right-0.5 text-[8px] leading-none opacity-70",
          )}
        >
          {tile.points}
        </span>
      )}
    </button>
  );
}
