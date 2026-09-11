import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Tile, type TileData } from "@/components/Tile";

interface DragTileGhostProps {
  tile: TileData;
  displayLetter?: string;
  x: number;
  y: number;
}

export function DragTileGhost({ tile, displayLetter, x, y }: DragTileGhostProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const move = (event: PointerEvent) => {
      node.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return createPortal(
    <div
      ref={nodeRef}
      className="fixed left-0 top-0 z-[200] pointer-events-none"
      style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
    >
      <div className="tile-ghost-lift -translate-x-1/2 -translate-y-[72%] scale-[1.22]">
        <div className="tile-jiggle">
          <Tile tile={tile} size="lg" displayLetter={displayLetter} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
