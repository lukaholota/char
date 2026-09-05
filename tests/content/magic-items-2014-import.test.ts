import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { findEmptyRequiredFields, ParsedMagicItem } from "../../scripts/aidedd/magic-item-schema";
import { parseMagicItem2014, splitMagicItemTypeLine } from "../../scripts/aidedd/parse-magic-item-2014";
import { SOURCE_ITEM_TYPE_OVERRIDES } from "../../prisma/seed/magicItemBatches";
import { findCatalog } from "../../scripts/aidedd/aidedd-catalogs";
import manifest from "../../data/aidedd/magic-items-manifest.json";
import slugList from "../../data/aidedd/lists/magic-items-2014.json";

/// Сторінки лежать у tests/fixtures, а не в data/aidedd/raw: сирий кеш у .gitignore і його
/// зносить будь-яке перекачування, а тест має бути відтворюваним на свіжому клоні.
const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/aidedd/magic-items-2014");

function readFixture(slug: string): ParsedMagicItem {
  return parseMagicItem2014(readFileSync(join(FIXTURE_DIR, `${slug}.html`), "utf-8"), slug);
}

const FIXTURE_SLUGS = [
  "blackrazor",
  "weapon-1-2-or-3",
  "belt-of-giant-strength",
  "ersatz-eye",
  "bag-of-tricks",
  "wave",
  "sword-of-kas",
  "deck-of-illusions",
];

