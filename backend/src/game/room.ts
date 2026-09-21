import { nanoid } from "nanoid";
import { createEmptyBoard, validatePlacement } from "./placement";
import { scoreMove } from "./scoring";
import {
  createTileBag,
  drawTiles,
  isWildcardForbidden,
  rackSizeForPlayerCount,
  shuffle,
} from "./tiles";
import { clampMaxPlayers, touchActivity } from "./expire";
import type {
  GameRoom,
  Language,
  MovePlacement,
  Player,
} from "./types";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function assertNickname(nickname: string): string | { error: string } {
  const trimmed = nickname?.trim?.() ?? "";
  if (!trimmed || trimmed.length > 20) return { error: "Invalid nickname" };
  return trimmed;
}

export function createRoom(
  language: Language,
  hostNickname: string,
  maxPlayers: unknown = 2,
): GameRoom {
  if (language !== "es" && language !== "en") {
    throw new Error("Invalid language");
  }
  const nickname = assertNickname(hostNickname);
  if (typeof nickname !== "string") {
    throw new Error(nickname.error);
  }

  const hostToken = nanoid(16);
  const host: Player = {
    id: nanoid(8),
    nickname,
    token: hostToken,
    rack: [],
    score: 0,
  };

  const bag = createTileBag(language);
  const { drawn, remaining } = drawTiles(bag, rackSizeForPlayerCount(1));
  const createdAt = new Date().toISOString();

  return {
    code: generateRoomCode(),
    language,
    status: "waiting",
    players: [{ ...host, rack: drawn }],
    board: createEmptyBoard(),
    bag: remaining,
    currentPlayerIndex: 0,
    hostPlayerId: host.id,
    maxPlayers: clampMaxPlayers(maxPlayers),
    createdAt,
    lastMoveAt: createdAt,
    scorelessStreak: 0,
  };
}

export function joinRoom(room: GameRoom, nickname: string): { room: GameRoom; player: Player } | { error: string } {
  const name = assertNickname(nickname);
  if (typeof name !== "string") return name;
  nickname = name;

  if (room.status !== "waiting") {
    return { error: "Game already started" };
  }
  if (room.players.length >= (room.maxPlayers ?? 4)) {
    return { error: "Room is full" };
  }
  if (room.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
    return { error: "Nickname already taken" };
  }

  const player: Player = {
    id: nanoid(8),
    nickname,
    token: nanoid(16),
    rack: [],
    score: 0,
  };

  const { drawn, remaining } = drawTiles(room.bag, rackSizeForPlayerCount(room.players.length + 1));
  player.rack = drawn;

  return {
    room: touchActivity({
      ...room,
      players: [...room.players, player],
      bag: remaining,
    }),
    player,
  };
}

export function startGame(room: GameRoom, playerId: string): GameRoom | { error: string } {
  if (room.hostPlayerId !== playerId) {
    return { error: "Only host can start the game" };
  }
  if (room.players.length < 2) {
    return { error: "Need at least 2 players" };
  }
  if (room.status !== "waiting") {
    return { error: "Game already started" };
  }

  let bag = room.bag;
  const players = room.players.map((p) => {
    const needed = rackSizeForPlayerCount(room.players.length) - p.rack.length;
    if (needed <= 0) return p;
    const drawnTiles = drawTiles(bag, needed);
    bag = drawnTiles.remaining;
    return { ...p, rack: [...p.rack, ...drawnTiles.drawn] };
  });

  return touchActivity({
    ...room,
    status: "playing",
    players,
    bag,
    currentPlayerIndex: 0,
    scorelessStreak: 0,
  });
}

export function getPlayerByToken(room: GameRoom, token: string): Player | undefined {
  return room.players.find((p) => p.token === token);
}

export function isPlayerTurn(room: GameRoom, playerId: string): boolean {
  return room.players[room.currentPlayerIndex]?.id === playerId;
}

function rackValue(player: Player): number {
  return player.rack.reduce((sum, tile) => sum + (tile.kind === "blank" ? 0 : tile.points), 0);
}

function finishOutOfTiles(room: GameRoom, finisherId: string): GameRoom {
  let bonus = 0;
  const players = room.players.map((player) => {
    if (player.id === finisherId) return player;
    const value = rackValue(player);
    bonus += value;
    return { ...player, score: player.score - value };
  });
  return {
    ...room,
    status: "finished",
    scorelessStreak: 0,
    players: players.map((player) =>
      player.id === finisherId ? { ...player, score: player.score + bonus } : player,
    ),
  };
}

function finishByScorelessTurns(room: GameRoom): GameRoom {
  return {
    ...room,
    status: "finished",
    scorelessStreak: 0,
    players: room.players.map((player) => ({
      ...player,
      score: player.score - rackValue(player),
    })),
  };
}

function advanceScoreless(room: GameRoom): GameRoom {
  const streak = (room.scorelessStreak ?? 0) + 1;
  const next = touchActivity({
    ...room,
    scorelessStreak: streak,
    currentPlayerIndex: (room.currentPlayerIndex + 1) % room.players.length,
  });
  if (streak >= 6) return finishByScorelessTurns(next);
  return next;
}

function refillRack(room: GameRoom, player: Player): void {
  const needed = rackSizeForPlayerCount(room.players.length) - player.rack.length;
  if (needed > 0 && room.bag.length > 0) {
    const count = Math.min(needed, room.bag.length);
    const { drawn, remaining } = drawTiles(room.bag, count);
    player.rack = [...player.rack, ...drawn];
    room.bag = remaining;
  }
}

