import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy, Link2, LogOut, Play, RefreshCw, SkipForward, Undo2 } from "lucide-react";
import { Board } from "@/components/Board";
import { DragTileGhost } from "@/components/DragTileGhost";
import { Tile } from "@/components/Tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const dragRef = useRef<{
    tileId: string;
    originX: number;
    originY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const hoverRef = useRef<{ row: number; col: number } | null>(null);

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
    dragRef.current = {
      tileId,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    setDraggingTileId(tileId);
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  useEffect(() => {
    const updateHover = (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      const cell = el?.closest("[data-board-cell]") as HTMLElement | null;
      const next = cell
        ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
        : null;
      const prev = hoverRef.current;
      if (prev?.row === next?.row && prev?.col === next?.col) return;
      hoverRef.current = next;
      setHoverCell(next);
    };

    const onMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (!drag.moved && Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) > 6) {
        drag.moved = true;
      }
      updateHover(event.clientX, event.clientY);
    };
    const onUp = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggingTileId(null);
      hoverRef.current = null;
      setHoverCell(null);
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
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
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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
  const rackTiles = rack.filter((tile) => !pendingPlacements.some((p) => p.tileId === tile.id));

  return (
    <div className="min-h-dvh max-w-6xl mx-auto flex flex-col px-4 sm:px-6">
      <header className="mt-2 shrink-0 flex flex-col gap-3 rounded-xl border border-white/8 bg-brand-surface/65 px-3 py-2 shadow-lg shadow-black/15 backdrop-blur-xl sm:mt-4 sm:px-4 sm:py-3 md:flex-row md:items-center md:gap-4">
        <div className="min-w-0 md:flex-1">
          <button
            type="button"
            onClick={copyCode}
            className="max-w-full truncate text-left text-xl font-mono font-bold tracking-[0.12em] text-brand-cyan-light hover:text-brand-cyan leading-none sm:text-2xl sm:tracking-[0.14em] md:text-4xl md:tracking-[0.18em] lg:text-5xl lg:tracking-[0.2em]"
            aria-label={t("copyCode")}
          >
            {room.code}
          </button>
          <p className="text-[11px] text-white/50 mt-0.5 truncate sm:text-xs md:text-sm">
            {room.language === "es" ? t("languageEs") : t("languageEn")} · {statusLabel(room.status, t)}
            {room.bagCount > 0 && ` · ${t("tilesLeft", { count: room.bagCount })}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1 md:gap-2">
          <Button variant="outline" size="sm" className="px-2 md:px-3" onClick={copyCode} aria-label={t("copyCode")}>
            <Copy className="h-4 w-4" />
            <span className="hidden md:inline">{t("copyCode")}</span>
          </Button>
          <Button variant="outline" size="sm" className="px-2 md:px-3" onClick={copyLink} aria-label={t("copyLink")}>
            <Link2 className="h-4 w-4" />
            <span className="hidden md:inline">{t("copyLink")}</span>
          </Button>
          <Button variant="ghost" size="sm" className="px-2 md:px-3" onClick={handleLeave} aria-label={t("leave")}>
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">{t("leave")}</span>
          </Button>
        </div>
      </header>

      {(message || (error && room.status !== "finished")) && (
        <p
          className={cn(
            "shrink-0 text-center text-sm sm:text-lg font-semibold px-2 py-0.5",
            message ? "text-brand-cyan-light" : "text-red-400",
          )}
        >
          {message || error}
        </p>
      )}

      {showFinished && (
        <div className="mb-3 rounded-xl border border-brand-cyan/30 bg-brand-surface p-4">
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

      <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col sm:mt-4">
        {room.status !== "finished" && (
          <div
            className={cn(
              "mb-2 grid shrink-0 gap-2 md:hidden",
              room.players.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {room.players.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs",
                  p.isCurrentTurn
                    ? "border-brand-cyan/40 bg-brand-cyan/15 ring-1 ring-brand-cyan/60"
                    : "border-white/8 bg-brand-surface/80",
                )}
              >
                <span className="min-w-0 truncate font-medium">
                  {p.nickname}
                  {p.isYou ? ` ${t("you")}` : ""}
                </span>
                <span className="shrink-0 font-mono text-brand-cyan-light tabular-nums">{p.score}</span>
              </div>
            ))}
          </div>
        )}

        <div className="shrink-0 py-1 sm:py-2">
          {room.status === "playing" && isMyTurn && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {preview && !preview.error && pendingPlacements.length > 0 && (
                <span className="font-semibold text-brand-cyan-light text-lg sm:text-2xl tabular-nums">
                  {t("previewScore", { score: preview.score })}
                </span>
              )}
              <Button size="sm" onClick={handlePlay} disabled={pendingPlacements.length === 0}>
                {t("playWord")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleUndoPending} disabled={pendingPlacements.length === 0} aria-label={t("undo")}>
                <Undo2 className="h-4 w-4" />
                <span>{t("undo")}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePass} aria-label={t("pass")}>
                <SkipForward className="h-4 w-4" />
                <span>{t("pass")}</span>
              </Button>
            </div>
          )}

          {room.status === "playing" && !isMyTurn && (
            <p className="text-center text-sm text-white/60">
              {t("waitingTurn", { name: currentTurnName ?? "…" })}
            </p>
          )}

          {room.status === "waiting" && isHost && (
            <div className="text-center">
              <Button onClick={() => setTtlDialog(true)} size="sm" className="sm:h-12 sm:px-8 sm:text-base" disabled={room.players.length < 2}>
                <Play className="h-4 w-4" />{" "}
                {t("startGame", { current: room.players.length, max: maxPlayers })}
              </Button>
            </div>
          )}

          {room.status === "waiting" && !isHost && (
            <p className="text-center text-sm text-white/60">
              {t("waitingHost")} ({room.players.length}/{maxPlayers})
            </p>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_260px] md:items-start md:gap-6">
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex min-w-0 justify-center">
              <Board
                board={room.board}
                pendingPlacements={pendingPlacements}
                rack={rack}
                onCellTap={handleCellTap}
                onPendingPointerDown={beginDrag}
                draggingTileId={draggingTileId}
                hoverCell={hoverCell}
              />
            </div>

            {rack.length > 0 && room.status !== "finished" && (
              <div
                data-rack
                className="rack-zone shrink-0 sticky bottom-0 z-20 -mx-4 bg-[#05070de8] px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none sm:static sm:pt-3"
              >
                <div className="tile-rack">
                  <div className="tile-rack-tiles flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {rackTiles.map((tile) => (
                      <Tile
                        key={tile.id}
                        tile={tile}
                        selected={selectedTileId === tile.id}
                        dragging={draggingTileId === tile.id}
                        onPointerDown={(event) => beginDrag(tile.id, event)}
                        size="rack"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="hidden space-y-4 pb-4 md:block md:sticky md:top-4 md:self-start">
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
          </aside>
        </div>
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
      {draggingTileId &&
        (() => {
          const tile = rack.find((item) => item.id === draggingTileId);
          if (!tile) return null;
          const pending = pendingPlacements.find((p) => p.tileId === draggingTileId);
          return (
            <DragTileGhost
              tile={tile}
              displayLetter={pending?.assignedLetter ?? tile.letter}
              x={dragRef.current?.x ?? 0}
              y={dragRef.current?.y ?? 0}
            />
          );
        })()}
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
