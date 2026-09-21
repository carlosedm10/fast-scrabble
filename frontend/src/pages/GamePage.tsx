import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy, Link2, LogOut, Play, RefreshCw, Repeat, SkipForward, Undo2 } from "lucide-react";
import { Board } from "@/components/Board";
import { DragTileGhost } from "@/components/DragTileGhost";
import { Tile } from "@/components/Tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { insertDraggedId, orderTiles, sameIds } from "@/lib/rackOrder";
import { getSocket } from "@/lib/socket";
import { clearSession, getNickname, getToken, saveSession } from "@/lib/storage";
import { getDeviceProfile } from "@/lib/deviceProfile";
import type { PendingPlacement, PlayerView, RoomView, TileData } from "@/types/game";

/** How far above the finger the drop cursor sits on touch, in CSS pixels. */
const TOUCH_DROP_AIM_Y = 72;

function pointerIsCoarse(): boolean {
  return window.matchMedia("(pointer: coarse), (max-width: 639px)").matches;
}

function dropAim(clientX: number, clientY: number): { x: number; y: number } {
  if (!pointerIsCoarse()) return { x: clientX, y: clientY };
  return { x: clientX, y: clientY - TOUCH_DROP_AIM_Y };
}

function elementAt(x: number, y: number): Element | null {
  return document.elementFromPoint(x, y);
}

function zoneAt(clientX: number, clientY: number): "rack" | "board" | "other" {
  const el = elementAt(clientX, clientY);
  if (el?.closest("[data-rack]")) return "rack";
  if (el?.closest("[data-board-cell]")) return "board";
  return "other";
}

function isTurnError(error: string | undefined): boolean {
  return error === "Not your turn";
}

function rackInsertIndex(dragId: string, clientX: number, clientY: number, ids: string[]): number {
  const others = ids.filter((id) => id !== dragId);
  if (others.length === 0) return 0;

  let nearestI = 0;
  let nearestDist = Number.POSITIVE_INFINITY;
  others.forEach((id, index) => {
    const el = document.querySelector(`[data-rack-tile="${id}"]`);
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    const dist = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2));
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestI = index;
    }
  });

  const nearest = document.querySelector(`[data-rack-tile="${others[nearestI]}"]`);
  if (!(nearest instanceof HTMLElement)) return others.length;
  const rect = nearest.getBoundingClientRect();
  return clientX < rect.left + rect.width / 2 ? nearestI : nearestI + 1;
}

const SPANISH_LETTERS = [..."ABCDEFGHIJLMNOPQRSTUVXYZÑ".split(""), "CH", "LL", "RR"];
const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function statusLabel(status: RoomView["status"], t: (key: string) => string): string {
  if (status === "waiting") return t("statusWaiting");
  if (status === "playing") return t("statusPlaying");
  return t("statusFinished");
}

