import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy, Link2, LogOut, Play, RefreshCw, SkipForward, Undo2 } from "lucide-react";
import { Board } from "@/components/Board";
import { Tile } from "@/components/Tile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket";
import { getToken, clearSession } from "@/lib/storage";
import type { PendingPlacement, PlayerView, RoomView, TileData } from "@/types/game";

const SPANISH_LETTERS = "ABCDEFGHIJLMNOPQRSTUVXYZÑ".split("");
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function statusLabel(status: RoomView["status"], t: (key: string) => string): string {
  if (status === "waiting") return t("statusWaiting");
  if (status === "playing") return t("statusPlaying");
  return t("statusFinished");
}

function mapServerError(error: string | undefined, t: (key: string, opts?: Record<string, unknown>) => string, fallback: string): string {
  if (error === "expired") return t("expired");
  if (error === "Room not found") return t("roomNotFound");
  if (error?.startsWith("Invalid word:")) {
    return t("invalidWord", { word: error.slice("Invalid word:".length).trim() });
  }
  return error ?? fallback;
}

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);
  const [wildcardDialog, setWildcardDialog] = useState<{ tileId: string; row: number; col: number } | null>(null);
  const [ttlDialog, setTtlDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ score: number; error: string | null } | null>(null);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const dragRef = useRef<{ tileId: string; x: number; y: number; moved: boolean } | null>(null);

  const token = getToken();
  const rack: TileData[] = room?.yourRack ?? [];

  const applyRoom = useCallback(
    (updated: RoomView) => {
      setRoom(updated);
      if (updated.language && updated.language !== i18n.language) {
        void i18n.changeLanguage(updated.language);
      }
    },
    [i18n],
  );

  const syncRoom = useCallback(() => {
    if (!code) return;
    const socket = getSocket();
    socket.emit("room:sync", { code, token }, (res: { ok: boolean; room?: RoomView; error?: string }) => {
      if (res.ok && res.room) {
        setExpired(false);
        applyRoom(res.room);
      } else {
        setError(mapServerError(res.error, t, t("roomNotFound")));
        if (res.error === "expired") setExpired(true);
      }
    });
  }, [code, token, applyRoom, t]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    syncRoom();
    const socket = getSocket();
    const onUpdate = (updated: RoomView) => {
      if (updated.code !== code?.toUpperCase()) return;
      // Anonymous broadcasts drop isYou; resync so the host still sees Start.
      if (updated.players.some((p) => p.isYou) || updated.yourRack) {
        applyRoom(updated);
        return;
      }
      syncRoom();
    };
    const onScored = (data: { score: number }) => {
      setMessage(t("plusPoints", { score: data.score }));
      window.setTimeout(() => setMessage(""), 3000);
    };
    const onExpired = (data: { room?: RoomView }) => {
      setExpired(true);
      if (data.room) applyRoom({ ...data.room, status: "finished" });
      setError(t("expired"));
    };
    socket.on("room:updated", onUpdate);
    socket.on("game:scored", onScored);
    socket.on("game:expired", onExpired);
    return () => {
      socket.off("room:updated", onUpdate);
      socket.off("game:scored", onScored);
      socket.off("game:expired", onExpired);
    };
  }, [code, token, navigate, syncRoom, applyRoom, t]);

  const isMyTurn = room?.players.some((p) => p.isYou && p.isCurrentTurn);
  const isHost = room?.players.some((p) => p.isYou && p.id === room.hostPlayerId);
  const maxPlayers = room?.maxPlayers ?? 4;
  const currentTurnName = room?.players.find((p) => p.isCurrentTurn)?.nickname;

  const rankedPlayers = useMemo(() => {
    if (!room) return [];
    return [...room.players].sort((a, b) => b.score - a.score);
  }, [room]);

  const placeTileAt = useCallback(
    (row: number, col: number, tileId: string) => {
      if (!isMyTurn || room?.status !== "playing") return;
      if (room.board?.[row]?.[col]) return;

      const tile = rack.find((t) => t.id === tileId);
      if (!tile) return;

      setPendingPlacements((prev) => {
        if (prev.some((p) => p.row === row && p.col === col && p.tileId !== tileId)) return prev;
        const rest = prev.filter((p) => p.tileId !== tileId);
        const existing = prev.find((p) => p.tileId === tileId);
        if (tile.kind === "blank" && !existing?.assignedLetter) {
          setWildcardDialog({ tileId: tile.id, row, col });
          return rest;
        }
        return [
          ...rest,
          {
            row,
            col,
            tileId,
            assignedLetter: existing?.assignedLetter,
          },
        ];
      });
      setSelectedTileId(null);
      setError("");
    },
    [isMyTurn, rack, room],
  );

  const handleCellTap = (row: number, col: number) => {
    if (!selectedTileId) return;
    placeTileAt(row, col, selectedTileId);
  };

  const beginDrag = (tileId: string, event: ReactPointerEvent) => {
    if (!isMyTurn || room?.status !== "playing") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { tileId, x: event.clientX, y: event.clientY, moved: false };
    setDraggingTileId(tileId);
  };

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) {
        drag.moved = true;
      }
    };
    const onUp = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggingTileId(null);
      if (!drag) return;

      const el = document.elementFromPoint(event.clientX, event.clientY);
      const cell = el?.closest("[data-board-cell]") as HTMLElement | null;
      const onRack = Boolean(el?.closest("[data-rack]"));

      if (drag.moved) {
        if (cell) {
          placeTileAt(Number(cell.dataset.row), Number(cell.dataset.col), drag.tileId);
        } else if (onRack) {
          setPendingPlacements((prev) => prev.filter((p) => p.tileId !== drag.tileId));
        }
        return;
      }

      if (pendingPlacements.some((p) => p.tileId === drag.tileId)) return;
      setSelectedTileId((current) => (current === drag.tileId ? null : drag.tileId));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [placeTileAt, pendingPlacements]);

  useEffect(() => {
    if (!code || !token || pendingPlacements.length === 0) {
      setPreview(null);
      return;
    }
    const socket = getSocket();
    socket.emit(
      "game:preview",
      { code, token, moves: pendingPlacements },
      (res: { ok: boolean; score?: number; error?: string }) => {
        if (res.ok) {
          setPreview({ score: res.score ?? 0, error: null });
        } else {
          setPreview({
            score: 0,
            error: mapServerError(res.error, t, t("invalidMove")),
          });
        }
      },
    );
  }, [code, token, pendingPlacements, t]);

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
        setError(mapServerError(res.error, t, t("invalidMove")));
        window.setTimeout(() => setError(""), 3000);
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

  const confirmStart = () => {
    if (!code || !token) return;
    setTtlDialog(false);
    const socket = getSocket();
    socket.emit("room:start", { code, token }, (res: { ok: boolean; error?: string }) => {
      if (!res.ok) setError(mapServerError(res.error, t, t("cannotStart")));
    });
  };

  const handleUndoPending = () => {
    setPendingPlacements([]);
    setSelectedTileId(null);
  };

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2000);
  };

  const copyCode = () => {
    if (!room) return;
    void navigator.clipboard.writeText(room.code);
    flash(t("codeCopied"));
  };

  const copyLink = () => {
    const url = `${window.location.origin}/scrabble/p/${code}`;
    void navigator.clipboard.writeText(url);
    flash(t("linkCopied"));
  };

  const handleLeave = () => {
    clearSession();
    navigate("/");
  };

  const wildcardLetters = room?.language === "es" ? SPANISH_LETTERS : ENGLISH_LETTERS;

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-brand-cyan-light">
              {expired ? t("expiredTitle") : t("roomNotFound")}
            </h1>
            <p className="text-white/70 max-w-md">{error}</p>
            <Button onClick={handleLeave}>{t("backHome")}</Button>
          </>
        ) : (
          <RefreshCw className="h-8 w-8 animate-spin text-brand-cyan" />
        )}
      </div>
    );
  }

  const showFinished = room.status === "finished" || expired;

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">{t("shareCode")}</p>
          <button
            type="button"
            onClick={copyCode}
            className="text-4xl sm:text-5xl font-mono font-bold tracking-[0.2em] text-brand-cyan-light hover:text-brand-cyan"
            aria-label={t("copyCode")}
          >
            {room.code}
          </button>
          <p className="text-sm text-white/60 mt-1">
            {room.language === "es" ? t("languageEs") : t("languageEn")} · {statusLabel(room.status, t)}
            {room.bagCount > 0 && ` · ${t("tilesLeft", { count: room.bagCount })}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="h-4 w-4" /> {t("copyCode")}
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Link2 className="h-4 w-4" /> {t("copyLink")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            <LogOut className="h-4 w-4" /> {t("leave")}
          </Button>
        </div>
      </header>

      {room.status === "playing" && (
        <p className="mb-3 text-center text-xs text-white/40">{t("ttlBanner")}</p>
      )}

      {message && (
        <div className="mb-4 text-center text-2xl text-brand-cyan-light font-semibold">{message}</div>
      )}
      {error && room.status !== "finished" && (
        <div className="mb-4 text-center text-red-400">{error}</div>
      )}

      {showFinished && (
        <div className="mb-6 rounded-xl border border-brand-cyan/30 bg-brand-surface p-4">
          <h2 className="font-semibold text-brand-cyan-light mb-3">{t("finalRanking")}</h2>
          <ol className="space-y-2">
            {rankedPlayers.map((p, i) => (
              <li key={p.id} className="flex justify-between items-center">
                <span>
                  {t("place", { place: i + 1 })} · {p.nickname} {p.isYou ? t("you") : ""}
                </span>
                <span className="font-mono text-xl text-brand-cyan">
                  {p.score} {t("points")}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div>
          <Board
            board={room.board}
            pendingPlacements={pendingPlacements}
            rack={rack}
            onCellTap={handleCellTap}
            onPendingPointerDown={beginDrag}
            draggingTileId={draggingTileId}
          />

          {room.status === "playing" && isMyTurn && (
            <div className="flex flex-col items-center gap-2 mt-4">
              {preview?.error && (
                <p className="text-red-400 text-sm">{preview.error}</p>
              )}
              {preview && !preview.error && pendingPlacements.length > 0 && (
                <p className="text-2xl font-semibold text-brand-cyan-light">
                  {t("previewScore", { score: preview.score })}
                </p>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={handlePlay}
                  disabled={pendingPlacements.length === 0 || Boolean(preview?.error)}
                >
                  {t("playWord")}
                </Button>
                <Button variant="outline" onClick={handleUndoPending} disabled={pendingPlacements.length === 0}>
                  <Undo2 className="h-4 w-4" /> {t("undo")}
                </Button>
                <Button variant="outline" onClick={handlePass}>
                  <SkipForward className="h-4 w-4" /> {t("pass")}
                </Button>
              </div>
            </div>
          )}

          {room.status === "playing" && !isMyTurn && (
            <p className="mt-4 text-center text-white/60">
              {t("waitingTurn", { name: currentTurnName ?? "…" })}
            </p>
          )}

          {room.status === "waiting" && isHost && (
            <div className="mt-4 text-center">
              <Button onClick={() => setTtlDialog(true)} size="lg" disabled={room.players.length < 2}>
                <Play className="h-4 w-4" />{" "}
                {t("startGame", { current: room.players.length, max: maxPlayers })}
              </Button>
            </div>
          )}

          {room.status === "waiting" && !isHost && (
            <p className="mt-4 text-center text-white/60">
              {t("waitingHost")} ({room.players.length}/{maxPlayers})
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-brand-cyan/20 bg-brand-surface p-4">
            <h2 className="font-semibold mb-3 text-brand-cyan-light">
              {t("players")} · {room.players.length}/{maxPlayers}
            </h2>
            <ul className="space-y-2">
              {room.players.map((p) => (
                <PlayerRow key={p.id} player={p} hostId={room.hostPlayerId} t={t} />
              ))}
            </ul>
          </div>

          {rack.length > 0 && room.status !== "finished" && (
            <div className="rounded-xl border border-brand-cyan/20 bg-brand-surface p-4" data-rack>
              <h2 className="font-semibold mb-3 text-brand-cyan-light">{t("yourRack")}</h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {rack
                  .filter((tile) => !pendingPlacements.some((p) => p.tileId === tile.id))
                  .map((tile) => (
                    <Tile
                      key={tile.id}
                      tile={tile}
                      selected={selectedTileId === tile.id}
                      dragging={draggingTileId === tile.id}
                      onPointerDown={(event) => beginDrag(tile.id, event)}
                      size="lg"
                    />
                  ))}
              </div>
              <p className="text-xs text-white/50 text-center mt-2">{t("dragToPlace")}</p>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={!!wildcardDialog} onOpenChange={() => setWildcardDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chooseBlank")}</DialogTitle>
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

      <Dialog open={ttlDialog} onOpenChange={setTtlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ttlTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">{t("ttlBody")}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTtlDialog(false)}>
              {t("ttlCancel")}
            </Button>
            <Button onClick={confirmStart}>{t("ttlConfirm")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayerRow({
  player,
  hostId,
  t,
}: {
  player: PlayerView;
  hostId: string;
  t: (key: string) => string;
}) {
  return (
    <li
      className={`flex justify-between items-center p-2 rounded ${
        player.isCurrentTurn ? "bg-brand-cyan/20 ring-1 ring-brand-cyan" : ""
      }`}
    >
      <div className="flex flex-col">
        <span>
          {player.nickname} {player.isYou ? t("you") : ""}
        </span>
        <span className="text-xs text-white/40">
          {player.id === hostId ? t("host") : ""}
          {player.isCurrentTurn ? ` · ${t("turn")}` : ""}
        </span>
      </div>
      <span className="font-mono text-2xl text-brand-cyan leading-none">
        {player.score}
        <span className="ml-1 text-xs text-white/40">{t("points")}</span>
      </span>
    </li>
  );
}
