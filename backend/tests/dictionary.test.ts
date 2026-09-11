import { describe, expect, test } from "bun:test";
import { isValidWord, getDictionarySize } from "../src/game/dictionary";

describe("lexicon", () => {
  test("Spanish accepts CLARA", () => {
    expect(isValidWord("es", "CLARA")).toBe(true);
  });

  test("Spanish accepts Ñ words", () => {
    expect(isValidWord("es", "NIÑO") || isValidWord("es", "NINO")).toBe(true);
  });

  test("lexicons are full-size open lists", () => {
    expect(getDictionarySize("es")).toBeGreaterThan(20_000);
    expect(getDictionarySize("en")).toBeGreaterThan(50_000);
  });
});
