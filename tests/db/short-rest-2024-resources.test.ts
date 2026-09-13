/**
 * KR31.3 — наскрізний доказ, якого не було: персонаж 2024 бачить ресурс, витрачає його
 * й на короткому відпочинку отримує назад рівно стільки, скільки каже книга.
 *
 * Гілку «повертається одне використання» написали 2026-09-06, але довести її на живому
 * персонажі було нічим: у фіч 2024 не було чисел. Тепер числа є, і перевіряються обидві петлі
 * `shortRest` — фічі (Лють, Другий подих) і пули (Божественний канал), — плюс носій, якому
 * короткий відпочинок повертає **все** (Зосередження монаха). Інакше «повертає одне» тихо
 * поширилося б на всіх.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { classByName, backgroundByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { spendFeatureUse } from "@/server/db/feature-uses";
import { getCharacterFeaturesGrouped } from "@/server/db/pers-actions";
import { shortRest } from "@/server/db/rest-actions";

const EMAIL = "short-rest-2024@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createCharacter(
  className: Parameters<typeof classByName>[0],
  raceName: Parameters<typeof raceByName>[0],
  ruleset: "RULES_2014" | "RULES_2024",
  level: number,
) {
  const [cls, race, background] = await Promise.all([
    classByName(className),
    raceByName(raceName),
    backgroundByName("ACOLYTE"),
  ]);

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: `Персонаж — ${className}`,
      ruleset,
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level,
      currentHp: 20,
      maxHp: 20,
      str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 14,
    },
  });

  await grantClassFeatures(pers.persId, cls.classId, level);

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers.persId;
}

/**
 * Лист малює риси з рядків `pers_feature`, а не з класових звʼязків, тож фікстура мусить
 * повторити те, що робить створення персонажа: видати кожну класову фічу свого рівня.
 * `usesRemaining: null` означає «повний запас», а не нуль.
 */
async function grantClassFeatures(persId: number, classId: number, level: number) {
  const classFeatures = await prisma.classFeature.findMany({
    where: { classId, levelGranted: { lte: level } },
    select: { featureId: true },
  });

  await prisma.persFeature.createMany({
    data: classFeatures.map((link) => ({ persId, featureId: link.featureId, usesRemaining: null })),
    skipDuplicates: true,
  });
}

const createCharacter2024 = (className: Parameters<typeof classByName>[0], level: number) =>
  createCharacter(className, "HUMAN_2024", "RULES_2024", level);

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

async function restShortly(persId: number) {
  const result = await shortRest(persId, []);
  expect(result.success).toBe(true);
}

async function findFeatureUses(persId: number, featureId: number) {
  const row = await prisma.persFeature.findUniqueOrThrow({ where: { persId_featureId: { persId, featureId } } });
  return row.usesRemaining;
}

/// Те саме джерело, з якого малює секцію «Ресурси класу» `FeaturesSlide`: там ресурсом
/// вважається рядок із `CLASS_RESOURCE` і відомим максимумом.
async function findSheetResource(persId: number, name: string) {
  const grouped = await getCharacterFeaturesGrouped(persId);
  const all = [
    ...(grouped?.actions ?? []),
    ...(grouped?.bonusActions ?? []),
    ...(grouped?.reactions ?? []),
    ...(grouped?.passive ?? []),
  ];
  return all
    .filter((item) => item.displayTypes.includes("CLASS_RESOURCE"))
    .find((item) => item.name === name);
}

async function findPoolUses(persId: number, poolKey: string) {
  const row = await prisma.persResourcePool.findUniqueOrThrow({ where: { persId_poolKey: { persId, poolKey } } });
  return row.usesRemaining;
}

describe("короткий відпочинок персонажа 2024", () => {
  it("варвар 3-го рівня має три люті, витрачає всі й повертає одну", async () => {
    const persId = await createCharacter2024("BARBARIAN_2024", 3);
    const rage = await findFeature("Barbarian: Rage (2024)");

    expect(await findSheetResource(persId, rage.name)).toMatchObject({ usesPer: 3, restType: "SHORT_REST" });
    expect(await spendEverything(persId, rage.featureId, 3)).toEqual([2, 1, 0]);
    expect(await findSheetResource(persId, rage.name)).toMatchObject({ usesRemaining: 0 });

    await restShortly(persId);

    expect(await findFeatureUses(persId, rage.featureId)).toBe(1);
    expect(await findSheetResource(persId, rage.name)).toMatchObject({ usesRemaining: 1 });
  });

  it("воїн 1-го рівня має два Другі подихи, витрачає обидва й повертає один", async () => {
    const persId = await createCharacter2024("FIGHTER_2024", 1);
    const secondWind = await findFeature("Fighter: Second Wind (2024)");

    expect(await spendEverything(persId, secondWind.featureId, 2)).toEqual([1, 0]);

    await restShortly(persId);

    expect(await findFeatureUses(persId, secondWind.featureId)).toBe(1);
  });

  it("клірик 2-го рівня повертає одне використання пулу Божественного каналу", async () => {
    const persId = await createCharacter2024("CLERIC_2024", 2);
    const channelDivinity = await findFeature("Cleric: Channel Divinity (2024)");

    expect(await spendEverything(persId, channelDivinity.featureId, 2)).toEqual([1, 0]);

    await restShortly(persId);

    expect(await findPoolUses(persId, "CHANNEL_DIVINITY")).toBe(1);
  });

  it("монах 5-го рівня повертає всі очки зосередження, а не одне", async () => {
    const persId = await createCharacter2024("MONK_2024", 5);
    const focus = await findFeature("Monk: Monk’s Focus (2024)");

    expect(await spendEverything(persId, focus.featureId, 5)).toEqual([4, 3, 2, 1, 0]);

    await restShortly(persId);

    expect(await findPoolUses(persId, "KI")).toBe(5);
  });
});

/**
 * Максимум із таблиці рівнів на листі — знайдено під час KR31.3 і полагоджено там само.
 * `groupCharacterFeatures` рахував його урізаною копією `calculateMaxUsesForFeature`, яка
 * не знала про `usesCountSpecial: [{lvl, uses}]`, тож фіча без пулу показувала порожній
 * лічильник. Випадок навмисно на **даних 2014**: баг був у обох редакціях, і 2024 його лише
 * виявив.
 */
describe("лист бере максимум із таблиці рівнів", () => {
  it("варвар 2014 3-го рівня бачить три люті", async () => {
    const persId = await createCharacter("BARBARIAN_2014", "HUMAN_2014", "RULES_2014", 3);

    expect(await findSheetResource(persId, "Лють")).toMatchObject({ usesPer: 3, restType: "LONG_REST" });
  });
});
