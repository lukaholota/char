/**
 * KR31.3 — наскрізний доказ Героїчного натхнення 2024: Людина дістає його після довгого
 * відпочинку через рису «Винахідливість», витрачає з листа й лишається без нього; не-людина
 * після того самого відпочинку його не дістає, але може ввімкнути руками — його дає й майстер.
 * Зі стаканням (рішення власника 2026-09-13) кожен відпочинок Людини додає ще одне.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { classByName, backgroundByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";
import type { Races } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { setCanStackHeroicInspiration, setHeroicInspirationCount } from "@/lib/actions/combat-actions";
import { longRest } from "@/server/db/rest-actions";
import { listFeaturesGrantingHeroicInspirationOnLongRest } from "@/rules/heroic-inspiration";

const EMAIL = "heroic-inspiration-2024@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createSpeciesCharacter(raceName: Races) {
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
      level: 1,
      currentHp: 12,
      maxHp: 12,
      str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 14,
    },
  });

  await grantSpeciesTraits(pers.persId, race.raceId);

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers.persId;
}

/// Лист і відпочинок читають риси з рядків `pers_feature`, тож фікстура повторює те, що робить
/// створення персонажа.
async function grantSpeciesTraits(persId: number, raceId: number) {
  const traits = await prisma.raceTrait.findMany({ where: { raceId }, select: { featureId: true } });

  await prisma.persFeature.createMany({
    data: traits.map((trait) => ({ persId, featureId: trait.featureId, usesRemaining: null })),
    skipDuplicates: true,
  });
}

async function findHeroicInspirationCount(persId: number) {
  const row = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { heroicInspirationCount: true } });
  return row.heroicInspirationCount;
}

describe("Героїчне натхнення 2024 на живому персонажі", () => {
  it("носій реєстру існує в базі як риса виду", async () => {
    for (const engName of listFeaturesGrantingHeroicInspirationOnLongRest()) {
      const feature = await prisma.feature.findFirst({ where: { engName }, select: { raceTraits: { select: { raceId: true } } } });
      expect(feature, engName).not.toBeNull();
      expect(feature?.raceTraits.length, engName).toBeGreaterThan(0);
    }
  });

  it("людина дістає натхнення після довгого відпочинку, витрачає його й лишається без нього", async () => {
    const persId = await createSpeciesCharacter("HUMAN_2024");
    expect(await findHeroicInspirationCount(persId)).toBe(0);

    const rested = await longRest(persId);
    expect(rested).toMatchObject({ success: true });
    expect(await findHeroicInspirationCount(persId)).toBe(1);

    expect(await longRest(persId)).toMatchObject({ success: true });
    expect(await findHeroicInspirationCount(persId)).toBe(1);

    expect(await setHeroicInspirationCount({ persId, heroicInspirationCount: 0 })).toEqual({
      success: true,
      heroicInspirationCount: 0,
      canStackHeroicInspiration: false,
    });
    expect(await findHeroicInspirationCount(persId)).toBe(0);

    expect(await longRest(persId)).toMatchObject({ success: true });
    expect(await findHeroicInspirationCount(persId)).toBe(1);
  });

  it("не-людина після того самого відпочинку натхнення не дістає, але може ввімкнути руками", async () => {
    const persId = await createSpeciesCharacter("ORC_2024");

    expect(await longRest(persId)).toMatchObject({ success: true });
    expect(await findHeroicInspirationCount(persId)).toBe(0);

    expect(await setHeroicInspirationCount({ persId, heroicInspirationCount: 5 })).toMatchObject({ success: true, heroicInspirationCount: 1 });

    // Відпочинок натхнення не забирає: у книги немає терміну дії.
    expect(await longRest(persId)).toMatchObject({ success: true });
    expect(await findHeroicInspirationCount(persId)).toBe(1);
  });

  it("чужому персонажу натхнення не перемкнути", async () => {
    const persId = await createSpeciesCharacter("HUMAN_2024");
    vi.mocked(auth).mockResolvedValue({ user: { email: "stranger@test.local" } } as never);

    const result = await setHeroicInspirationCount({ persId, heroicInspirationCount: 1 });
    expect(result.success).toBe(false);
    expect((await setCanStackHeroicInspiration({ persId, canStackHeroicInspiration: true })).success).toBe(false);
    expect(await findHeroicInspirationCount(persId)).toBe(0);
  });

  it("зі стаканням людина накопичує по одному за відпочинок, а вимкнення лишає одне", async () => {
    const persId = await createSpeciesCharacter("HUMAN_2024");
    expect(await setCanStackHeroicInspiration({ persId, canStackHeroicInspiration: true })).toMatchObject({ success: true });

    await longRest(persId);
    await longRest(persId);
    expect(await findHeroicInspirationCount(persId)).toBe(2);

    expect(await setHeroicInspirationCount({ persId, heroicInspirationCount: 5 })).toMatchObject({ heroicInspirationCount: 5 });
    await longRest(persId);
    expect(await findHeroicInspirationCount(persId)).toBe(6);

    expect(await setCanStackHeroicInspiration({ persId, canStackHeroicInspiration: false })).toEqual({
      success: true,
      heroicInspirationCount: 1,
      canStackHeroicInspiration: false,
    });
  });
});
