import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SkillProficiencyType, Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { getLevelUpInfo, levelUpCharacter } from "@/lib/actions/levelup";
import { hasLevelUpExpertiseChoice } from "@/lib/components/levelUp/levelup-expertise-step";
import { MULTICLASS_SKILL_SELECTION_KEY } from "@/rules/multiclass-skill-choice";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createSoldierFighter() {
  const owner = await prisma.user.create({ data: { email: `multiclass-expertise-${Math.random()}@holota.family`, name: "Owner" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  const [race, fighter, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function enterRogue(persId: number, choices: { skills?: string[]; expertises?: string[] }) {
  const rogue = await classByName(Classes.ROGUE_2014);
  return levelUpCharacter(persId, minimalLevelUpForm({
    classId: rogue.classId,
    levelUpPath: "MULTICLASS",
    ...(choices.skills ? { levelUpSkillSelections: { [MULTICLASS_SKILL_SELECTION_KEY]: choices.skills } } : {}),
    expertiseSchema: { expertises: choices.expertises ?? [] },
  }));
}

async function readSkills(persId: number) {
  const rows = await prisma.persSkill.findMany({ where: { persId }, select: { name: true, proficiencyType: true } });
  return {
    proficient: rows.filter((row) => row.proficiencyType === SkillProficiencyType.PROFICIENT).map((row) => row.name).sort(),
    expertise: rows.filter((row) => row.proficiencyType === SkillProficiencyType.EXPERTISE).map((row) => row.name).sort(),
  };
}

async function readLevel(persId: number) {
  return (await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true } })).level;
}

describe("вхід у Пройдисвіта мультикласом 2014 дає Експертизу 1 рівня (PHB с. 96, 164)", () => {
  it("без названої експертизи сервер не пускає в клас і не підвищує рівень", async () => {
    const persId = await createSoldierFighter();

    expect(await enterRogue(persId, { skills: [Skills.STEALTH] })).toEqual({ error: "Оберіть рівно 2 навичок для експертизи" });
    expect(await enterRogue(persId, {})).toEqual({ error: "Оберіть рівно 2 навичок для експертизи" });
    expect(await readLevel(persId)).toBe(1);
  });

  it("приймає дві експертизи, зокрема в навичці, яку дає сам вхід у клас", async () => {
    const persId = await createSoldierFighter();
    const [known] = (await readSkills(persId)).proficient;

    const result = await enterRogue(persId, { skills: [Skills.STEALTH], expertises: [known, Skills.STEALTH] });

    expect(result).not.toHaveProperty("error");
    expect(await readLevel(persId)).toBe(2);
    expect((await readSkills(persId)).expertise).toEqual([known, Skills.STEALTH].sort());
  });

  it("відхиляє експертизу в навичці, якою персонаж не володіє", async () => {
    const persId = await createSoldierFighter();
    const [known] = (await readSkills(persId)).proficient;

    expect(await enterRogue(persId, { skills: [Skills.STEALTH], expertises: [known, Skills.ARCANA] }))
      .toEqual({ error: "Обрані навички не відповідають доступним варіантам експертизи" });
    expect(await readLevel(persId)).toBe(1);
  });

  it("майстер підвищення бачить крок «Експертиза» на вході в Пройдисвіта, а у Слідопита й Барда — ні", async () => {
    const persId = await createSoldierFighter();
    const info = await getLevelUpInfo(persId);
    if ("error" in info) throw new Error(info.error);
    const asksExpertiseOnEntry = (className: Classes) => {
      const characterClass = info.classes.find((entry) => entry.name === className);
      if (!characterClass) throw new Error(`немає класу ${className}`);
      const features = characterClass.features.filter((entry) => entry.levelGranted === 1).map((entry) => entry.feature);
      return hasLevelUpExpertiseChoice({ features, subclassChoiceOptions: [], classLevelAfter: 1 });
    };

    expect(asksExpertiseOnEntry(Classes.ROGUE_2014)).toBe(true);
    expect(asksExpertiseOnEntry(Classes.RANGER_2014)).toBe(false);
    expect(asksExpertiseOnEntry(Classes.BARD_2014)).toBe(false);
  });
});
