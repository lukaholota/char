import { describe, expect, it } from "vitest";

import classesCatalog from "@/lib/generated/classes.json";
import racesCatalog from "@/lib/generated/races.json";
import { readCatalogProse2014 } from "../../prisma/seed/catalogProse2014";
import { readSubclassSeedInputs } from "../../prisma/seed/subclassSeed";
import { LEGACY_SUBCLASSES_2024 } from "@/rules/legacy-subclasses-2024";
import { countProseWords, findProseProblems } from "./catalog-prose-checks";

/// Мірка власника — ≈ 145 слів (2026-09-09). Межі ловлять і «стиснуто до двох речень», і
/// «переклали главу PHB», яка в джерелі має медіану 1 287 слів.
const MIN_ARTICLE_WORDS = 100;
const MAX_ARTICLE_WORDS = 190;
/// Найкоротша раса в книзі — Локата (40 слів, LR), у MPMM — 55–60: нижча межа рас іде за
/// найкоротшим джерелом, бо дотягувати його до мірки класу означало б вигадувати.
const MIN_RACE_WORDS = 30;
/// Підраса в книзі — один-два абзаци поверх раси; у каталозі — одне-два речення (KR33.6).
const MIN_SUBRACE_WORDS = 8;
const MAX_SUBRACE_WORDS = 80;

/// Храповик хвиль KR33.6: PHB — 9 рас і 9 підрас, MPMM — ще 33 раси, решта книг — ще 22.
/// Підраси — ще 7 поверх PHB. Без прози в джерелі лишаються раси Custom Lineage і Grung та
/// підраса «Еладрін (DMG)» — у DMG вона має лише механіку.
const EXPECTED_RACES_WITH_PROSE = 64;
const EXPECTED_SUBRACES_WITH_PROSE = 16;
/// Варіанти: власну прозу в джерелі мають лише 9 родоводів тифлінга MTF; мітки ERLW,
/// варіанти SCAG і Human Variant — ні.
const EXPECTED_VARIANTS_WITH_PROSE = 9;
/// KR33.7: опис підкласу — коротке резюме вступу книги (рішення власника 2026-09-09). Межу 60
/// зафіксовано після партії варвара (29–51 слово); довший текст — уже переклад розділу.
const MIN_SUBCLASS_WORDS = 20;
const MAX_SUBCLASS_WORDS = 60;
/// Храповик партій KR33.7 за класом: варвар — 9, бард — 8, клірик — 14, друїд — 7, воїн — 10, монах — 10, паладин — 9, слідопит — 8, пройдисвіт — 9, чародій — 8, чаклун — 9, чарівник — 13, винахідник — 4.
const EXPECTED_SUBCLASSES_RECONCILED = 118;
// +4 ордени Мисливця за кровʼю (O45) у кожній редакції; їхній опис несе data/blood-hunter.
const SUBCLASSES_2014 = 122;
const SUBCLASSES_2024 = 80;

const classes = readCatalogProse2014("classes");
const races = readCatalogProse2014("races");
const subraces = readCatalogProse2014("subraces");
const variants = readCatalogProse2014("variants");
const subclasses = readCatalogProse2014("subclasses");

const races2014 = racesCatalog.filter((entry) => entry.ruleset === "RULES_2014");

function findWordCountOutliers(entries: { key: string; description: string }[], min: number, max: number) {
  return entries
    .map((entry) => ({ key: entry.key, words: countProseWords(entry.description) }))
    .filter(({ words }) => words < min || words > max);
}

/// Опис Мисливця за кровʼю (O45) несе власний носій data/blood-hunter — його звіряє blood-hunter-carrier.test.ts.
function isBloodHunterKey(key: string): boolean {
  return key.startsWith("BLOOD_HUNTER");
}

function findDuplicateKeys(entries: { key: string }[]): string[] {
  return entries.map((entry) => entry.key).filter((key, index, keys) => keys.indexOf(key) !== index);
}