describe("KR14.2 — парсер сторінки предмета aidedd", () => {
  it("читає назву, тип, підтип, рідкість, умову налаштування і джерело", () => {
    const item = readFixture("blackrazor");

    expect(item.nameEng).toBe("Blackrazor");
    expect(item.itemType).toBe("WEAPON");
    expect(item.itemSubtypeEng).toBe("greats word");
    expect(item.rarity).toBe("LEGENDARY");
    expect(item.requiresAttunement).toBe(true);
    expect(item.attunementConditionEng).toBe("by a creature of non-lawful alignment");
    expect(item.source).toBe("Dungeon Master´s Guide");
    expect(findEmptyRequiredFields(item)).toEqual([]);
  });

  it("розкладає рядок з трьома рідкостями і позначає сторінку як бандл варіантів", () => {
    const item = readFixture("weapon-1-2-or-3");

    expect(item.typeLineEng).toBe("Weapon (any), uncommon (+1) rare (+2) or very rare (+3)");
    expect(item.rarityVariantsEng).toEqual(["UNCOMMON", "RARE", "VERY_RARE"]);
    expect(item.rarity).toBe("UNCOMMON");
    expect(item.bundlesMultipleVariants).toBe(true);
    expect(item.requiresAttunement).toBe(false);
  });

  it("«rarity varies» лишає рідкість порожньою замість вгадування", () => {
    const item = readFixture("belt-of-giant-strength");

    expect(item.rarityVariesEng).toBe(true);
    expect(item.rarity).toBe("");
    expect(item.rarityVariantsEng).toEqual([]);
    expect(item.bundlesMultipleVariants).toBe(true);
    expect(findEmptyRequiredFields(item)).toEqual(["rarity"]);
  });

  it("таблиці стають GFM-таблицями всередині опису", () => {
    const item = readFixture("belt-of-giant-strength");

    expect(item.tables).toHaveLength(1);
    expect(item.tables[0].headers).toEqual(["Type", "Strength", "Rarity"]);
    expect(item.tables[0].rows).toHaveLength(5);
    expect(item.descriptionEng).toContain("| Type | Strength | Rarity |");
    expect(item.descriptionEng).toContain("| --- | --- | --- |");
    expect(item.descriptionEng).toContain("| Hill giant | 21 | Rare |");
  });

  it("три таблиці однієї сторінки не зливаються в одну", () => {
    const item = readFixture("bag-of-tricks");

    expect(item.tables).toHaveLength(3);
    expect(item.tables.map((table) => table.rows.length)).toEqual([8, 8, 8]);
    expect(item.tables.every((table) => table.headers.join("|") === "d8|Creature")).toBe(true);
    expect(item.descriptionEng.match(/\| d8 \| Creature \|/g)).toHaveLength(3);
  });

  it("порожні клітинки-роздільники лишаються рядками таблиці, а не зʼїдаються", () => {
    const item = readFixture("deck-of-illusions");

    expect(item.tables).toHaveLength(1);
    expect(item.tables[0].rows).toHaveLength(37);
    expect(item.tables[0].rows.filter((row) => row.join("") === "")).toHaveLength(4);
    expect(item.descriptionEng).toContain("| Two of hearts | Goblin |");
  });

  it("сторінка без тексту правил позначається як резюме, а не приймається за опис", () => {
    const item = readFixture("ersatz-eye");

    expect(item.isSummaryOnly).toBe(true);
    expect(item.descriptionEng).toBe("This artificial eye replaces a real one that was lost or removed.");
    expect(item.rarity).toBe("COMMON");
    expect(item.requiresAttunement).toBe(true);
  });

  it("порожнє джерело `wave` лишається порожнім і потрапляє в перелік порожніх полів", () => {
    const item = readFixture("wave");

    expect(item.source).toBe("");
    expect(findEmptyRequiredFields(item)).toEqual(["source"]);
    expect(item.attunementConditionEng).toBe("by a creature that worships a god of the sea");
  });

  it("парсер віддає тип, який написало джерело, і не лагодить його мовчки", () => {
    const item = readFixture("sword-of-kas");

    expect(item.itemType).toBe("WONDROUS_ITEM");
    expect(item.descriptionEng).toContain("magic, sentient longsword");
    expect(SOURCE_ITEM_TYPE_OVERRIDES["sword-of-kas"]).toBe("WEAPON");
  });

  it("в описі не лишається ні тегів, ні HTML-сутностей", () => {
    for (const slug of FIXTURE_SLUGS) {
      const item = readFixture(slug);
      expect(item.descriptionEng).not.toMatch(/<[a-z/][^>]*>/i);
      expect(item.descriptionEng).not.toMatch(/&(?:amp|nbsp|quot|#\d+);/);
      expect(item.descriptionEng.trim()).not.toBe("");
    }
  });
});

describe("KR14.2 — розбір рядка типу", () => {
  it("«very rare» не рахується ще й за «rare»", () => {
    expect(splitMagicItemTypeLine("Wondrous item, very rare").rarityVariantsEng).toEqual(["VERY_RARE"]);
  });

  it("хвіст налаштування відрізається від рідкості", () => {
    const line = splitMagicItemTypeLine("Wondrous item (tattoo), rare (requires attunement by a cleric)");

    expect(line.itemType).toBe("WONDROUS_ITEM");
    expect(line.itemSubtypeEng).toBe("tattoo");
    expect(line.rarity).toBe("RARE");
    expect(line.requiresAttunement).toBe(true);
    expect(line.attunementConditionEng).toBe("by a cleric");
  });

  it("без хвоста налаштування умова порожня, а не вигадана", () => {
    const line = splitMagicItemTypeLine("Potion, uncommon");

    expect(line.itemType).toBe("POTION");
    expect(line.requiresAttunement).toBe(false);
    expect(line.attunementConditionEng).toBe("");
  });

  it("рідкості віддаються від найнижчої, у якому б порядку сторінка їх не написала", () => {
    expect(splitMagicItemTypeLine("Weapon (any), very rare (+3) uncommon (+1) rare (+2)").rarityVariantsEng).toEqual([
      "UNCOMMON",
      "RARE",
      "VERY_RARE",
    ]);
  });
});

describe("KR14.2 — перелік слагів", () => {
  it("каталог очікує рівно стільки слагів, скільки знято з фільтра", () => {
    expect(findCatalog("magic-items-2014").expectedCount).toBe(473);
    expect(slugList.count).toBe(473);
    expect(slugList.slugs).toHaveLength(473);
    expect(new Set(slugList.slugs).size).toBe(473);
  });

  it("кожен слаг переліку доїхав до маніфесту, і навпаки", () => {
    const inManifest = (manifest as Array<{ slug: string }>).map((row) => row.slug).sort();
    expect(inManifest).toEqual([...slugList.slugs].sort());
  });
});

describe("KR14.2 — маніфест імпорту", () => {
  const rows = manifest as Array<{
    slug: string;
    status: string;
    magicItemId: number;
    batch: number;
    isNewToCatalog: boolean;
    isSummaryOnly: boolean;
  }>;

  it("473 рядки: 282 у черзі на переклад, 191 відкладено як резюме", () => {
    expect(rows).toHaveLength(473);
    expect(rows.filter((row) => row.status === "deferred")).toHaveLength(191);
    expect(rows.filter((row) => row.batch !== 0)).toHaveLength(282);
    expect(rows.filter((row) => row.isSummaryOnly && row.batch !== 0)).toHaveLength(0);
  });

  it("id унікальні, а нові не залазять ні в 1…1224, ні в синтетичні 20001+ для 2024", () => {
    expect(new Set(rows.map((row) => row.magicItemId)).size).toBe(rows.length);

    const importedIds = rows.filter((row) => row.isNewToCatalog).map((row) => row.magicItemId);
    expect(importedIds).toHaveLength(163);
    expect(Math.min(...importedIds)).toBeGreaterThan(1224);
    expect(Math.max(...importedIds)).toBeLessThan(20001);
  });

  it("партії по 30, остання неповна", () => {
    const batches = rows.filter((row) => row.batch !== 0);
    const sizes = new Map<number, number>();
    for (const row of batches) sizes.set(row.batch, (sizes.get(row.batch) ?? 0) + 1);

    expect([...sizes.keys()].sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect([...sizes.values()].every((size) => size <= 30)).toBe(true);
  });
});
