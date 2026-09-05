import { describe, it, expect } from "vitest";
import { getAllMagicItems, getMagicItemById } from "@/lib/magicItemsData";
import { MagicItemType, ItemRarity } from "@prisma/client";
import { getMagicItemTypeVisual, getMagicItemRarityBadge } from "@/components/catalogs/catalog-visuals";

const VALID_TYPES = new Set(Object.values(MagicItemType));
const VALID_RARITIES = new Set(Object.values(ItemRarity));

describe("KR9.1 — 2014 Magic Items Catalog Expansion (400+ items)", () => {
  const items2014 = getAllMagicItems("RULES_2014");

  /// Пін стояв на 472 — числі, яке пережило O14 лише в **негітованому**
  /// `src/lib/generated/magicItems.json`; перегенерація 2026-08-26 звела його з базою на 475
  /// ([KR14.5](../../docs/o14-magic-items-aidedd/kr14.5-seed-and-reconciliation.md)).
  /// [KR16.4](../../docs/o16-5etools-canon/kr16.4-magic-items.md) доклав 191 рядок черги —
  /// 146 нових записів і 45 переписаних, — тож 2026-08-27 пін переїхав на 621.
  it("містить понад 400 канонічних магічних предметів для 2014 (621 предмет)", () => {
    expect(items2014.length).toBeGreaterThanOrEqual(400);
    expect(items2014.length).toBe(621);
  });

  it("кожен предмет має унікальний engName та унікальний magicItemId", () => {
    const engNames = new Set<string>();
    const ids = new Set<number>();

    for (const item of items2014) {
      expect(engNames.has(item.engName)).toBe(false);
      engNames.add(item.engName);

      expect(ids.has(item.magicItemId)).toBe(false);
      ids.add(item.magicItemId);
    }
  });

  it("назва кожного предмета містить назву українською та англійську назву в дужках [English Name]", () => {
    for (const item of items2014) {
      expect(item.name).toMatch(/\[.+\]/);
      expect(item.name.length).toBeGreaterThan(3);
    }
  });

  it("усі предмети мають валідні типи (MagicItemType) та рідкості (ItemRarity) з Prisma", () => {
    for (const item of items2014) {
      expect(VALID_TYPES.has(item.itemType)).toBe(true);
      expect(VALID_RARITIES.has(item.rarity)).toBe(true);
      expect(typeof item.requiresAttunement).toBe("boolean");
    }
  });

  it("описи предметів непорожні та не містять специфічних ключових слів 2024 року", () => {
    const forbidden2024Phrases = [
      /Магічн[ао][юїі] ді[єюії]/i,
      /Ді[єюії] [Зз]астосування/i,
      /d20 test/i,
    ];

    for (const item of items2014) {
      expect(item.description.trim().length).toBeGreaterThan(10);

      for (const pattern of forbidden2024Phrases) {
        expect(pattern.test(item.description)).toBe(false);
      }
    }
  });

  it("getMagicItemById знаходить предмети за числовим ID", () => {
    const sample = items2014[0];
    const found = getMagicItemById(sample.magicItemId, "RULES_2014");
    expect(found).toBeDefined();
    expect(found?.engName).toBe(sample.engName);
  });

  it("getMagicItemTypeVisual та getMagicItemRarityBadge коректно повертають візуали для всіх предметів", () => {
    for (const item of items2014) {
      const visual = getMagicItemTypeVisual(item.itemType);
      expect(visual).toBeDefined();
      expect(visual.icon).toBeDefined();
      expect(visual.iconWrap).toBeTruthy();
      expect(visual.iconColor).toBeTruthy();
      expect(visual.badgeClass).toBeTruthy();

      const rarityBadge = getMagicItemRarityBadge(item.rarity);
      expect(rarityBadge).toBeTruthy();
    }
  });
});