describe("KR33.6 — проза каталогу 2014", () => {
  it("покриває кожен клас 2014 каталогу рівно одним записом", () => {
    const catalogKeys = classesCatalog
      .filter((entry) => entry.ruleset === "RULES_2014" && !isBloodHunterKey(entry.key))
      .map((entry) => entry.key)
      .sort();

    expect(classes.map((entry) => entry.key).sort()).toEqual(catalogKeys);
    expect(classes).toHaveLength(13);
  });

  it("пише прозу лише для рас, підрас і варіантів, які є в каталозі 2014, без повторів", () => {
    const raceKeys = new Set(races2014.map((entry) => entry.key));
    const subraceKeys = new Set(races2014.flatMap((entry) => entry.subraces.map((subrace) => subrace.key)));
    const variantKeys = new Set(races2014.flatMap((entry) => entry.variants.map((variant) => variant.key)));

    expect(races.filter((entry) => !raceKeys.has(entry.key)).map((entry) => entry.key)).toEqual([]);
    expect(subraces.filter((entry) => !subraceKeys.has(entry.key)).map((entry) => entry.key)).toEqual([]);
    expect(variants.filter((entry) => !variantKeys.has(entry.key)).map((entry) => entry.key)).toEqual([]);
    expect([...findDuplicateKeys(races), ...findDuplicateKeys(subraces), ...findDuplicateKeys(variants)]).toEqual([]);
  });

  it("пише прозу лише для підкласів 2014 каталогу, без повторів", () => {
    const subclassKeys = new Set(
      classesCatalog.filter((entry) => entry.ruleset === "RULES_2014").flatMap((entry) => entry.subclasses.map((subclass) => subclass.key)),
    );

    expect(subclasses.filter((entry) => !subclassKeys.has(entry.key)).map((entry) => entry.key)).toEqual([]);
    expect(findDuplicateKeys(subclasses)).toEqual([]);
  });

  it("не лишає жодного підкласу без опису ні в сіді 2014, ні в каталозі обох редакцій", () => {
    const seedWithoutDescription = readSubclassSeedInputs().filter((input) => !input.description).map((input) => input.name);
    const catalogSubclasses = classesCatalog.flatMap((entry) =>
      entry.subclasses.map((subclass: { description: string | null; legacy?: boolean }) => ({ ...subclass, ruleset: entry.ruleset })),
    );
    const countDescribed = (ruleset: string) =>
      catalogSubclasses.filter((subclass) => subclass.ruleset === ruleset && !subclass.legacy && subclass.description).length;
    const legacy = catalogSubclasses.filter((subclass) => subclass.legacy);

    expect(seedWithoutDescription).toEqual([]);
    expect([countDescribed("RULES_2014"), countDescribed("RULES_2024")]).toEqual([SUBCLASSES_2014, SUBCLASSES_2024]);
    expect(legacy).toHaveLength(LEGACY_SUBCLASSES_2024.length);
    expect(legacy.filter((subclass) => !subclass.description)).toEqual([]);
  });

  it("тримає храповик покриття рас, підрас, варіантів і звірених підкласів", () => {
    expect(races).toHaveLength(EXPECTED_RACES_WITH_PROSE);
    expect(subraces).toHaveLength(EXPECTED_SUBRACES_WITH_PROSE);
    expect(variants).toHaveLength(EXPECTED_VARIANTS_WITH_PROSE);
    expect(subclasses).toHaveLength(EXPECTED_SUBCLASSES_RECONCILED);
  });

  it("не має порожньої прози, знятих форм і незакритих маркерів", () => {
    const entries = [...classes, ...races, ...subraces, ...variants, ...subclasses].map((entry) => ({ name: entry.key, prose: entry.description }));

    expect(findProseProblems(entries)).toEqual([]);
  });

  it("тримається мірки коротким описом", () => {
    expect([
      ...findWordCountOutliers(classes, MIN_ARTICLE_WORDS, MAX_ARTICLE_WORDS),
      ...findWordCountOutliers(races, MIN_RACE_WORDS, MAX_ARTICLE_WORDS),
      ...findWordCountOutliers([...subraces, ...variants], MIN_SUBRACE_WORDS, MAX_SUBRACE_WORDS),
      ...findWordCountOutliers(subclasses, MIN_SUBCLASS_WORDS, MAX_SUBCLASS_WORDS),
    ]).toEqual([]);
  });
});
