import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Language } from "./types";

const lexiconDir = join(dirname(fileURLToPath(import.meta.url)), "lexicon");

function loadLexicon(filename: string): Set<string> {
  const text = readFileSync(join(lexiconDir, filename), "utf8");
  const words = new Set<string>();
  for (const line of text.split("\n")) {
    const word = line.trim();
    if (word) words.add(word);
  }
  return words;
}

const dictionaries: Record<Language, Set<string>> = {
  en: loadLexicon("en.txt"),
  es: loadLexicon("es.txt"),
};

export function normalizeWord(_language: Language, word: string): string {
  return word.toUpperCase();
}

export function isValidWord(language: Language, word: string): boolean {
  const normalized = normalizeWord(language, word);
  if (normalized.length < 1) return false;
  return dictionaries[language].has(normalized);
}

export function getDictionarySize(language: Language): number {
  return dictionaries[language].size;
}
