/**
 * KR31.3 — наскрізний доказ для рис **видів** 2024: персонаж бачить ресурс виду на листі,
 * витрачає його й отримує назад тим відпочинком, який називає книга.
 *
 * Доти всі докази цієї цілі стояли на класових і підкласових фічах. Види йдуть іншим шляхом:
 * `race_trait` замість `class_feature`, бонус майстерності замість таблиці рівнів, і рівень
 * **персонажа** замість рівня класу. Кожна з цих трьох відмінностей могла б зламати ланцюг
 * окремо, і жодна з них не покрита класовими тестами.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { classByName, backgroundByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import type { Races } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { spendFeatureUse } from "@/server/db/feature-uses";
import { getCharacterFeaturesGrouped } from "@/server/db/pers-actions";
import { longRest, shortRest } from "@/server/db/rest-actions";

const EMAIL = "species-resource-2024@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createSpeciesCharacter(raceName: Races, level: number, chosenOptionFeatureEngName?: string) {
  const [cls, race, background] = await Promise.all([
    classByName("FIGHTER_2024"),
    raceByName(raceName),
    backgroundByName("ACOLYTE"),
  ]);

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: `Персонаж — ${raceName}`,
      ruleset: "RULES_2024",
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level,
      currentHp: 20,
      maxHp: 20,
      str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 14,
    },
  });

  await grantSpeciesTraits(pers.persId, race.raceId);
  if (chosenOptionFeatureEngName) await grantChosenOption(pers.persId, chosenOptionFeatureEngName);

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers.persId;
}

/// Вибір виду створення кладе окремим рядком `pers_feature` — саме на ньому тепер лічильник.
async function grantChosenOption(persId: number, featureEngName: string) {
  const feature = await prisma.feature.findFirstOrThrow({ where: { engName: featureEngName } });
  await prisma.persFeature.create({ data: { persId, featureId: feature.featureId, usesRemaining: null } });
}

/**
 * Лист малює риси з рядків `pers_feature`, а не зі звʼязків виду, тож фікстура повторює те, що
 * робить створення персонажа. `usesRemaining: null` означає «повний запас», а не нуль.
 */
async function grantSpeciesTraits(persId: number, raceId: number) {
  const traits = await prisma.raceTrait.findMany({ where: { raceId }, select: { featureId: true } });

  await prisma.persFeature.createMany({
    data: traits.map((trait) => ({ persId, featureId: trait.featureId, usesRemaining: null })),
    skipDuplicates: true,
  });
}

async function findFeature(engName: string) {
  return prisma.feature.findFirstOrThrow({ where: { engName } });
}

async function spendEverything(persId: number, featureId: number, times: number) {
  const spent: Array<number | null> = [];
  for (let attempt = 0; attempt < times; attempt++) {
    const result = await spendFeatureUse({ persId, featureId });
    expect(result.success).toBe(true);
    spent.push((result as { usesRemaining: number | null }).usesRemaining);
  }
  return spent;
}

async function findFeatureUses(persId: number, featureId: number) {
  const row = await prisma.persFeature.findUniqueOrThrow({ where: { persId_featureId: { persId, featureId } } });
  return row.usesRemaining;
}

/// Те саме джерело, з якого малює секцію «Ресурси класу» `FeaturesSlide`.
async function findSheetResource(persId: number, name: string) {
  const grouped = await getCharacterFeaturesGrouped(persId);
  const all = [
    ...(grouped?.actions ?? []),
    ...(grouped?.bonusActions ?? []),
    ...(grouped?.reactions ?? []),
    ...(grouped?.passive ?? []),
  ];
  return all.filter((item) => item.displayTypes.includes("CLASS_RESOURCE")).find((item) => item.name === name);
}

