import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../../user-data";
import { minimalForm } from "../../helpers/build-form";
import { backgroundByName, classByName, raceByName, subclassByName } from "../../helpers/seed-lookup";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { spendFeatureUse, restoreFeatureUse } from "@/lib/actions/feature-uses";
import { longRest, shortRest } from "@/lib/actions/rest-actions";

const GOLDEN_PATH = path.join(__dirname, "pooled-resources.json");
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";

type RemainingPoolCase = {
  key: string;
  className: Classes;
  subclassName: Subclasses;
  level: number;
  featureName: string;
  poolKey: string;
  rest: "short" | "long";
  expectedPoolMaximum?: number;
};

const REMAINING_POOL_CASES: readonly RemainingPoolCase[] = [
  {
    key: "bardicInspiration",
    className: Classes.BARD_2014,
    subclassName: Subclasses.COLLEGE_OF_LORE,
    level: 3,
    featureName: "Cutting Words",
    poolKey: "BARDIC_INSPIRATION",
    rest: "long",
  },
  {
    key: "wildShape",
    className: Classes.DRUID_2014,
    subclassName: Subclasses.CIRCLE_OF_THE_MOON,
    level: 10,
    featureName: "Elemental Wild Shape",
    poolKey: "WILD_SHAPE",
    rest: "short",
    expectedPoolMaximum: 2,
  },
  {
    key: "channelDivinity",
    className: Classes.CLERIC_2014,
    subclassName: Subclasses.LIFE_DOMAIN,
    level: 6,
    featureName: "Channel Divinity: Preserve Life",
    poolKey: "CHANNEL_DIVINITY",
    rest: "short",
    expectedPoolMaximum: 2,
  },
  {
    key: "superiorityDice",
    className: Classes.FIGHTER_2014,
    subclassName: Subclasses.BATTLE_MASTER,
    level: 3,
    featureName: "Precision Attack",
    poolKey: "SUPERIORITY_DICE",
    rest: "short",
  },
  {
    key: "arcaneShot",
    className: Classes.FIGHTER_2014,
    subclassName: Subclasses.ARCANE_ARCHER,
    level: 3,
    featureName: "Banishing Arrow",
    poolKey: "ARCANE_SHOT",
    rest: "short",
  },
  {
    key: "psionicEnergy",
    className: Classes.ROGUE_2014,
    subclassName: Subclasses.SOULKNIFE,
    level: 3,
    featureName: "Psi-Bolstered Knack",
    poolKey: "PSIONIC_ENERGY",
    rest: "long",
    expectedPoolMaximum: 4,
  },
];

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR2.4 — golden для pooled feature resources", () => {
  it("фіксує всі pooled resources на manual restore і відповідному rest", async () => {
    const [quickenedHealing, quickenedSpell] = await Promise.all([
      prisma.feature.findUniqueOrThrow({ where: { engName: "Quickened Healing" } }),
      prisma.feature.findUniqueOrThrow({ where: { engName: "Quickened Spell" } }),
    ]);

    const monk = await exercisePool(
      await createOwnedCharacter("monk", Classes.MONK_2014, 4),
      quickenedHealing.featureId,
      "KI",
      "short",
    );
    const sorcerer = await exercisePool(
      await createOwnedCharacter("sorcerer", Classes.SORCERER_2014, 3),
      quickenedSpell.featureId,
      "SORCERY_POINTS",
      "long",
    );
    const remainingPools = await exerciseRemainingPools();
    const actual = {
      monk,
      sorcerer: { ...sorcerer, expectedPoolMaximum: 3 },
      ...remainingPools,
    };

    if (UPDATE_GOLDEN) {
      fs.writeFileSync(GOLDEN_PATH, JSON.stringify(actual, null, 2) + "\n");
      return;
    }

    /// До BUG-011 `expectedPoolMaximum` був підписом «правильна відповідь інша» поруч із
    /// зафіксованою неправильною. Тепер це перевірка: після відпочинку пул стоїть на своєму
    /// максимумі з PHB, а не на максимумі чужої фічі з тим самим ключем.
    for (const [key, expected] of Object.entries(actual)) {
      const record = expected as { expectedPoolMaximum?: number; afterRest: { usesRemaining: number } };
      if (record.expectedPoolMaximum === undefined) continue;

      expect(record.afterRest.usesRemaining, key).toBe(record.expectedPoolMaximum);
    }

    expect(actual).toEqual(JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8")));
  }, 120_000);
});

async function exerciseRemainingPools() {
  const results: Record<string, unknown> = {};

  for (const poolCase of REMAINING_POOL_CASES) {
    const [feature, persId] = await Promise.all([
      prisma.feature.findUniqueOrThrow({ where: { engName: poolCase.featureName } }),
      createOwnedCharacter(poolCase.key, poolCase.className, poolCase.level, poolCase.subclassName),
    ]);
    const resource = await exercisePool(persId, feature.featureId, poolCase.poolKey, poolCase.rest);

    results[poolCase.key] = {
      ...resource,
      ...(poolCase.expectedPoolMaximum === undefined ? {} : { expectedPoolMaximum: poolCase.expectedPoolMaximum }),
    };
  }

  return results;
}

async function createOwnedCharacter(
  emailPrefix: string,
  className: Classes,
  level: number,
  subclassName?: Subclasses,
): Promise<number> {
  const user = await prisma.user.create({
    data: { email: `${emailPrefix}-pooled-resources@golden.test`, name: "Golden Test User" },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(BackgroundCategory.SAGE),
  ]);
  const subclass = subclassName ? await subclassByName(characterClass.classId, subclassName) : null;
  const result = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in result) throw new Error(`${emailPrefix}: createCharacter повернув ${result.error}`);

  await prisma.pers.update({
    where: { persId: result.persId },
    data: { level, ...(subclass ? { subclassId: subclass.subclassId } : {}) },
  });
  return result.persId;
}

async function exercisePool(
  persId: number,
  featureId: number,
  poolKey: string,
  rest: "short" | "long",
) {
  const spent = await spendFeatureUse({ persId, featureId });
  const afterSpend = await readPool(persId, poolKey);
  const restored = await restoreFeatureUse({ persId, featureId });
  const afterManualRestore = await readPool(persId, poolKey);

  await spendFeatureUse({ persId, featureId });
  const restResult = rest === "short" ? await shortRest(persId, []) : await longRest(persId);

  return {
    feature: await prisma.feature.findUniqueOrThrow({ where: { featureId }, select: { engName: true, usePrice: true } }),
    spent,
    afterSpend,
    restored,
    afterManualRestore,
    restResult,
    afterRest: await readPool(persId, poolKey),
  };
}

function readPool(persId: number, poolKey: string) {
  return prisma.persResourcePool.findUniqueOrThrow({
    where: { persId_poolKey: { persId, poolKey } },
    select: { poolKey: true, usesRemaining: true },
  });
}
