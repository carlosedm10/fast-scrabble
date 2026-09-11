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
  size?: "fill" | "sm" | "md" | "lg";
  displayLetter?: string;
  dragging?: boolean;
  popping?: boolean;
}

const sizes = {
  fill: "h-full w-full min-h-0 min-w-0 rounded-[2px] sm:rounded border text-[length:clamp(8px,2.6vw,15px)]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base sm:h-14 sm:w-14",
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
        "bg-amber-100 text-brand-dark border-amber-300",
        size !== "fill" && "rounded border-2 transition-transform",
        size === "fill" && "overflow-hidden",
        sizes[size],
        selected && "ring-2 ring-brand-cyan",
        size !== "fill" && selected && "scale-105",
        (onClick || onPointerDown) && size !== "fill" && "cursor-grab active:cursor-grabbing hover:scale-105",
        (onClick || onPointerDown) && size === "fill" && "cursor-grab active:cursor-grabbing",
        tile.kind === "blank" && !letter && "bg-amber-50 border-dashed",
        dragging && "opacity-20",
        popping && "tile-pop-in",
      )}
    >
      <span className="uppercase">{letter || "·"}</span>
      {showPoints && tile.points > 0 && (
        <span
          className={cn(
            "absolute leading-none opacity-70",
            size === "fill"
              ? "bottom-px right-px text-[length:clamp(5px,1.5vw,8px)]"
              : "bottom-0 right-0.5 text-[8px]",
          )}
        >
          {tile.points}
        </span>
      )}
    </button>
  );
}
