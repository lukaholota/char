/**
 * O38 — стан «риса активна» наскрізь: серверна дія вмикає Лють, лист (той самий калькулятор, що
 * й на сторінці) перераховує навички, відпочинок гасить стан. Числа — з QA-персонажів №006
 * (Людина, Варвар 7, Сила 18) і №004 (Голіаф 5).
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { setFeatureActive, spendFeatureUse } from "@/server/db/feature-uses";
import { getCharacterFeaturesGrouped, getPersById } from "@/server/db/pers-actions";
import { shortRest } from "@/server/db/rest-actions";
import { applyActiveStates } from "@/lib/logic/active-states";
import { calculateFinalAC, calculateFinalSkill, calculateFinalSpeed } from "@/lib/logic/bonus-calculator";

const EMAIL = "feature-states@test.local";

let barbarianId: number;
let goliathId: number;
let rageId: number;
let largeFormId: number;
let berserkerId: number;
let bladesingerId: number;

beforeAll(async () => {
  await resetUserData();
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);

  barbarianId = await createCharacter(user.id, "BARBARIAN_2024", "HUMAN_2024", 7);
  goliathId = await createCharacter(user.id, "SORCERER_2024", "GOLIATH_2024", 5);
  rageId = (await prisma.feature.findUniqueOrThrow({ where: { engName: "Barbarian: Rage (2024)" } })).featureId;
  largeFormId = (await prisma.feature.findUniqueOrThrow({ where: { engName: "Goliath: Large Form (2024)" } })).featureId;
  berserkerId = await createCharacter(user.id, "BARBARIAN_2014", "HUMAN_2014", 3, "RULES_2014", ["Frenzy"]);
  bladesingerId = await createCharacter(user.id, "WIZARD_2014", "HUMAN_2014", 6, "RULES_2014", ["Bladesong"]);
});

afterAll(disconnectDatabase);

async function createCharacter(
  userId: number,
  className: Parameters<typeof classByName>[0],
  raceName: Parameters<typeof raceByName>[0],
  level: number,
  ruleset: "RULES_2014" | "RULES_2024" = "RULES_2024",
  subclassFeatureEngNames: string[] = [],
) {
  const [cls, race, background] = await Promise.all([classByName(className), raceByName(raceName), backgroundByName("ACOLYTE")]);
  const pers = await prisma.pers.create({
    data: {
      userId,
      name: `O38 — ${className}`,
      ruleset,
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level,
      currentHp: 40,
      maxHp: 40,
      str: 18, dex: 14, con: 16, int: raceName === "HUMAN_2014" ? 18 : 8, wis: 12, cha: 10,
      skills: {
        create: [
          { skillId: 1, name: Skills.ATHLETICS, proficiencyType: "PROFICIENT" },
          { skillId: 12, name: Skills.PERCEPTION, proficiencyType: "PROFICIENT" },
        ],
      },
    },
  });

  const classFeatures = await prisma.classFeature.findMany({
    where: { classId: cls.classId, levelGranted: { lte: level } },
    select: { featureId: true },
  });
  const subclassFeatures = await prisma.feature.findMany({ where: { engName: { in: subclassFeatureEngNames } }, select: { featureId: true } });
  await prisma.persFeature.createMany({
    data: [...classFeatures, ...subclassFeatures].map(({ featureId }) => ({ persId: pers.persId, featureId })),
  });
  return pers.persId;
}

async function loadSheetPers(persId: number) {
  const pers = await getPersById(persId);
  if (!pers) throw new Error(`Персонажа ${persId} немає`);
  return applyActiveStates(pers);
}

async function findSkillTotals(persId: number) {
  const pers = await loadSheetPers(persId);
  return [Skills.PERCEPTION, Skills.STEALTH, Skills.ATHLETICS].map((skill) => calculateFinalSkill(pers, skill).total);
}

async function findRageUses(persId: number) {
  const row = await prisma.persFeature.findUniqueOrThrow({ where: { persId_featureId: { persId, featureId: rageId } } });
  return row.usesRemaining;
}

describe("O38 — Лють варвара 2024 (№006)", () => {
  it("без Люті навички звичайні: Сприйняття +4, Непомітність +2, Атлетика +7", async () => {
    expect(await findSkillTotals(barbarianId)).toEqual([4, 2, 7]);
  });

  it("увімкнення списує одне використання з чотирьох і дає Силу навичкам Первісного знання", async () => {
    const result = await setFeatureActive({ persId: barbarianId, featureId: rageId, isActive: true });

    expect(result).toEqual({ success: true, isActive: true, usesRemaining: 3 });
    expect(await findSkillTotals(barbarianId)).toEqual([7, 4, 7]);
  });

  it("повторне увімкнення нічого не списує, а лист бачить стан на рисі", async () => {
    await setFeatureActive({ persId: barbarianId, featureId: rageId, isActive: true });
    expect(await findRageUses(barbarianId)).toBe(3);

    const grouped = await getCharacterFeaturesGrouped(barbarianId);
    const rage = [...(grouped?.actions ?? []), ...(grouped?.bonusActions ?? []), ...(grouped?.passive ?? [])].find(
      (item) => item.featureId === rageId,
    );
    expect(rage?.isActive).toBe(true);
  });

  it("короткий відпочинок гасить Лють", async () => {
    expect((await shortRest(barbarianId, [])).success).toBe(true);

    expect(await findSkillTotals(barbarianId)).toEqual([4, 2, 7]);
  });

  it("без використань Лють не вмикається", async () => {
    let remaining = await findRageUses(barbarianId);
    while ((remaining ?? 0) > 0) {
      await spendFeatureUse({ persId: barbarianId, featureId: rageId });
      remaining = await findRageUses(barbarianId);
    }

    const result = await setFeatureActive({ persId: barbarianId, featureId: rageId, isActive: true });
    expect(result).toEqual({ success: false, error: "Використань не лишилося" });
    expect(await findSkillTotals(barbarianId)).toEqual([4, 2, 7]);
  });

  it("риса без стану перемикача не має", async () => {
    const reckless = await prisma.feature.findUniqueOrThrow({ where: { engName: "Barbarian: Reckless Attack (2024)" } });
    const result = await setFeatureActive({ persId: barbarianId, featureId: reckless.featureId, isActive: true });
    expect(result).toEqual({ success: false, error: "Ця риса не має стану" });
  });
});

describe("O38 — Велика форма Голіафа 5 (№004)", () => {
  it("риса виду без рядка pers_feature вмикається, і швидкість стає 45", async () => {
    expect(calculateFinalSpeed(await loadSheetPers(goliathId))).toBe(35);

    const result = await setFeatureActive({ persId: goliathId, featureId: largeFormId, isActive: true });

    expect(result).toEqual({ success: true, isActive: true, usesRemaining: 0 });
    expect(calculateFinalSpeed(await loadSheetPers(goliathId))).toBe(45);
  });

  it("вимкнення повертає швидкість 35 і використання не повертає", async () => {
    await setFeatureActive({ persId: goliathId, featureId: largeFormId, isActive: false });

    expect(calculateFinalSpeed(await loadSheetPers(goliathId))).toBe(35);
    const row = await prisma.persFeature.findUniqueOrThrow({ where: { persId_featureId: { persId: goliathId, featureId: largeFormId } } });
    expect(row.usesRemaining).toBe(0);
  });
});

async function findFeatureId(engName: string) {
  return (await prisma.feature.findUniqueOrThrow({ where: { engName } })).featureId;
}

async function isActiveOn(persId: number, featureId: number) {
  const row = await prisma.persFeature.findUniqueOrThrow({ where: { persId_featureId: { persId, featureId } } });
  return row.isActive;
}

describe("O38 — Шаленство 2014", () => {
  it("без Люті не вмикається", async () => {
    const frenzyId = await findFeatureId("Frenzy");
    const result = await setFeatureActive({ persId: berserkerId, featureId: frenzyId, isActive: true });

    expect(result).toEqual({ success: false, error: "Ця риса діє лише разом з іншим станом — спершу увімкни його" });
  });

  it("вмикається поверх Люті й гасне разом із нею", async () => {
    const [rage2014Id, frenzyId] = await Promise.all([findFeatureId("Rage"), findFeatureId("Frenzy")]);

    expect((await setFeatureActive({ persId: berserkerId, featureId: rage2014Id, isActive: true })).success).toBe(true);
    expect(await setFeatureActive({ persId: berserkerId, featureId: frenzyId, isActive: true })).toEqual({
      success: true,
      isActive: true,
      usesRemaining: null,
    });

    await setFeatureActive({ persId: berserkerId, featureId: rage2014Id, isActive: false });
    expect(await isActiveOn(berserkerId, frenzyId)).toBe(false);
  });
});

describe("O38 — Пісня клинка 2014 (чарівник 6, Інтелект 18)", () => {
  it("вмикання списує одне з трьох використань (бонус майстерності) і дає +4 КБ та швидкість +10", async () => {
    const bladesongId = await findFeatureId("Bladesong");
    const before = await loadSheetPers(bladesingerId);

    const result = await setFeatureActive({ persId: bladesingerId, featureId: bladesongId, isActive: true });
    const after = await loadSheetPers(bladesingerId);

    expect(result).toEqual({ success: true, isActive: true, usesRemaining: 2 });
    expect(calculateFinalAC(after) - calculateFinalAC(before)).toBe(4);
    expect(calculateFinalSpeed(after) - calculateFinalSpeed(before)).toBe(10);
  });
});
