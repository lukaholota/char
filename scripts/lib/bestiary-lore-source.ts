import { readFileSync } from "fs";
import { join } from "path";

export type BestiaryLoreEdition = "RULES_2014" | "RULES_2024";

/// Файл-джерело лору груп за Р33: український текст живе тут, каталог із нього збирається.
export type BestiaryLoreEntry = {
  key: string;
  engName: string;
  name: string;
  source: string;
  sourceSections: string[];
  sourceWords: number;
  description: string;
};

export const BESTIARY_LORE_EDITIONS: readonly BestiaryLoreEdition[] = ["RULES_2014", "RULES_2024"];

/// Перекладені групи, чиїх істот у нашому бестіарії ще немає: модронів MM 2024 не імпортовано
/// (перевірено 2026-09-19). Каталог їх не несе, доки не зʼявиться хоч одна істота.
export const LORE_GROUPS_AWAITING_CREATURES: Record<BestiaryLoreEdition, readonly string[]> = {
  RULES_2014: [],
  RULES_2024: ["modrons"],
};

const SOURCE_PATHS: Record<BestiaryLoreEdition, string> = {
  RULES_2014: "data/2014/bestiary-lore/groups.json",
  RULES_2024: "data/2024/bestiary-lore/groups.json",
};

export function findBestiaryLoreSourcePath(edition: BestiaryLoreEdition): string {
  return SOURCE_PATHS[edition];
}

export function readBestiaryLoreSource(edition: BestiaryLoreEdition): BestiaryLoreEntry[] {
  return JSON.parse(readFileSync(join(process.cwd(), SOURCE_PATHS[edition]), "utf-8")) as BestiaryLoreEntry[];
}
