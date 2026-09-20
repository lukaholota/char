import { describe, expect, it } from "vitest";

import loreGroupsJson from "@/lib/generated/creature-lore-groups.json";
import creatures2014 from "@/lib/generated/creatures.json";
import creatures2024 from "@/lib/generated/creatures2024.json";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";
import {
  BESTIARY_LORE_EDITIONS,
  BestiaryLoreEdition,
  isLoreGroupPublished,
  readBestiaryLoreSource,
} from "../../scripts/lib/bestiary-lore-source";

type LoreGroup = {
  key: string;
  ruleset: BestiaryLoreEdition;
  name: string;
  engName: string;
  description: string;
  creatureIds: number[];
};

type CatalogRow = { creatureId: number; nameEng: string };

/// Храповик KR33.8: корені дерева лору з власним текстом — 26 у MM 2014 і 83 у MM 2024
/// (виміряно 2026-09-18 на пінутій ревізії дзеркала).
const EXPECTED_GROUPS: Record<BestiaryLoreEdition, number> = { RULES_2014: 26, RULES_2024: 83 };

/// Український переклад зазвичай на 10–20 % коротший за англійський за словами; межі ловлять
/// і резюме замість перекладу, і переказ із дописами.
const MIN_WORD_RATIO = 0.6;
const MAX_WORD_RATIO = 1.5;

const loreGroups = loreGroupsJson as LoreGroup[];
const catalogs: Record<BestiaryLoreEdition, CatalogRow[]> = {
  RULES_2014: creatures2014 as CatalogRow[],
  RULES_2024: creatures2024 as CatalogRow[],
};

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function findCreatureId(edition: BestiaryLoreEdition, nameEng: string): number {
  const row = catalogs[edition].find((creature) => creature.nameEng === nameEng);
  if (!row) throw new Error(`${edition}: у каталозі немає ${nameEng}`);
  return row.creatureId;
}

describe("KR33.8 — файл-джерело лору груп", () => {
  for (const edition of BESTIARY_LORE_EDITIONS) {
    const entries = readBestiaryLoreSource(edition);

    it(`${edition}: кожна група має ключ, назви, джерело й переклад`, () => {
      expect(entries).toHaveLength(EXPECTED_GROUPS[edition]);
      const broken = entries
        .filter(
          (entry) =>
            !entry.key || !entry.engName || !entry.name || !entry.source || !entry.description.trim() || entry.sourceWords <= 0
        )
        .map((entry) => entry.key || entry.engName);
      expect(broken).toEqual([]);
    });

    it(`${edition}: ключі не повторюються`, () => {
      const keys = entries.map((entry) => entry.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it(`${edition}: переклад співмірний із джерелом за обсягом`, () => {
      const offScale = entries
        .map((entry) => ({ key: entry.key, ratio: countWords(entry.description) / entry.sourceWords }))
        .filter(({ ratio }) => ratio < MIN_WORD_RATIO || ratio > MAX_WORD_RATIO)
        .map(({ key, ratio }) => `${key}: ${ratio.toFixed(2)}`);
      expect(offScale).toEqual([]);
    });

    it(`${edition}: маркери оригіналу закриті, а в оригіналі маркера — латиниця`, () => {
      const broken = entries
        .filter((entry) => /\{\{[^}]*$|^[^{]*\}\}/m.test(entry.description) || /\{[^{]|[^}]\}/.test(entry.description.replace(/\{\{[^{}]+\}\}/g, "")))
        .map((entry) => entry.key);
      expect(broken).toEqual([]);

      const cyrillicOriginal = entries
        .flatMap((entry) => findGlossaryMarkers(entry.description).map((marker) => ({ key: entry.key, ...marker })))
        .filter((marker) => /[а-яіїєґ]/i.test(marker.original))
        .map((marker) => `${marker.key}: {{${marker.original}}}`);
      expect(cyrillicOriginal).toEqual([]);
    });
  }
});

describe("KR33.8 — каталог груп лору", () => {
  for (const edition of BESTIARY_LORE_EDITIONS) {
    const entries = readBestiaryLoreSource(edition).filter((entry) => isLoreGroupPublished(edition, entry.key));
    const groups = loreGroups.filter((group) => group.ruleset === edition);

    it(`${edition}: каталог несе кожну групу файлу з тим самим текстом`, () => {
      expect(groups).toHaveLength(entries.length);
      const drifted = entries
        .filter((entry) => {
          const group = groups.find((candidate) => candidate.key === entry.key);
          return !group || group.description !== entry.description || group.name !== entry.name || group.engName !== entry.engName;
        })
        .map((entry) => entry.key);
      expect(drifted).toEqual([]);
    });

    it(`${edition}: кожна група має істот із каталогу, і кожна істота — щонайбільше одну групу`, () => {
      const known = new Set(catalogs[edition].map((creature) => creature.creatureId));
      const empty = groups.filter((group) => group.creatureIds.length === 0).map((group) => group.key);
      expect(empty).toEqual([]);

      const unknown = groups.flatMap((group) => group.creatureIds.filter((id) => !known.has(id)).map((id) => `${group.key}:${id}`));
      expect(unknown).toEqual([]);

      const seen = new Map<number, string>();
      const shared: string[] = [];
      for (const group of groups) {
        for (const id of group.creatureIds) {
          if (seen.has(id)) shared.push(`${id}: ${seen.get(id)} і ${group.key}`);
          seen.set(id, group.key);
        }
      }
      expect(shared).toEqual([]);
    });
  }

  /// Мавпа — тварина: група «Animals» у MM 2024 несе пораду МД замість лору й до бестіарію не йде.
  it("дорослий червоний дракон іде до «Dragons» у 2014 і до «Red Dragons» у 2024, а тварина — нікуди", () => {
    const find = (edition: BestiaryLoreEdition, nameEng: string) =>
      loreGroups.find((group) => group.ruleset === edition && group.creatureIds.includes(findCreatureId(edition, nameEng)))?.key;

    expect(find("RULES_2014", "Adult Red Dragon")).toBe("dragons");
    expect(find("RULES_2024", "Adult Red Dragon")).toBe("red-dragons");
    expect(find("RULES_2014", "Balor")).toBe("demons");
    expect(find("RULES_2024", "Ape")).toBeUndefined();
  });
});
