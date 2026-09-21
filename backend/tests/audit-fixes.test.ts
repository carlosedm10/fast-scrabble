import { describe, expect, test } from "bun:test";
import { createEmptyBoard, validatePlacement } from "../src/game/placement";
import { scoreMove } from "../src/game/scoring";
import {
  createRoom,
  exchangeTiles,
  joinRoom,
  passTurn,
  playTiles,
} from "../src/game/room";
import { isWildcardForbidden } from "../src/game/tiles";
import type { GameRoom, PlacedTile, Tile } from "../src/game/types";

function letter(id: string, face: string, points = 1): Tile {
  return { id, letter: face, points, kind: "letter" };
}

function place(row: number, col: number, face: string, points = 1): PlacedTile {
  return {
    row,
    col,
    letter: face,
    tile: { id: `${row}-${col}`, letter: face, points, kind: "letter" },
  };
}

describe("placement guards", () => {
  test("rejects a one-tile word", () => {
    const result = validatePlacement(
      createEmptyBoard(),
      [{ row: 7, col: 7, tileId: "A" }],
      [letter("A", "A")],
      "en",
      true,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Word must be at least 2 letters");
  });

  test("rejects using the same tile twice", () => {
    const result = validatePlacement(
      createEmptyBoard(),
      [
        { row: 7, col: 7, tileId: "A" },
        { row: 7, col: 8, tileId: "A" },
      ],
      [letter("A", "A"), letter("T", "T")],
      "en",
      true,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Tile already used");
  });

  test("rejects a cell outside the board", () => {
    const result = validatePlacement(
      createEmptyBoard(),
      [{ row: 20, col: 7, tileId: "A" }],
      [letter("A", "A")],
      "en",
      true,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Cell is outside the board");
  });
});

describe("scoring both crossings", () => {
  test("scores two words that spell the same letters", () => {
    const board = createEmptyBoard();
    board[6][7] = place(6, 7, "O");
    board[7][6] = place(7, 6, "O");
    board[8][7] = place(8, 7, "E");
    board[7][8] = place(7, 8, "E");
    const played = place(7, 7, "N");
    board[7][7] = played;

    const score = scoreMove(board, [played], [{ row: 7, col: 7, tileId: played.tile.id }]);
    expect(score).toBe(12);
  });
});

describe("end of game", () => {
  function playingRoom(): GameRoom {
    const room = createRoom("en", "Ana", 2);
    const joined = joinRoom(room, "Luis");
    if ("error" in joined) throw new Error(joined.error);
    return {
      ...joined.room,
      status: "playing",
      bag: [],
      scorelessStreak: 0,
      currentPlayerIndex: 0,
      players: [
        {
          ...joined.room.players[0],
          score: 20,
          rack: [letter("h", "Z", 10)],
        },
        {
          ...joined.room.players[1],
          score: 15,
          rack: [letter("g", "Q", 10)],
        },
      ],
    };
  }

  test("six scoreless turns subtract the racks and finish", () => {
    let room = playingRoom();
    for (let turn = 0; turn < 5; turn++) {
      const playerId = room.players[room.currentPlayerIndex].id;
      const next = passTurn(room, playerId);
      if ("error" in next) throw new Error(next.error);
      room = next;
      expect(room.status).toBe("playing");
    }
    const playerId = room.players[room.currentPlayerIndex].id;
    const finished = passTurn(room, playerId);
    if ("error" in finished) throw new Error(finished.error);
    expect(finished.status).toBe("finished");
    const ana = finished.players.find((player) => player.nickname === "Ana");
    const luis = finished.players.find((player) => player.nickname === "Luis");
    expect(ana?.score).toBe(10);
    expect(luis?.score).toBe(5);
  });

  test("playing the last tile pays the opponent racks to the finisher", () => {
    const room = playingRoom();
    room.bag = [];
    room.board = createEmptyBoard();
    room.board[7][6] = {
      row: 7,
      col: 6,
      letter: "C",
      tile: letter("c", "C", 3),
    };
    room.board[7][7] = {
      row: 7,
      col: 7,
      letter: "A",
      tile: letter("a", "A", 1),
    };
    room.players[0].rack = [letter("t", "T", 1)];
    room.players[0].score = 5;
    room.players[1].score = 30;

    const result = playTiles(room, room.players[0].id, [{ row: 7, col: 8, tileId: "t" }]);
    if ("error" in result) throw new Error(result.error);
    expect(result.room.status).toBe("finished");
    const ana = result.room.players.find((player) => player.nickname === "Ana");
    const luis = result.room.players.find((player) => player.nickname === "Luis");
    expect(luis?.score).toBe(20);
    expect(ana?.score).toBe(5 + result.score + 10);
  });
});

describe("exchange and wildcards", () => {
  test("exchange needs seven tiles in the bag and at least one tile", () => {
    const room = createRoom("en", "Ana", 2);
    const joined = joinRoom(room, "Luis");
    if ("error" in joined) throw new Error(joined.error);
    const playing: GameRoom = {
      ...joined.room,
      status: "playing",
      scorelessStreak: 0,
    };
    const tileId = playing.players[0].rack[0].id;
    const shortBag = { ...playing, bag: playing.bag.slice(0, 6) };
    expect(exchangeTiles(shortBag, playing.players[0].id, [tileId])).toEqual({
      error: "Not enough tiles in bag",
    });
    expect(exchangeTiles(playing, playing.players[0].id, [])).toEqual({
      error: "Select tiles to exchange",
    });
  });

  test("Spanish blanks can be digraphs and cannot be arbitrary text", () => {
    expect(isWildcardForbidden("es", "CH")).toBe(false);
    expect(isWildcardForbidden("es", "ll")).toBe(false);
    expect(isWildcardForbidden("es", "RR")).toBe(false);
    expect(isWildcardForbidden("es", "Ñ")).toBe(false);
    expect(isWildcardForbidden("es", "K")).toBe(true);
    expect(isWildcardForbidden("es", "QU")).toBe(true);
  });

  test("createRoom rejects an unknown language and a blank nickname", () => {
    expect(() => createRoom("fr" as "es", "Ana")).toThrow("Invalid language");
    expect(() => createRoom("es", "   ")).toThrow("Invalid nickname");
  });
});
