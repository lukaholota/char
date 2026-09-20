/**
 * KR31.18 — рід Джина (TCoE): покровитель дає спільні заклинання й ті, що «associated in the table with
 * your patron's kind». Рід — вибір підкласу на 1-му рівні («Рід джина»); поки його не обрано (персонажі,
 * створені до 2026-09-18), крок показує весь список. Переліки — з файлу, що читає й сід.
 */

import patronSpellLists from "../../data/2014/warlock-expanded-spell-lists.json";

export const GENIE_KIND_OPTIONS: Readonly<Record<string, string>> = {
  "Genie Kind: Dao": "Dao",
  "Genie Kind: Djinni": "Djinni",
  "Genie Kind: Efreeti": "Efreeti",
  "Genie Kind: Marid": "Marid",
};

type PatronSpellEntry = { engName: string; genieKind: string | null };

export function findChosenGenieKind(chosenOptionNames: readonly string[]): string | null {
  return chosenOptionNames.map((name) => GENIE_KIND_OPTIONS[name]).find((kind) => kind !== undefined) ?? null;
}

/** Назви заклинань інших родів, яких обраний рід не дає; без обраного роду — нічого не вилучається. */
export function collectOtherGenieKindSpellNames(chosenOptionNames: readonly string[]): Set<string> {
  const kind = findChosenGenieKind(chosenOptionNames);
  if (!kind) return new Set();
  return new Set(readGenieSpells().filter((spell) => spell.genieKind !== null && spell.genieKind !== kind).map((spell) => spell.engName));
}

function readGenieSpells(): PatronSpellEntry[] {
  return patronSpellLists.lists.find((list) => list.subclass === "THE_GENIE")?.spells ?? [];
}