export function playTiles(
  room: GameRoom,
  playerId: string,
  moves: MovePlacement[],
): { room: GameRoom; score: number } | { error: string } {
  if (room.status !== "playing") {
    return { error: "Game not in progress" };
  }
  if (!isPlayerTurn(room, playerId)) {
    return { error: "Not your turn" };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Player not found" };

  for (const move of moves) {
    const tile = player.rack.find((t) => t.id === move.tileId);
    if (tile?.kind === "blank" && move.assignedLetter) {
      if (isWildcardForbidden(room.language, move.assignedLetter)) {
        return { error: `Wildcard cannot be ${move.assignedLetter} in ${room.language}` };
      }
    }
  }

  const isFirstMove = room.board.every((row) => row.every((cell) => cell === null));
  const result = validatePlacement(room.board, moves, player.rack, room.language, isFirstMove);

  if (!result.valid) {
    return { error: result.error ?? "Invalid placement" };
  }

  const newBoard = room.board.map((row) => [...row]);
  for (const placed of result.placements) {
    newBoard[placed.row][placed.col] = placed;
  }

  const scoringMoves = result.placements.map((placed) => ({
    row: placed.row,
    col: placed.col,
    tileId: placed.tile.id,
  }));
  const moveScore = scoreMove(newBoard, result.placements, scoringMoves);
  const usedTileIds = new Set(moves.map((m) => m.tileId));
  const newRack = player.rack.filter((t) => !usedTileIds.has(t.id));

  const updatedPlayers = room.players.map((p) => {
    if (p.id !== playerId) return p;
    return { ...p, rack: newRack, score: p.score + moveScore };
  });

  const updatedRoom: GameRoom = touchActivity({
    ...room,
    board: newBoard,
    players: updatedPlayers,
    scorelessStreak: 0,
  });

  const currentPlayer = updatedPlayers.find((p) => p.id === playerId)!;
  refillRack(updatedRoom, currentPlayer);

  updatedRoom.currentPlayerIndex =
    (room.currentPlayerIndex + 1) % room.players.length;

  if (updatedRoom.bag.length === 0 && currentPlayer.rack.length === 0) {
    return { room: finishOutOfTiles(updatedRoom, playerId), score: moveScore };
  }

  return { room: updatedRoom, score: moveScore };
}

export function previewPlay(
  room: GameRoom,
  playerId: string,
  moves: MovePlacement[],
): { score: number; words: string[] } | { error: string } {
  if (room.status !== "playing") {
    return { error: "Game not in progress" };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Player not found" };

  for (const move of moves) {
    const tile = player.rack.find((t) => t.id === move.tileId);
    if (tile?.kind === "blank" && move.assignedLetter) {
      if (isWildcardForbidden(room.language, move.assignedLetter)) {
        return { error: `Wildcard cannot be ${move.assignedLetter} in ${room.language}` };
      }
    }
  }

  const isFirstMove = room.board.every((row) => row.every((cell) => cell === null));
  const result = validatePlacement(room.board, moves, player.rack, room.language, isFirstMove);
  if (!result.valid) {
    return { error: result.error ?? "Invalid placement" };
  }

  const newBoard = room.board.map((row) => [...row]);
  for (const placed of result.placements) {
    newBoard[placed.row][placed.col] = placed;
  }

  return {
    score: scoreMove(
      newBoard,
      result.placements,
      result.placements.map((placed) => ({
        row: placed.row,
        col: placed.col,
        tileId: placed.tile.id,
      })),
    ),
    words: result.formedWords,
  };
}

export function passTurn(room: GameRoom, playerId: string): GameRoom | { error: string } {
  if (room.status !== "playing") return { error: "Game not in progress" };
  if (!isPlayerTurn(room, playerId)) return { error: "Not your turn" };

  return advanceScoreless(room);
}

export function exchangeTiles(
  room: GameRoom,
  playerId: string,
  tileIds: string[],
): GameRoom | { error: string } {
  if (room.status !== "playing") return { error: "Game not in progress" };
  if (!isPlayerTurn(room, playerId)) return { error: "Not your turn" };
  if (tileIds.length === 0) return { error: "Select tiles to exchange" };
  if (room.bag.length < 7) return { error: "Not enough tiles in bag" };

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { error: "Player not found" };

  const toExchange = player.rack.filter((t) => tileIds.includes(t.id));
  if (toExchange.length !== tileIds.length) return { error: "Invalid tiles selected" };

  const { drawn, remaining } = drawTiles(room.bag, tileIds.length);
  const newBag = shuffle([...remaining, ...toExchange]);
  const newRack = [
    ...player.rack.filter((t) => !tileIds.includes(t.id)),
    ...drawn,
  ];

  const updatedPlayers = room.players.map((p) =>
    p.id === playerId ? { ...p, rack: newRack } : p,
  );

  return advanceScoreless({
    ...room,
    bag: newBag,
    players: updatedPlayers,
  });
}

export function sanitizeRoomForClient(room: GameRoom, playerToken?: string): Record<string, unknown> {
  const viewer = playerToken ? getPlayerByToken(room, playerToken) : undefined;
  return {
    code: room.code,
    language: room.language,
    status: room.status,
    currentPlayerIndex: room.currentPlayerIndex,
    hostPlayerId: room.hostPlayerId,
    maxPlayers: room.maxPlayers ?? 4,
    lastMoveAt: room.lastMoveAt ?? room.createdAt,
    bagCount: room.bag.length,
    board: room.board,
    players: room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      rackCount: p.rack.length,
      rack: p.token === playerToken ? p.rack : undefined,
      isYou: p.token === playerToken,
      isCurrentTurn: room.players[room.currentPlayerIndex]?.id === p.id,
    })),
    yourRack: viewer?.rack,
    yourToken: viewer?.token,
  };
}
