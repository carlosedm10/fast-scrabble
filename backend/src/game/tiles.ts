import { nanoid } from "nanoid";
import type { Language, Tile } from "./types";

const ENGLISH_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
  N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
};

const ENGLISH_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
  N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

const SPANISH_DISTRIBUTION: Record<string, number> = {
  A: 14, B: 2, C: 2, CH: 1, D: 5, E: 12, F: 1, G: 2, H: 2, I: 6, J: 1, L: 4, LL: 1,
  M: 2, N: 6, Ñ: 1, O: 8, P: 2, Q: 1, R: 5, RR: 1, S: 6, T: 4, U: 5, V: 1, X: 1, Y: 1, Z: 1,
};

const SPANISH_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, CH: 5, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, L: 1, LL: 3, M: 2,
  N: 1, Ñ: 8, O: 1, P: 3, Q: 8, R: 1, RR: 3, S: 1, T: 1, U: 1, V: 4, X: 8, Y: 4, Z: 10,
};

const SPANISH_FORBIDDEN_WILDCARD = new Set(["K", "W"]);

export function isWildcardForbidden(language: Language, letter: string): boolean {
  const upper = letter.toUpperCase();
  if (language === "es") {
    return SPANISH_FORBIDDEN_WILDCARD.has(upper);
  }
  return !/^[A-Z]$/.test(upper);
}

export function createTileBag(language: Language): Tile[] {
  const distribution =
    language === "es" ? SPANISH_DISTRIBUTION : ENGLISH_DISTRIBUTION;
  const points = language === "es" ? SPANISH_POINTS : ENGLISH_POINTS;
  const bag: Tile[] = [];

  for (const [letter, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      bag.push({
        id: nanoid(8),
        letter,
        points: points[letter] ?? 0,
        kind: "letter",
      });
    }
  }

  for (let i = 0; i < 2; i++) {
    bag.push({ id: nanoid(8), letter: "", points: 0, kind: "blank" });
  }

  return shuffle(bag);
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, count);
  const remaining = bag.slice(count);
  return { drawn, remaining };
}

export function rackSizeForPlayerCount(playerCount: number): number {
  if (playerCount <= 2) return 7;
  if (playerCount === 3) return 7;
  return 7;
}
