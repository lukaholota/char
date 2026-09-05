import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPELL_PREPARATION_2024 } from "@/rules/spell-preparation-2024";

/**
 * KR27.7 — таблиці підготовки 2024 звіряються з SRD у репо, не з памʼяті. Кожна таблиця класу
 * в data/2024/srd/classes.md — HTML під рядком «**X Features**»: колонки Cantrips, Prepared Spells
 * і слоти (у чорнокнижника — Slot Level).
 */
const SRD = readFileSync("data/2024/srd/classes.md", "utf8");

const CLASSES: Array<[string, string]> = [
  ["BARD_2024", "Bard"],
  ["CLERIC_2024", "Cleric"],
  ["DRUID_2024", "Druid"],
  ["PALADIN_2024", "Paladin"],
  ["RANGER_2024", "Ranger"],
  ["SORCERER_2024", "Sorcerer"],
  ["WARLOCK_2024", "Warlock"],
  ["WIZARD_2024", "Wizard"],
];

function readSrdTable(className: string) {
  const start = SRD.indexOf(`**${className} Features**`);
  const table = SRD.slice(SRD.indexOf("<table>", start), SRD.indexOf("</table>", start));
  const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((match) => match[1].trim());
  const cantripsIndex = headers.indexOf("Cantrips");
  const preparedIndex = headers.indexOf("Prepared Spells");
  const slotLevelIndex = headers.indexOf("Slot Level");
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((match) => [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => toCount(cell[1])))
    .filter((cells) => cells.length > 0);

  return {
    cantrips: rows.map((cells) => (cantripsIndex === -1 ? 0 : cells[cantripsIndex])),
    prepared: rows.map((cells) => cells[preparedIndex]),
    maxSpellLevel: rows.map((cells) =>
      slotLevelIndex === -1 ? cells.slice(preparedIndex + 1).filter((slots) => slots > 0).length : cells[slotLevelIndex],
    ),
  };
}

function toCount(cell: string): number {
  const digits = cell.replace(/<[^>]+>/g, "").trim();
  return /^\d+$/.test(digits) ? Number(digits) : 0;
}

describe("KR27.7 — таблиці підготовки заклинань 2024 дорівнюють SRD", () => {
  it.each(CLASSES)("%s: замовляння, підготовлені й найвищий рівень на всіх 20 рівнях", (key, srdName) => {
    const srd = readSrdTable(srdName);

    expect(srd.prepared).toHaveLength(20);
    expect(SPELL_PREPARATION_2024[key]).toEqual(srd);
  });
});
