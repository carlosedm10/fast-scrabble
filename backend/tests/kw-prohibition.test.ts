import { describe, expect, test } from "bun:test";
import { createTileBag, isWildcardForbidden } from "../src/game/tiles";

describe("K/W prohibition in Spanish", () => {
  test("Spanish tile bag has no K or W tiles", () => {
    const bag = createTileBag("es");
    const letterTiles = bag.filter((t) => t.kind === "letter").map((t) => t.letter);
    expect(letterTiles.includes("K")).toBe(false);
    expect(letterTiles.includes("W")).toBe(false);
  });

  test("wildcard assignment rejects K in Spanish", () => {
    expect(isWildcardForbidden("es", "K")).toBe(true);
    expect(isWildcardForbidden("es", "k")).toBe(true);
  });

  test("wildcard assignment rejects W in Spanish", () => {
    expect(isWildcardForbidden("es", "W")).toBe(true);
    expect(isWildcardForbidden("es", "w")).toBe(true);
  });

  test("wildcard assignment allows Ñ in Spanish", () => {
    expect(isWildcardForbidden("es", "Ñ")).toBe(false);
  });

  test("English allows K and W as wildcards", () => {
    expect(isWildcardForbidden("en", "K")).toBe(false);
    expect(isWildcardForbidden("en", "W")).toBe(false);
  });
});
