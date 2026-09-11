import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, LogOut, Play, RefreshCw, SkipForward, Undo2 } from "lucide-react";
import { Board } from "@/components/Board";
import { Tile } from "@/components/Tile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket";
import { getToken, clearSession } from "@/lib/storage";
import type { PendingPlacement, RoomView, TileData } from "@/types/game";

const SPANISH_LETTERS = "AÁBCDEFGHIJKLMNÑOÓPQRSTUÚVXYZ".replace(/[ÁÓÚ]/g, "").split("");
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState("");
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);
  const [wildcardDialog, setWildcardDialog] = useState<{ tileId: string; row: number; col: number } | null>(null);
  const [message, setMessage] = useState("");

  const token = getToken();
  const rack: TileData[] = room?.yourRack ?? [];

  const syncRoom = useCallback(() => {
    if (!code) return;
    const socket = getSocket();
    socket.emit("room:sync", { code, token }, (res: { ok: boolean; room?: RoomView; error?: string }) => {
      if (res.ok && res.room) {
        setRoom(res.room);
      } else {
        setError(res.error ?? "Room not found");
      }
    });
  }, [code, token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    syncRoom();
    const socket = getSocket();
    const onUpdate = (updated: RoomView) => {
      if (updated.code === code?.toUpperCase()) {
        setRoom(updated);
      }
    };
    socket.on("room:updated", onUpdate);
    socket.on("game:scored", (data: { score: number }) => {
      setMessage(`+${data.score} points!`);
      setTimeout(() => setMessage(""), 3000);
    });
    return () => {
      socket.off("room:updated", onUpdate);
    };
  }, [code, token, navigate, syncRoom]);

  const isMyTurn = room?.players.some((p) => p.isYou && p.isCurrentTurn);
  const isHost = room?.players.some((p) => p.isYou && p.id === room.hostPlayerId);

  const handleCellTap = (row: number, col: number) => {
    if (!isMyTurn || room?.status !== "playing") return;
    if (room.board?.[row]?.[col]) return;
    if (pendingPlacements.some((p) => p.row === row && p.col === col)) return;

    if (!selectedTileId) return;

    const tile = rack.find((t) => t.id === selectedTileId);
    if (!tile) return;
    if (pendingPlacements.some((p) => p.tileId === selectedTileId)) return;

    if (tile.kind === "blank") {
      setWildcardDialog({ tileId: tile.id, row, col });
      return;
    }

    setPendingPlacements((prev) => [...prev, { row, col, tileId: selectedTileId }]);
    setSelectedTileId(null);
  };

  const handleWildcardSelect = (letter: string) => {
    if (!wildcardDialog) return;
    setPendingPlacements((prev) => [
      ...prev,
      {
        row: wildcardDialog.row,
        col: wildcardDialog.col,
        tileId: wildcardDialog.tileId,
        assignedLetter: letter,
      },
    ]);
    setWildcardDialog(null);
    setSelectedTileId(null);
  };

  const handlePlay = () => {
    if (!code || !token || pendingPlacements.length === 0) return;
    const socket = getSocket();
    socket.emit("game:play", { code, token, moves: pendingPlacements }, (res: { ok: boolean; error?: string }) => {
      if (res.ok) {
        setPendingPlacements([]);
        setSelectedTileId(null);
      } else {
        setError(res.error ?? "Invalid move");
        setTimeout(() => setError(""), 3000);
      }
    });
  };

  const handlePass = () => {
    if (!code || !token) return;
    const socket = getSocket();
    socket.emit("game:pass", { code, token }, () => {
      setPendingPlacements([]);
    });
  };

  const handleStart = () => {
    if (!code || !token) return;
    const socket = getSocket();
    socket.emit("room:start", { code, token }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) setError(res.error ?? "Cannot start");
    });
  };

  const handleUndoPending = () => {
    setPendingPlacements([]);
    setSelectedTileId(null);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/scrabble/p/${code}`;
    navigator.clipboard.writeText(url);
    setMessage("Link copied!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleLeave = () => {
    clearSession();
    navigate("/");
  };

  const wildcardLetters =
    room?.language === "es"
      ? SPANISH_LETTERS.filter((l) => l !== "K" && l !== "W")
      : ENGLISH_LETTERS;

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-cyan-light">
            Room {room.code}
          </h1>
          <p className="text-sm text-white/60">
            {room.language === "es" ? "Español (FISE)" : "English"} · {room.status}
            {room.bagCount > 0 && ` · ${room.bagCount} tiles left`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" /> Share
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            <LogOut className="h-4 w-4" /> Leave
          </Button>
        </div>
      </header>

      {message && (
        <div className="mb-4 text-center text-brand-cyan-light font-semibold">{message}</div>
      )}
      {error && (
        <div className="mb-4 text-center text-red-400">{error}</div>
      )}

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div>
          <Board
            board={room.board}
            pendingPlacements={pendingPlacements}
            rack={rack}
            onCellTap={handleCellTap}
          />

          {room.status === "playing" && isMyTurn && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <Button onClick={handlePlay} disabled={pendingPlacements.length === 0}>
                Play Word
              </Button>
              <Button variant="outline" onClick={handleUndoPending} disabled={pendingPlacements.length === 0}>
                <Undo2 className="h-4 w-4" /> Undo
              </Button>
              <Button variant="outline" onClick={handlePass}>
                <SkipForward className="h-4 w-4" /> Pass
              </Button>
            </div>
          )}

          {room.status === "waiting" && isHost && (
            <div className="mt-4 text-center">
              <Button onClick={handleStart} size="lg" disabled={room.players.length < 2}>
                <Play className="h-4 w-4" /> Start Game ({room.players.length}/4 players)
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-brand-cyan/20 bg-brand-surface p-4">
            <h2 className="font-semibold mb-3 text-brand-cyan-light">Players</h2>
            <ul className="space-y-2">
              {room.players.map((p) => (
                <li
                  key={p.id}
                  className={`flex justify-between items-center p-2 rounded ${
                    p.isCurrentTurn ? "bg-brand-cyan/20 ring-1 ring-brand-cyan" : ""
                  }`}
                >
                  <span>
                    {p.nickname}
                    {p.isYou && " (you)"}
                  </span>
                  <span className="font-mono text-brand-cyan">{p.score}</span>
                </li>
              ))}
            </ul>
          </div>

          {rack.length > 0 && (
            <div className="rounded-xl border border-brand-cyan/20 bg-brand-surface p-4">
              <h2 className="font-semibold mb-3 text-brand-cyan-light">Your Rack</h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {rack.map((tile) => (
                  <Tile
                    key={tile.id}
                    tile={tile}
                    selected={selectedTileId === tile.id}
                    onClick={() => {
                      if (!isMyTurn || room.status !== "playing") return;
                      setSelectedTileId(selectedTileId === tile.id ? null : tile.id);
                    }}
                    size="lg"
                  />
                ))}
              </div>
              {selectedTileId && (
                <p className="text-xs text-white/50 text-center mt-2">Tap a cell to place</p>
              )}
            </div>
          )}
        </aside>
      </div>

      <Dialog open={!!wildcardDialog} onOpenChange={() => setWildcardDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose letter for blank tile</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {wildcardLetters.map((letter) => (
              <Button
                key={letter}
                variant="outline"
                onClick={() => handleWildcardSelect(letter)}
                className="h-10"
              >
                {letter}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