function mapServerError(error: string | undefined, t: (key: string, opts?: Record<string, unknown>) => string, fallback: string): string {
  if (error === "expired") return t("expired");
  if (error === "Room not found") return t("roomNotFound");
  if (error === "Not your turn") return t("notYourTurn");
  if (error === "Word must be at least 2 letters") return t("wordTooShort");
  if (error === "Not enough tiles in bag") return t("exchangeNeedBag");
  if (error === "Select tiles to exchange") return t("exchangeEmpty");
  if (error === "Invalid nickname") return t("invalidNickname");
  if (error === "Invalid language") return t("invalidLanguage");
  if (error === "Game already started") return t("joinClosed");
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
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(() => getToken());
  const [joinName, setJoinName] = useState(() => getNickname() ?? "");
  const [joinError, setJoinError] = useState("");
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeIds, setExchangeIds] = useState<string[]>([]);
  const [passOpen, setPassOpen] = useState(false);
  const [device, setDevice] = useState(getDeviceProfile);
  const roomRef = useRef<RoomView | null>(null);
  const dragRef = useRef<{
    tileId: string;
    originX: number;
    originY: number;
    x: number;
    y: number;
    moved: boolean;
    canPlace: boolean;
  } | null>(null);
  const hoverRef = useRef<{ row: number; col: number } | null>(null);
  const serverRackRef = useRef<TileData[]>([]);

  const token = sessionToken;
  const rack = useMemo(
    () => orderTiles(room?.yourRack ?? [], rackOrder),
    [room?.yourRack, rackOrder],
  );

  useEffect(() => {
    roomRef.current = room;
    serverRackRef.current = room?.yourRack ?? [];
  }, [room]);

  useEffect(() => {
    const updateDevice = () => setDevice(getDeviceProfile());
    window.addEventListener("resize", updateDevice);
    window.addEventListener("orientationchange", updateDevice);
    return () => {
      window.removeEventListener("resize", updateDevice);
      window.removeEventListener("orientationchange", updateDevice);
    };
  }, []);

  useEffect(() => {
    setRackOrder([]);
    setPendingPlacements([]);
    setSelectedTileId(null);
  }, [code]);

  const applyRoom = useCallback(
    (updated: RoomView) => {
      setRoom(updated);
      setPendingPlacements((prev) => {
        const next = prev.filter((placement) => !updated.board?.[placement.row]?.[placement.col]);
        return next.length === prev.length ? prev : next;
      });
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
    const onScored = (data: { playerId?: string; score: number }) => {
      const name = roomRef.current?.players.find((player) => player.id === data.playerId)?.nickname;
      setMessage(
        name ? t("plusPointsBy", { name, score: data.score }) : t("plusPoints", { score: data.score }),
      );
      window.setTimeout(() => setMessage(""), 3000);
    };
    const onExpired = (data: { room?: RoomView }) => {
      setExpired(true);
      if (data.room) applyRoom({ ...data.room, status: "finished" });
      setError(t("expired"));
    };
    socket.on("connect", syncRoom);
    socket.on("room:updated", onUpdate);
    socket.on("game:scored", onScored);
    socket.on("game:expired", onExpired);
    return () => {
      socket.off("connect", syncRoom);
      socket.off("room:updated", onUpdate);
      socket.off("game:scored", onScored);
      socket.off("game:expired", onExpired);
    };
  }, [code, token, syncRoom, applyRoom, t]);

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
      if (room?.status !== "playing") return;
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
    [rack, room],
  );

  const handleCellTap = (row: number, col: number) => {
    if (!selectedTileId) return;
    placeTileAt(row, col, selectedTileId);
  };

  const beginDrag = (tileId: string, event: ReactPointerEvent, source: "rack" | "board" = "rack") => {
    if (room?.status === "finished") return;
    const canPlace = room?.status === "playing";
    if (source === "board" && !canPlace) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      tileId,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      canPlace,
    };
    setDraggingTileId(tileId);
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const reorderRackAt = useCallback((dragId: string, clientX: number, clientY: number) => {
    if (zoneAt(clientX, clientY) !== "rack") return false;
    setRackOrder((prev) => {
      const ids = orderTiles(serverRackRef.current, prev).map((tile) => tile.id);
      if (!ids.includes(dragId)) return prev;
      const next = insertDraggedId(ids, dragId, rackInsertIndex(dragId, clientX, clientY, ids));
      if (sameIds(next, prev) || sameIds(next, ids)) return prev;
      return next;
    });
    return true;
  }, []);

  useEffect(() => {
    const setHover = (next: { row: number; col: number } | null) => {
      const prev = hoverRef.current;
      if (prev?.row === next?.row && prev?.col === next?.col) return;
      hoverRef.current = next;
      setHoverCell(next);
    };

    const cellAt = (x: number, y: number) => {
      const el = elementAt(x, y);
      const cell = el?.closest("[data-board-cell]") as HTMLElement | null;
      return cell ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) } : null;
    };

    const onMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (!drag.moved && Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) > 6) {
        drag.moved = true;
      }

      const zone = zoneAt(event.clientX, event.clientY);
      if (zone === "rack") {
        setHover(null);
        if (drag.moved) reorderRackAt(drag.tileId, event.clientX, event.clientY);
        return;
      }

      if (!drag.canPlace) {
        setHover(null);
        return;
      }

      const aim = dropAim(event.clientX, event.clientY);
      setHover(cellAt(aim.x, aim.y));
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

      if (drag.moved) {
        if (zoneAt(event.clientX, event.clientY) === "rack") {
          reorderRackAt(drag.tileId, event.clientX, event.clientY);
          setPendingPlacements((prev) => prev.filter((p) => p.tileId !== drag.tileId));
          return;
        }
        if (drag.canPlace) {
          const aim = dropAim(event.clientX, event.clientY);
          const cell = cellAt(aim.x, aim.y);
          if (cell) placeTileAt(cell.row, cell.col, drag.tileId);
        }
        return;
      }

      if (pendingPlacements.some((p) => p.tileId === drag.tileId)) {
        setPendingPlacements((prev) => prev.filter((p) => p.tileId !== drag.tileId));
        setSelectedTileId(null);
        return;
      }
      if (!drag.canPlace) return;
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
  }, [placeTileAt, pendingPlacements, reorderRackAt]);

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
        } else if (isTurnError(res.error)) {
          setPreview(null);
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
    if (!isMyTurn || !code || !token || pendingPlacements.length === 0) return;
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
    if (!code || !token || !isMyTurn) return;
    setPassOpen(false);
    const socket = getSocket();
    socket.emit("game:pass", { code, token }, (res: { ok: boolean; error?: string }) => {
      if (res.ok) {
        setPendingPlacements([]);
        setSelectedTileId(null);
      } else {
        setError(mapServerError(res.error, t, t("invalidMove")));
      }
    });
  };

  const handleExchange = () => {
    if (!code || !token || !isMyTurn || exchangeIds.length === 0) return;
    const socket = getSocket();
    socket.emit(
      "game:exchange",
      { code, token, tileIds: exchangeIds },
      (res: { ok: boolean; error?: string }) => {
        if (res.ok) {
          setExchangeOpen(false);
          setExchangeIds([]);
          setPendingPlacements([]);
          setSelectedTileId(null);
        } else {
          setError(mapServerError(res.error, t, t("invalidMove")));
        }
      },
    );
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

  const copyText = (value: string, ok: string) => {
    void navigator.clipboard.writeText(value).then(
      () => flash(ok),
      () => flash(t("copyFailed")),
    );
  };

  const copyCode = () => {
    if (!room) return;
    copyText(room.code, t("codeCopied"));
  };

  const copyLink = () => {
    copyText(`${window.location.origin}/scrabble/p/${code}`, t("linkCopied"));
  };

  const handleJoinRoom = () => {
    if (!code || !joinName.trim()) {
      setJoinError(t("errorNickname"));
      return;
    }
    setJoinError("");
    const socket = getSocket();
    socket.emit(
      "room:join",
      { code, nickname: joinName.trim() },
      (res: { ok: boolean; token?: string; room?: RoomView; error?: string }) => {
        if (!res.ok || !res.token || !res.room) {
          setJoinError(mapServerError(res.error, t, t("errorJoin")));
          return;
        }
        saveSession(res.token, joinName.trim(), res.room.code);
        if (res.room.language) void i18n.changeLanguage(res.room.language);
        setSessionToken(res.token);
      },
    );
  };

  const handleLeave = () => {
    clearSession();
    navigate("/");
  };

  const wildcardLetters = room?.language === "es" ? SPANISH_LETTERS : ENGLISH_LETTERS;

  if (!room) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-4 text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-brand-cyan-light">
              {expired ? t("expiredTitle") : t("roomNotFound")}
            </h1>
            <p className="text-white/70 max-w-md">{error}</p>
            <Button onClick={handleLeave} className="h-12 px-6">{t("backHome")}</Button>
          </>
        ) : (
          <RefreshCw className="h-8 w-8 animate-spin text-brand-cyan" />
        )}
      </div>
    );
  }

  const isMember = room.players.some((player) => player.isYou);
  if (!isMember) {
    const closed = room.status !== "waiting";
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-brand-cyan/30 bg-brand-surface p-6 shadow-xl">
          <p className="text-center font-mono text-4xl font-bold tracking-[0.18em] text-brand-cyan-light">{room.code}</p>
          <h1 className="mt-3 text-center text-xl font-semibold">{closed ? t("statusPlaying") : t("joinTitle")}</h1>
          <p className="mt-2 text-center text-sm text-white/60">
            {room.language === "es" ? t("languageEs") : t("languageEn")}
            {" · "}
            {t("joinPlayers", { current: room.players.length, max: maxPlayers })}
          </p>
          {closed ? (
            <p className="mt-4 text-center text-sm text-white/70">{t("joinClosed")}</p>
          ) : (
            <div className="mt-5 space-y-3">
              <label className="block text-sm text-white/70" htmlFor="join-nickname">{t("nickname")}</label>
              <Input
                id="join-nickname"
                value={joinName}
                maxLength={20}
                autoComplete="nickname"
                enterKeyHint="go"
                placeholder={t("nicknamePlaceholder")}
                onChange={(event) => setJoinName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleJoinRoom();
                }}
              />
              {joinError && <p className="text-sm text-red-400">{joinError}</p>}
              <Button onClick={handleJoinRoom} className="h-12 w-full">{t("join")}</Button>
            </div>
          )}
          <Button variant="ghost" onClick={handleLeave} className="mt-3 w-full">{t("backHome")}</Button>
        </div>
      </div>
    );
  }

  const showFinished = room.status === "finished" || expired;
  const rackTiles = rack.filter((tile) => !pendingPlacements.some((p) => p.tileId === tile.id));

  return (
    <div
      className="game-shell mx-auto flex h-dvh max-w-6xl flex-col overflow-hidden overscroll-none px-3 sm:px-6"
      data-device={device.kind}
      data-orientation={device.orientation}
      data-compact={device.compact ? "true" : "false"}
      data-layout={device.layout}
    >
      <header className="game-header mt-2 shrink-0 flex flex-col gap-2 rounded-xl border border-white/8 bg-brand-surface/65 px-3 py-2 shadow-lg shadow-black/15 backdrop-blur-xl sm:mt-3 sm:px-4 md:flex-row md:items-center md:gap-4">
        <div className="min-w-0 md:flex-1">
          <button
            type="button"
            onClick={copyCode}
            className="max-w-full truncate text-left text-xl font-mono font-bold tracking-[0.12em] text-brand-cyan-light hover:text-brand-cyan leading-none sm:text-2xl md:text-3xl lg:text-4xl"
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
          <Button variant="outline" size="sm" className="h-11 w-11 px-0 md:h-8 md:w-auto md:px-3" onClick={copyCode} aria-label={t("copyCode")}>
            <Copy className="h-4 w-4" />
            <span className="hidden md:inline">{t("copyCode")}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-11 w-11 px-0 md:h-8 md:w-auto md:px-3" onClick={copyLink} aria-label={t("copyLink")}>
            <Link2 className="h-4 w-4" />
            <span className="hidden md:inline">{t("copyLink")}</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-11 w-11 px-0 md:h-8 md:w-auto md:px-3" onClick={handleLeave} aria-label={t("leave")}>
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

      <div className="game-play mt-2 flex min-h-0 min-w-0 flex-1 flex-col md:mt-3 md:grid md:grid-cols-[minmax(0,1fr)_260px] md:items-stretch md:gap-6">
        <div className="play-column flex min-h-0 min-w-0 flex-1 flex-col">
          {room.status !== "finished" && (
            <div
              className={cn(
                "mobile-scores mb-2 grid shrink-0 gap-2 md:hidden",
                room.players.length <= 2 ? "grid-cols-2" : "grid-cols-2",
              )}
            >
              {room.players.map((p) => (
                <ScoreChip key={p.id} player={p} youLabel={t("you")} />
              ))}
            </div>
          )}

          <div className="board-stage min-h-0 flex-1">
            <Board
              language={room.language}
              board={room.board}
              pendingPlacements={pendingPlacements}
              rack={rack}
              onCellTap={handleCellTap}
              onPendingPointerDown={(tileId, event) => beginDrag(tileId, event, "board")}
              draggingTileId={draggingTileId}
              hoverCell={hoverCell}
            />
          </div>

          <div className="game-dock shrink-0 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
            {room.status !== "finished" && (
              <div className="landscape-scores mb-2 flex-col gap-1">
                {room.players.map((p) => (
                  <ScoreChip key={p.id} player={p} youLabel={t("you")} />
                ))}
              </div>
            )}

            {room.status === "playing" && isMyTurn && (
              <div className="action-grid grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                {preview && !preview.error && pendingPlacements.length > 0 && (
                  <span className="col-span-2 text-center text-lg font-semibold tabular-nums text-brand-cyan-light sm:text-2xl">
                    {t("previewScore", { score: preview.score })}
                  </span>
                )}
                {preview?.error && pendingPlacements.length > 0 && (
                  <span className="col-span-2 text-center text-sm font-semibold text-red-400">{preview.error}</span>
                )}
                <Button className="play-action h-11 sm:h-10" onClick={handlePlay} disabled={pendingPlacements.length === 0 || !!preview?.error}>
                  <Play className="h-4 w-4" />
                  <span className="action-label-full">{t("playWord")}</span>
                  <span className="action-label-short">{t("playShort")}</span>
                </Button>
                <Button variant="outline" className="undo-action h-11 sm:h-10" onClick={handleUndoPending} disabled={pendingPlacements.length === 0} aria-label={t("undo")}>
                  <Undo2 className="h-4 w-4" />
                  <span className="action-label">{t("undo")}</span>
                </Button>
                <Button variant="outline" className="pass-action h-11 sm:h-10" onClick={() => setPassOpen(true)} aria-label={t("pass")}>
                  <SkipForward className="h-4 w-4" />
                  <span className="action-label">{t("pass")}</span>
                </Button>
                <Button
                  variant="outline"
                  className="exchange-action h-11 sm:h-10"
                  onClick={() => {
                    setExchangeIds([]);
                    setExchangeOpen(true);
                  }}
                  disabled={pendingPlacements.length > 0}
                  aria-label={t("exchange")}
                >
                  <Repeat className="h-4 w-4" />
                  <span className="action-label">{t("exchange")}</span>
                </Button>
              </div>
            )}

            {room.status === "playing" && !isMyTurn && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-center text-sm text-white/60">
                  {t("waitingTurn", { name: currentTurnName ?? "…" })} · {t("trialHint")}
                </p>
                {pendingPlacements.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {preview && !preview.error && (
                      <span className="text-lg font-semibold tabular-nums text-brand-cyan-light sm:text-2xl">
                        {t("previewScore", { score: preview.score })}
                      </span>
                    )}
                    {preview?.error && <span className="text-sm font-semibold text-red-400">{preview.error}</span>}
                    <Button variant="outline" className="h-11" onClick={handleUndoPending} aria-label={t("undo")}>
                      <Undo2 className="h-4 w-4" />
                      <span>{t("undo")}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {room.status === "waiting" && isHost && (
              <div className="text-center">
                <Button onClick={() => setTtlDialog(true)} className="h-12 px-6" disabled={room.players.length < 2}>
                  <Play className="h-4 w-4" />
                  {t("startGame", { current: room.players.length, max: maxPlayers })}
                </Button>
              </div>
            )}

            {room.status === "waiting" && !isHost && (
              <p className="text-center text-sm text-white/60">
                {t("waitingHost")} ({room.players.length}/{maxPlayers})
              </p>
            )}

            {room.status === "playing" && (
              <p className="place-hint mt-1 text-center text-[11px] text-white/40">{t("placeHint")}</p>
            )}

            {rack.length > 0 && room.status !== "finished" && (
              <div className="rack-zone pt-1">
                <div data-rack className="tile-rack">
                  <div className="tile-rack-tiles flex justify-center gap-1.5 sm:gap-2">
                    {rackTiles.map((tile) => (
                      <div key={tile.id} data-rack-tile={tile.id} className="rack-tile shrink-0">
                        <Tile
                          tile={tile}
                          selected={selectedTileId === tile.id}
                          dragging={draggingTileId === tile.id}
                          onPointerDown={(event) => beginDrag(tile.id, event, "rack")}
                          size="rack"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden min-h-0 space-y-4 overflow-y-auto pb-4 md:block md:self-start">
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

      <Dialog open={!!wildcardDialog} onOpenChange={() => setWildcardDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chooseBlank")}</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-72 grid-cols-5 gap-2 overflow-y-auto sm:grid-cols-7">
            {wildcardLetters.map((letter) => (
              <Button
                key={letter}
                variant="outline"
                onClick={() => handleWildcardSelect(letter)}
                className="h-11 min-w-0 px-1"
              >
                {letter}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("passTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">{t("passBody")}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPassOpen(false)}>{t("ttlCancel")}</Button>
            <Button onClick={handlePass}>{t("passConfirm")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exchangeOpen} onOpenChange={setExchangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exchangeTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            {room.bagCount < 7 ? t("exchangeNeedBag") : t("exchangeHint")}
          </p>
          <div className="flex flex-wrap justify-center gap-2 py-2">
            {rack.map((tile) => (
              <Tile
                key={tile.id}
                tile={tile}
                size="lg"
                selected={exchangeIds.includes(tile.id)}
                onClick={() =>
                  setExchangeIds((current) =>
                    current.includes(tile.id)
                      ? current.filter((id) => id !== tile.id)
                      : [...current, tile.id],
                  )
                }
              />
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExchangeOpen(false)}>{t("ttlCancel")}</Button>
            <Button onClick={handleExchange} disabled={exchangeIds.length === 0 || room.bagCount < 7}>
              {t("exchangeConfirm")}
            </Button>
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

function ScoreChip({ player, youLabel }: { player: PlayerView; youLabel: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs",
        player.isCurrentTurn
          ? "border-brand-cyan/40 bg-brand-cyan/15 ring-1 ring-brand-cyan/60"
          : "border-white/8 bg-brand-surface/80",
      )}
    >
      <span className="min-w-0 truncate font-medium">
        {player.nickname}
        {player.isYou ? ` ${youLabel}` : ""}
      </span>
      <span className="shrink-0 font-mono tabular-nums text-brand-cyan-light">{player.score}</span>
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
