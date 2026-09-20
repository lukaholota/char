import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Ability, BackgroundCategory, Classes, Races, RestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../../user-data";
import { minimalForm } from "../../helpers/build-form";
import { withCreationSpells } from "../../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import {
  updateBaseACOverride,
  updateBaseStat,
  updateBonus,
  updateSaveProficiency,
} from "@/lib/actions/bonus-actions";
import { spendFeatureUse, restoreFeatureUse } from "@/lib/actions/feature-uses";
import { shortRest } from "@/lib/actions/rest-actions";
import { createCharacter } from "@/lib/actions/character";

const GOLDEN_PATH = path.join(__dirname, "resources-and-modifiers.json");
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === "1";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR2.4 — golden для ресурсів фіч і ModifyStatModal actions", () => {
  it("фіксує витрату/відновлення ресурсу та ручні модифікації характеристик", async () => {
    const persId = await createOwnedFighter();
    const resource = await prisma.persFeature.findFirst({
      where: {
        persId,
        feature: { limitedUsesPer: RestType.SHORT_REST, usesCount: { not: null } },
      },
      include: { feature: { select: { engName: true } } },
    });
    if (!resource) throw new Error("Fighter не отримав фічу з числовим ресурсом на short rest.");

    const spent = await spendFeatureUse({ persId, featureId: resource.featureId });
    const afterSpend = await readResourceState(persId, resource.featureId);
    const restored = await restoreFeatureUse({ persId, featureId: resource.featureId });
    const afterManualRestore = await readResourceState(persId, resource.featureId);
    await spendFeatureUse({ persId, featureId: resource.featureId });
    const shortRestResult = await shortRest(persId, []);
    const afterShortRest = await readResourceState(persId, resource.featureId);

    await Promise.all([
      updateBaseStat(persId, Ability.STR, 17),
      updateBonus(persId, "stat", Ability.STR, 2),
      updateBonus(persId, "statModifier", Ability.STR, 1),
      updateBonus(persId, "save", Ability.STR, 3),
      updateSaveProficiency(persId, Ability.STR, true),
      updateBaseACOverride(persId, 15),
      updateBonus(persId, "ac", null, 2),
    ]);

    const actual = {
      resource: {
        feature: resource.feature.engName,
        spent,
        afterSpend,
        restored,
        afterManualRestore,
        shortRestResult,
        afterShortRest,
      },
      modifiers: await prisma.pers.findUniqueOrThrow({
        where: { persId },
        select: {
          str: true,
          statBonuses: true,
          statModifierBonuses: true,
          saveBonuses: true,
          additionalSaveProficiencies: true,
          overrideBaseAC: true,
          acBonuses: true,
        },
      }),
    };

    if (UPDATE_GOLDEN) {
      fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
      fs.writeFileSync(GOLDEN_PATH, JSON.stringify(actual, null, 2) + "\n");
      return;
    }

    if (!fs.existsSync(GOLDEN_PATH)) {
      throw new Error("Golden відсутній. Згенеруйте його через UPDATE_GOLDEN=1.");
    }

    expect(actual).toEqual(JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf-8")));
  }, 30_000);
});

async function createOwnedFighter(): Promise<number> {
  const user = await prisma.user.create({
    data: { email: "resources-and-modifiers@golden.test", name: "Golden Test User" },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, fighterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const result = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: fighterClass.classId, backgroundId: background.backgroundId })));
  if ("error" in result) throw new Error(`createCharacter повернув ${result.error}`);
  return result.persId;
}

async function readResourceState(persId: number, featureId: number) {
  return prisma.persFeature.findUniqueOrThrow({
    where: { persId_featureId: { persId, featureId } },
    select: { usesRemaining: true },
  });
}
