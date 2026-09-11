export type Language = "es" | "en";

export interface TileData {
  id: string;
  letter: string;
  points: number;
  kind: "letter" | "blank";
}

export interface PlayerView {
  id: string;
  nickname: string;
  score: number;
  rackCount: number;
  rack?: TileData[];
  isYou?: boolean;
  isCurrentTurn?: boolean;
}

export interface RoomView {
  code: string;
  language: Language;
  status: "waiting" | "playing" | "finished";
  currentPlayerIndex: number;
  hostPlayerId: string;
  maxPlayers: 2 | 3 | 4;
  lastMoveAt?: string;
  bagCount: number;
  board: (PlacedCell | null)[][] | null;
  players: PlayerView[];
  yourRack?: TileData[];
  yourToken?: string;
}

export interface PlacedCell {
  row: number;
  col: number;
  letter: string;
  tile: { points: number; kind: string };
}

export interface PendingPlacement {
  row: number;
  col: number;
  tileId: string;
  assignedLetter?: string;
}