describe("ресурси рис видів 2024 на живому персонажі", () => {
  it("орк 1-го рівня має два Адреналінові ривки за бонусом майстерності й повертає обидва коротким відпочинком", async () => {
    const persId = await createSpeciesCharacter("ORC_2024", 1);
    const rush = await findFeature("Orc: Adrenaline Rush (2024)");

    expect(await findSheetResource(persId, rush.name)).toMatchObject({ usesPer: 2, restType: "SHORT_REST" });
    expect(await spendEverything(persId, rush.featureId, 2)).toEqual([1, 0]);

    expect((await shortRest(persId, [])).success).toBe(true);

    // Книга каже «regain all expended uses», тож правило «повертається одне» сюди не поширюється.
    expect(await findFeatureUses(persId, rush.featureId)).toBe(2);
  });

  it("дворф 5-го рівня має три Камʼяні чуття, і короткий відпочинок їх не повертає — тільки довгий", async () => {
    const persId = await createSpeciesCharacter("DWARF_2024", 5);
    const stonecunning = await findFeature("Dwarf: Stonecunning (2024)");

    expect(await findSheetResource(persId, stonecunning.name)).toMatchObject({ usesPer: 3, restType: "LONG_REST" });
    expect(await spendEverything(persId, stonecunning.featureId, 3)).toEqual([2, 1, 0]);

    expect((await shortRest(persId, [])).success).toBe(true);
    expect(await findFeatureUses(persId, stonecunning.featureId)).toBe(0);

    expect((await longRest(persId)).success).toBe(true);
    expect(await findFeatureUses(persId, stonecunning.featureId)).toBe(3);
  });

  /**
   * Рішення власника 2026-09-08: носій показує стільки безкоштовних застосувань, скільки їх є.
   * На 3-му рівні заклинання родоводу одне, на 5-му — два, і рахуються вони за рівнем
   * **персонажа**, а не класу.
   *
   * Рішення власника 2026-09-20: лічильник стоїть біля **обраного** родоводу, а не біля
   * риси-меню, яка перелічує всі три.
   */
  it("ельф бачить одне безкоштовне застосування обраного родоводу на 3-му рівні й два на 5-му", async () => {
    const atThird = await createSpeciesCharacter("ELF_2024", 3, "Elven Lineage: High Elf (2024)");
    const lineage = await findFeature("Elven Lineage: High Elf (2024)");
    const menu = await findFeature("Elf: Elven Lineage (2024)");

    expect(await findSheetResource(atThird, lineage.name)).toMatchObject({ usesPer: 1, restType: "LONG_REST" });
    expect(await findSheetResource(atThird, menu.name)).toBeUndefined();

    await resetUserData();
    const atFifth = await createSpeciesCharacter("ELF_2024", 5, "Elven Lineage: High Elf (2024)");

    expect(await findSheetResource(atFifth, lineage.name)).toMatchObject({ usesPer: 2, restType: "LONG_REST" });
    expect(await spendEverything(atFifth, lineage.featureId, 2)).toEqual([1, 0]);

    expect((await longRest(atFifth)).success).toBe(true);
    expect(await findFeatureUses(atFifth, lineage.featureId)).toBe(2);
  });

  /**
   * Той самий розкол, що його помітив власник на Голіафі: вибір зберігається окремою фічею, а
   * лічильник стояв на меню з шістьма благословеннями. Голіаф рахує використання бонусом
   * майстерності, тож на 5-му рівні їх три.
   */
  it("голіаф витрачає обране благословення, а не меню з шістьма", async () => {
    const persId = await createSpeciesCharacter("GOLIATH_2024", 5, "Giant Ancestry: Stone's Endurance (2024)");
    const boon = await findFeature("Giant Ancestry: Stone's Endurance (2024)");
    const menu = await findFeature("Goliath: Giant Ancestry (2024)");

    expect(await findSheetResource(persId, boon.name)).toMatchObject({ usesPer: 3, restType: "LONG_REST" });
    expect(await findSheetResource(persId, menu.name)).toBeUndefined();

    expect(await spendEverything(persId, boon.featureId, 3)).toEqual([2, 1, 0]);

    expect((await shortRest(persId, [])).success).toBe(true);
    expect(await findFeatureUses(persId, boon.featureId)).toBe(0);

    expect((await longRest(persId)).success).toBe(true);
    expect(await findFeatureUses(persId, boon.featureId)).toBe(3);
  });
});
