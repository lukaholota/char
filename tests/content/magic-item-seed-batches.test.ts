import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ItemRarity, MagicItemType, Prisma } from "@prisma/client";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import {
  applyBatchesToBaseline,
  readMagicItemBatches,
  COVERED_BY_EXISTING_ENTRIES,
  SOURCE_ITEM_TYPE_OVERRIDES,
} from "../../prisma/seed/magicItemBatches";

const batches = readMagicItemBatches();

function buildBaseline(
  rows: Array<Partial<Prisma.MagicItemUncheckedCreateInput>>
): Prisma.MagicItemUncheckedCreateInput[] {
  return rows.map((row) => ({
    magicItemId: 1,
    engName: "X",
    name: "Х [X]",
    itemType: MagicItemType.WONDROUS_ITEM,
    rarity: ItemRarity.COMMON,
    requiresAttunement: false,
    description: "опис",
    ...row,
  }));
}

describe("KR14.1 — партії перекладу предметів живуть у сідах", () => {
  it("сід-партії покривають кожен перекладений слуг маніфесту рівно раз", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "data/aidedd/magic-items-manifest.json"), "utf-8")
    ) as Array<{ slug: string; status: string }>;

    const translatedSlugs = manifest.filter((row) => row.status === "translated").map((row) => row.slug);
    const covered = Object.keys(COVERED_BY_EXISTING_ENTRIES);
    const expected = translatedSlugs.filter((slug) => !covered.includes(slug)).sort();

    expect(batches.map((row) => row.slug).sort()).toEqual(expected);
  });

  it("жоден предмет не трапляється у двох партіях", () => {
    expect(new Set(batches.map((row) => row.engName)).size).toBe(batches.length);
    expect(new Set(batches.map((row) => row.magicItemId)).size).toBe(batches.length);
  });

  it("кожен запис партії має валідні тип, рідкість і непорожній опис", () => {
    for (const row of batches) {
      expect(MagicItemType[row.itemType as MagicItemType], row.slug).toBeDefined();
      expect(ItemRarity[row.rarity as ItemRarity], row.slug).toBeDefined();
      expect(row.description.trim().length, row.slug).toBeGreaterThan(10);
      expect(row.name, row.slug).toMatch(/\[.+\]/);
    }
  });

  /// Каталог росте тільки свідомо: цей перелік доводиться правити руками, і саме тому
  /// новий предмет не може заїхати в каталог непоміченим разом із партією перекладу.
  it("каталог росте лише на поіменно дозволені предмети", () => {
    const added = batches.filter((row) => row.isNewToCatalog);
    expect(added.map((row) => `${row.magicItemId} ${row.engName}`)).toEqual([
      "1304 Unbreakable Arrow",
      "1331 Psi Crystal",
      "1391 Arrow of Slaying",
    ]);
  });

  it("злиті слуги не створюють зайвого запису — кожен покритий наявними варіантами", () => {
    expect(COVERED_BY_EXISTING_ENTRIES).toEqual({
      "ammunition-1-2-or-3": ["Ammunition +1", "Ammunition +2", "Ammunition +3"],
      "armor-1-2-or-3": ["Armor +1", "Armor +2", "Armor +3"],
      "rod-of-the-pact-keeper": [
        "Rod of the Pact Keeper +1",
        "Rod of the Pact Keeper +2",
        "Rod of the Pact Keeper +3",
      ],
      "quaal-s-feather-token": [
        "Quaal's Feather Token (Anchor)",
        "Quaal's Feather Token (Bird)",
        "Quaal's Feather Token (Fan)",
        "Quaal's Feather Token (Swan Boat)",
        "Quaal's Feather Token (Tree)",
        "Quaal's Feather Token (Whip)",
      ],
      "ring-of-poison-resistance": ["Ring of Resistance"],
      "shield-1-2-or-3": ["Shield +1", "Shield +2", "Shield +3"],
      "weapon-1-2-or-3": ["Weapon +1", "Weapon +2", "Weapon +3"],
      "wand-of-the-war-mage-1-2-or-3": [
        "Wand of the War Mage +1",
        "Wand of the War Mage +2",
        "Wand of the War Mage +3",
      ],
      "belt-of-giant-strength": [
        "Belt of Hill Giant Strength",
        "Belt of Stone Giant Strength",
        "Belt of Frost Giant Strength",
        "Belt of Fire Giant Strength",
        "Belt of Cloud Giant Strength",
        "Belt of Storm Giant Strength",
      ],
      "instrument-of-the-bards": [
        "Instrument of the Bards (Anstruth Harp)",
        "Instrument of the Bards (Canaith Mandolin)",
        "Instrument of the Bards (Cli Lyre)",
        "Instrument of the Bards (Doss Lute)",
        "Instrument of the Bards (Fochlucan Bandore)",
        "Instrument of the Bards (Mac-Fuirmidh Cittern)",
        "Instrument of the Bards (Ollamh Harp)",
      ],
      "ioun-stone": [
        "Ioun Stone (Absorption)",
        "Ioun Stone (Agility)",
        "Ioun Stone (Awareness)",
        "Ioun Stone (Fortitude)",
        "Ioun Stone (Greater Absorption)",
        "Ioun Stone (Insight)",
        "Ioun Stone (Intellect)",
        "Ioun Stone (Leadership)",
        "Ioun Stone (Mastery)",
        "Ioun Stone (Protection)",
        "Ioun Stone (Regeneration)",
        "Ioun Stone (Reserve)",
        "Ioun Stone (Strength)",
        "Ioun Stone (Sustenance)",
      ],
      "potion-of-giant-strength": [
        "Potion of Giant Strength (Hill)",
        "Potion of Giant Strength (Frost Giant)",
        "Potion of Giant Strength (Stone Giant)",
        "Potion of Giant Strength (Fire Giant)",
        "Potion of Giant Strength (Cloud Giant)",
        "Potion of Giant Strength (Storm Giant)",
      ],
      "potion-of-healing": [
        "Potion of Healing",
        "Potion of Greater Healing",
        "Potion of Superior Healing",
        "Potion of Supreme Healing",
      ],
      "spell-scroll": [
        "Spell Scroll (Cantrip)",
        "Spell Scroll (Level 1)",
        "Spell Scroll (Level 2)",
        "Spell Scroll (Level 3)",
        "Spell Scroll (Level 4)",
        "Spell Scroll (Level 5)",
        "Spell Scroll (Level 6)",
        "Spell Scroll (Level 7)",
        "Spell Scroll (Level 8)",
        "Spell Scroll (Level 9)",
      ],
    });
    for (const slug of Object.keys(COVERED_BY_EXISTING_ENTRIES)) {
      expect(batches.some((row) => row.slug === slug), slug).toBe(false);
    }
  });

  /// Джерело помиляється рідко, але помиляється: перелік його спростувань теж правиться руками.
  it("тип предмета перебиває джерело лише для поіменно названих сторінок", () => {
    expect(SOURCE_ITEM_TYPE_OVERRIDES).toEqual({ "sword-of-kas": "WEAPON" });

    const kas = batches.find((row) => row.slug === "sword-of-kas");
    expect(kas?.itemType).toBe("WEAPON");
  });

  it("накладання зберігає колонки, яких партія не називає", () => {
    const baseline = buildBaseline([
      { magicItemId: 24, engName: "Cloak of Protection", bonusToAC: 1, description: "старий опис" },
    ]);
    const batch = batches.find((row) => row.engName === "Cloak of Protection");
    expect(batch).toBeDefined();

    const { items } = applyBatchesToBaseline(baseline, [batch!]);

    expect(items[0].bonusToAC).toBe(1);
    expect(items[0].description).toBe(batch!.description);
  });

  it("накладання падає, якщо партія перенумеровує предмет", () => {
    const baseline = buildBaseline([{ magicItemId: 999, engName: "Cloak of Protection" }]);
    const batch = batches.find((row) => row.engName === "Cloak of Protection")!;

    expect(() => applyBatchesToBaseline(baseline, [batch])).toThrow(/публічна адреса/);
  });

  it("поверх базового корпусу додається рівно те, що позначене новим, решта оновлюється", () => {
    const baseline = readMagicItemBaseline();
    const baselineEngNames = baseline.map((row) => row.engName);

    const { updated, added } = applyBatchesToBaseline(baseline, batches);
    const newToCatalog = batches.filter((row) => row.isNewToCatalog);

    expect(added).toBe(newToCatalog.length);
    expect(updated).toBe(batches.length - newToCatalog.length);
    for (const row of newToCatalog) {
      expect(baselineEngNames.includes(row.engName), row.engName).toBe(false);
    }
  });
});
