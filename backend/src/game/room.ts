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
import type {
  GameRoom,
  Language,
  MovePlacement,
  Player,
  PlacedTile,
} from "./types";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(language: Language, hostNickname: string): GameRoom {
  const hostToken = nanoid(16);
  const host: Player = {
    id: nanoid(8),
    nickname: hostNickname,
    token: hostToken,
    rack: [],
    score: 0,
  };

  const bag = createTileBag(language);
  const { drawn, remaining } = drawTiles(bag, rackSizeForPlayerCount(1));

  return {
    code: generateRoomCode(),
    language,
    status: "waiting",
    players: [{ ...host, rack: drawn }],
    board: createEmptyBoard(),
    bag: remaining,
    currentPlayerIndex: 0,
    hostPlayerId: host.id,
    createdAt: new Date().toISOString(),
  };
}

export function joinRoom(room: GameRoom, nickname: string): { room: GameRoom; player: Player } | { error: string } {
  if (room.status !== "waiting") {
    return { error: "Game already started" };
  }
  if (room.players.length >= 4) {
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
    room: {
      ...room,
      players: [...room.players, player],
      bag: remaining,
    },
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

  const players = room.players.map((p) => {
    const needed = rackSizeForPlayerCount(room.players.length) - p.rack.length;
    if (needed <= 0) return p;
    const { drawn, remaining } = drawTiles(room.bag, needed);
    room.bag = remaining;
    return { ...p, rack: [...p.rack, ...drawn] };
  });

  return {
    ...room,
    status: "playing",
    players,
    currentPlayerIndex: 0,
  };
}

export function getPlayerByToken(room: GameRoom, token: string): Player | undefined {
  return room.players.find((p) => p.token === token);
}

export function isPlayerTurn(room: GameRoom, playerId: string): boolean {
  return room.players[room.currentPlayerIndex]?.id === playerId;
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

  const moveScore = scoreMove(newBoard, result.placements, moves);
  const usedTileIds = new Set(moves.map((m) => m.tileId));
  const newRack = player.rack.filter((t) => !usedTileIds.has(t.id));

  const updatedPlayers = room.players.map((p) => {
    if (p.id !== playerId) return p;
    return { ...p, rack: newRack, score: p.score + moveScore };
  });

  const updatedRoom: GameRoom = {
    ...room,
    board: newBoard,
    players: updatedPlayers,
  };

  const currentPlayer = updatedPlayers.find((p) => p.id === playerId)!;
  refillRack(updatedRoom, currentPlayer);

  updatedRoom.currentPlayerIndex =
    (room.currentPlayerIndex + 1) % room.players.length;

  if (updatedRoom.bag.length === 0 && currentPlayer.rack.length === 0) {
    updatedRoom.status = "finished";
  }

  return { room: updatedRoom, score: moveScore };
}

export function passTurn(room: GameRoom, playerId: string): GameRoom | { error: string } {
  if (room.status !== "playing") return { error: "Game not in progress" };
  if (!isPlayerTurn(room, playerId)) return { error: "Not your turn" };

  return {
    ...room,
    currentPlayerIndex: (room.currentPlayerIndex + 1) % room.players.length,
  };
}

export function exchangeTiles(
  room: GameRoom,
  playerId: string,
  tileIds: string[],
): GameRoom | { error: string } {
  if (room.status !== "playing") return { error: "Game not in progress" };
  if (!isPlayerTurn(room, playerId)) return { error: "Not your turn" };
  if (room.bag.length < tileIds.length) return { error: "Not enough tiles in bag" };

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

  return {
    ...room,
    bag: newBag,
    players: updatedPlayers,
    currentPlayerIndex: (room.currentPlayerIndex + 1) % room.players.length,
  };
}

export function sanitizeRoomForClient(room: GameRoom, playerToken?: string): Record<string, unknown> {
  const viewer = playerToken ? getPlayerByToken(room, playerToken) : undefined;
  return {
    code: room.code,
    language: room.language,
    status: room.status,
    currentPlayerIndex: room.currentPlayerIndex,
    hostPlayerId: room.hostPlayerId,
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
