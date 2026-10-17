import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, SkillProficiencyType, Skills } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { MULTICLASS_SKILL_SELECTION_KEY } from "@/rules/multiclass-skill-choice";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createSoldierFighter() {
  const owner = await prisma.user.create({ data: { email: `multiclass-skill-${Math.random()}@holota.family`, name: "Owner" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
  const [race, fighter, background] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(BackgroundCategory.SOLDIER)]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function enterClass(persId: number, className: Classes, skills?: string[]) {
  const target = await classByName(className);
  const expertises = className === Classes.ROGUE_2014 ? (await readProficientSkills(persId)).slice(0, 2) : [];
  return levelUpCharacter(persId, minimalLevelUpForm({
    classId: target.classId,
    levelUpPath: "MULTICLASS",
    ...(skills ? { levelUpSkillSelections: { [MULTICLASS_SKILL_SELECTION_KEY]: skills } } : {}),
    expertiseSchema: { expertises },
  }));
}

async function readProficientSkills(persId: number) {
  const rows = await prisma.persSkill.findMany({ where: { persId, proficiencyType: { not: SkillProficiencyType.NONE } }, select: { name: true } });
  return rows.map((row) => row.name);
}

describe("skill gained when a character takes a first level in Rogue or Ranger", () => {
  it("adds the Rogue skill the player chose from the Rogue list", async () => {
    const persId = await createSoldierFighter();
    expect(await readProficientSkills(persId)).not.toContain(Skills.STEALTH);

    const result = await enterClass(persId, Classes.ROGUE_2014, [Skills.STEALTH]);

    expect(result).not.toHaveProperty("error");
    expect(await readProficientSkills(persId)).toContain(Skills.STEALTH);
  });

  it("refuses a skill that is not on the Rogue list", async () => {
    const persId = await createSoldierFighter();

    expect(await enterClass(persId, Classes.ROGUE_2014, [Skills.ARCANA])).toHaveProperty("error");
    expect(await readProficientSkills(persId)).not.toContain(Skills.ARCANA);
  });

  it("refuses a skill the character already has and a second skill", async () => {
    const persId = await createSoldierFighter();
    const known = (await readProficientSkills(persId))[0];
    expect(known).toBeDefined();

    expect(await enterClass(persId, Classes.RANGER_2014, [known])).toHaveProperty("error");
    expect(await enterClass(persId, Classes.RANGER_2014, [Skills.STEALTH, Skills.SURVIVAL])).toHaveProperty("error");
  });

  it("still lets the entry through when no skill is named, as the other first-level choices do", async () => {
    const persId = await createSoldierFighter();

    expect(await enterClass(persId, Classes.ROGUE_2014)).not.toHaveProperty("error");
  });

  it("ignores a skill pick for a class that gives none", async () => {
    const persId = await createSoldierFighter();
    const result = await enterClass(persId, Classes.BARBARIAN_2014, [Skills.ARCANA]);

    expect(result).not.toHaveProperty("error");
    expect(await readProficientSkills(persId)).not.toContain(Skills.ARCANA);
  });
});
