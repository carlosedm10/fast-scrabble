export type Language = "es" | "en";

export type TileKind = "letter" | "blank";

export interface Tile {
  id: string;
  letter: string;
  points: number;
  kind: TileKind;
  assigned?: string;
}

export interface PlacedTile {
  row: number;
  col: number;
  tile: Tile;
  letter: string;
}

export interface Player {
  id: string;
  nickname: string;
  token: string;
  rack: Tile[];
  score: number;
}

export type RoomStatus = "waiting" | "playing" | "finished";

export interface MovePlacement {
  row: number;
  col: number;
  tileId: string;
  assignedLetter?: string;
}

export interface GameRoom {
  code: string;
  language: Language;
  status: RoomStatus;
  players: Player[];
  board: (PlacedTile | null)[][];
  bag: Tile[];
  currentPlayerIndex: number;
  hostPlayerId: string;
  maxPlayers: 2 | 3 | 4;
  createdAt: string;
  lastMoveAt: string;
  /** Consecutive turns that scored nothing. Six ends the game. */
  scorelessStreak: number;
}

export interface BoardCell {
  multiplier: "normal" | "dl" | "tl" | "dw" | "tw" | "star";
}
