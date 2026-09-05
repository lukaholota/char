/**
 * KR12.5 — каталог магічних предметів 2024 у базі, а не лише у файлі.
 *
 * До 2026-08-29 `magic_item` не мав жодного рядка RULES_2024, тобто персонаж 2024 бачив у
 * каталозі 445 предметів і не міг вдягнути жодного: `pers_magic_item.magic_item_id` — це FK.
 * Тест бʼє по `spells_test`, бо файловий тест такої діри не бачить — прямий урок O13.
 *
 * Головне тут — не кількості, а [Р28]: сід доливає й оновлює, і ніколи не видаляє.
 */

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildMagicItemCorpus2024, seedMagicItems2024 } from "../../prisma/seed/magicItemSeed2024";
import { RESERVED_2024_ID_BASE } from "../../prisma/seed/magicItemIds";
import { disconnectDatabase, resetUserData } from "../user-data";

const catalog = buildMagicItemCorpus2024();

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function findSeededItems() {
  return prisma.magicItem.findMany({
    where: { ruleset: "RULES_2024" },
    orderBy: { magicItemId: "asc" },
    select: {
      magicItemId: true,
      engName: true,
      name: true,
      itemType: true,
      rarity: true,
      requiresAttunement: true,
      description: true,
      shortDescription: true,
    },
  });
}

async function createCharacterWearing(magicItemId: number) {
  const [characterClass, race, background] = await Promise.all([
    prisma.class.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    prisma.race.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
    prisma.background.findFirstOrThrow({ where: { ruleset: "RULES_2024" } }),
  ]);

  const user = await prisma.user.create({
    data: { email: "magic-items-2024@example.test", name: "Тестовий гравець" },
  });

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Персонаж із предметом 2024",
      ruleset: "RULES_2024",
      classId: characterClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp: 24,
      maxHp: 24,
      str: 12,
      dex: 14,
      con: 13,
      int: 10,
      wis: 11,
      cha: 8,
    },
  });

  const link = await prisma.persMagicItem.create({
    data: { persId: pers.persId, magicItemId, isEquipped: true, isAttuned: false },
  });

  return { pers, link };
}

describe("каталог магічних предметів 2024 у базі", () => {
  it("у базі стоїть увесь каталог 2024 — поіменно й тими самими id", async () => {
    const seeded = await findSeededItems();

    expect(seeded.length).toBe(catalog.length);
    expect(seeded.map((item) => item.engName).sort()).toEqual(catalog.map((item) => item.engName).sort());
    expect(seeded.map((item) => item.magicItemId).sort((a, b) => a - b)).toEqual(
      catalog.map((item) => item.magicItemId).sort((a, b) => a - b),
    );
  });

  it("кожен рядок 2024 стоїть у базі текстом свого файла", async () => {
    const byEngName = new Map((await findSeededItems()).map((item) => [item.engName, item]));
    const mismatched: string[] = [];

    for (const row of catalog) {
      const item = byEngName.get(row.engName);
      if (!item) {
        mismatched.push(`${row.engName}: у базі немає`);
        continue;
      }
      const differences = [
        item.magicItemId === row.magicItemId ? null : "magicItemId",
        item.name === row.name ? null : "name",
        item.itemType === row.itemType ? null : "itemType",
        item.rarity === row.rarity ? null : "rarity",
        item.requiresAttunement === row.requiresAttunement ? null : "requiresAttunement",
        item.description === row.description ? null : "description",
        (item.shortDescription ?? null) === row.shortDescription ? null : "shortDescription",
      ].filter(Boolean);

      if (differences.length > 0) mismatched.push(`${row.engName}: ${differences.join(", ")}`);
    }

    expect(mismatched).toEqual([]);
  });

  /// Блок id розводить редакції фізично: предмет 2024 не може сісти на id предмета 2014 і
  /// перевісити чужу річ на персонажі.
  it("жоден предмет 2024 не заходить у блок id редакції 2014", async () => {
    const intruders = (await findSeededItems())
      .filter((item) => item.magicItemId <= RESERVED_2024_ID_BASE)
      .map((item) => `${item.magicItemId} ${item.engName}`);

    expect(intruders).toEqual([]);
  });
});

describe("сід предметів 2024 не чіпає речі персонажів ([Р28])", () => {
  /// Ось гейт, заради якого написаний файл. Перезасів каталогу — знищення даних користувача:
  /// у проді `pers` це 8 344 реальні персонажі, а `pers_magic_item` посилається на `magic_item`.
  it("предмет, вдягнений персонажем, переживає прогін сіду", async () => {
    const worn = catalog[0];
    const { pers, link } = await createCharacterWearing(worn.magicItemId);

    const linksBefore = await prisma.persMagicItem.count();
    const itemsBefore = await prisma.magicItem.count();

    const report = await seedMagicItems2024(prisma);

    /// `created: 0` — це і є доказ, що нічого не видалялося: видалений рядок довелося б
    /// створювати заново. FK ловить лише знесення вдягненого предмета; чистку «зайвих»
    /// рядків, яких ніхто не носить, RESTRICT пропускає, а ця перевірка — ні.
    expect(report.created).toBe(0);
    expect(await prisma.persMagicItem.count()).toBe(linksBefore);
    expect(await prisma.magicItem.count()).toBe(itemsBefore);
    expect(await prisma.magicItem.count({ where: { ruleset: "RULES_2024" } })).toBe(catalog.length);

    const survived = await prisma.persMagicItem.findUnique({
      where: { persMagicItemId: link.persMagicItemId },
      select: { persId: true, magicItemId: true, isEquipped: true },
    });
    expect(survived).toEqual({ persId: pers.persId, magicItemId: worn.magicItemId, isEquipped: true });

    const item = await prisma.magicItem.findFirst({
      where: { magicItemId: worn.magicItemId },
      select: { engName: true, ruleset: true },
    });
    expect(item).toEqual({ engName: worn.engName, ruleset: "RULES_2024" });
  });

  it("другий прогін поспіль не робить жодного запису", async () => {
    await seedMagicItems2024(prisma);
    const report = await seedMagicItems2024(prisma);

    expect(report).toEqual({ created: 0, updated: 0, unchanged: catalog.length });
  });

  it("відсутній рядок доливається назад із тим самим id", async () => {
    const restored = catalog.at(-1)!;
    await prisma.magicItem.deleteMany({ where: { engName: restored.engName, ruleset: "RULES_2024" } });

    const report = await seedMagicItems2024(prisma);

    expect(report.created).toBe(1);
    const item = await prisma.magicItem.findFirst({
      where: { engName: restored.engName, ruleset: "RULES_2024" },
      select: { magicItemId: true },
    });
    expect(item?.magicItemId).toBe(restored.magicItemId);
  });
});
