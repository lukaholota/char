import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SkillProficiencyType, Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const ENEMY_GROUP = "Налаштування Слідопита: ворог";
const TERRAIN_GROUP = "Налаштування Слідопита: місцевість";

let optionIdByName: Map<string, number>;

beforeAll(async () => {
  const options = await prisma.choiceOption.findMany({ where: { groupName: { in: [ENEMY_GROUP, TERRAIN_GROUP] } }, select: { choiceOptionId: true, optionNameEng: true } });
  optionIdByName = new Map(options.map((option) => [option.optionNameEng, option.choiceOptionId]));
});

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}-${Math.random()}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

async function buildRangerForm(terrainOption: string, overrides: Partial<PersFormData> = {}) {
  const [race, characterClass, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.RANGER_2014), backgroundByName(BackgroundCategory.OUTLANDER)]);
  return minimalForm({
    raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId,
    classChoiceSelections: { [ENEMY_GROUP]: optionIdByName.get("Favored Foe")!, [TERRAIN_GROUP]: optionIdByName.get(terrainOption)! },
    skills: ["PERCEPTION", "STEALTH", "SURVIVAL"],
    skillsSchema: { isTasha: false, tashaChoices: [], basicChoices: { selectedClass: ["PERCEPTION", "STEALTH", "SURVIVAL"], race: [], background: [] }, choiceOptions: {} },
    ...overrides,
  });
}

async function readSkillRows(persId: number) {
  return prisma.persSkill.findMany({ where: { persId }, select: { name: true, proficiencyType: true }, orderBy: { name: "asc" } });
}

describe("Слідопит 2014: «Кмітливий дослідник» (Deft Explorer – Canny) на 1-му рівні", () => {
  it("записує експертизу в обраній навичці, дві мови і саме уміння", async () => {
    await signIn("ranger-canny-create");
    const form = await buildRangerForm("Deft Explorer - Canny", {
      expertiseSchema: { expertises: ["STEALTH"] },
      languagesSchema: { languages: ["GIANT", "GNOMISH"] },
    });
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    const persId = (created as { persId: number }).persId;

    const rows = await readSkillRows(persId);
    expect(rows.find((row) => row.name === Skills.STEALTH)?.proficiencyType).toBe(SkillProficiencyType.EXPERTISE);
    expect(rows.filter((row) => row.proficiencyType === SkillProficiencyType.EXPERTISE)).toHaveLength(1);
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { customLanguagesKnown: true, features: { select: { feature: { select: { engName: true } } } } } });
    expect(pers.customLanguagesKnown).toContain("Мова велетнів");
    expect(pers.customLanguagesKnown).toContain("Гномʼяча");
    const featureNames = pers.features.map((entry) => entry.feature.engName);
    expect(featureNames).toContain("Deft Explorer - Canny");
    expect(featureNames).not.toContain("Natural Explorer");
  });

  it("Природний дослідник (замість нього) експертизи й мов не дає", async () => {
    await signIn("ranger-natural-explorer-create");
    const form = await buildRangerForm("Natural Explorer");
    const created = await createCharacter(form);
    expect(created).not.toHaveProperty("error");
    const persId = (created as { persId: number }).persId;

    expect((await readSkillRows(persId)).filter((row) => row.proficiencyType === SkillProficiencyType.EXPERTISE)).toEqual([]);
    const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { features: { select: { feature: { select: { engName: true } } } } } });
    expect(pers.features.map((entry) => entry.feature.engName)).toContain("Natural Explorer");
  });

  it("експертизу без уміння, що її дає (Природний дослідник замість Кмітливого), сервер 2014 відхиляє", async () => {
    await signIn("ranger-expertise-without-grant");
    const form = await buildRangerForm("Natural Explorer", { expertiseSchema: { expertises: ["STEALTH"] } });

    expect(await createCharacter(form)).toHaveProperty("error");
    expect(await prisma.pers.count()).toBe(0);
  });
});
