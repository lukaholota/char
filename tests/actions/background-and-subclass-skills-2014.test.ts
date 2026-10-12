import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Subclasses, ToolCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(async () => {
  await resetUserData();
  const owner = await prisma.user.create({ data: { email: "background-subclass-skills@actions.test" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);
});
afterAll(disconnectDatabase);

async function buildFighterForm(background: BackgroundCategory, overrides: Partial<PersFormData> = {}): Promise<PersFormData> {
  const [race, characterClass, backgroundRow] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.FIGHTER_2014), backgroundByName(background)]);
  return minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: backgroundRow.backgroundId, ...overrides });
}

async function buildClericForm(subclass: Subclasses, overrides: Partial<PersFormData> = {}): Promise<PersFormData> {
  const [race, characterClass, backgroundRow] = await Promise.all([raceByName(Races.HUMAN_2014), classByName(Classes.CLERIC_2014), backgroundByName(BackgroundCategory.ACOLYTE)]);
  const subclassRow = await subclassByName(characterClass.classId, subclass);
  const form = minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: backgroundRow.backgroundId, subclassId: subclassRow.subclassId, ...overrides });
  return withCreationSpells(form);
}

async function createOrThrow(form: PersFormData): Promise<number> {
  const created = await createCharacter(form);
  if (!("persId" in created) || created.persId === undefined) throw new Error(`not created: ${"error" in created ? created.error : ""}`);
  return created.persId;
}

async function listProficientSkills(persId: number): Promise<string[]> {
  const rows = await prisma.persSkill.findMany({ where: { persId, proficiencyType: { not: "NONE" } }, select: { name: true } });
  return rows.map((row) => String(row.name)).sort();
}

const readProficiencyText = async (persId: number): Promise<string> => (await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { customProficiencies: true } })).customProficiencies ?? "";

describe("2014 creation: the current background skill rules", () => {
  it("always grants the fixed skills of a standard background", async () => {
    const persId = await createOrThrow(await buildFighterForm(BackgroundCategory.SAGE));
    expect(await listProficientSkills(persId)).toEqual(["ARCANA", "HISTORY"]);
  });

  it("grants every skill named in the draft without checking where it comes from", async () => {
    const persId = await createOrThrow(await buildFighterForm(BackgroundCategory.SAGE, { skills: ["STEALTH", "ATHLETICS", "ACROBATICS", "SURVIVAL"] }));
    expect(await listProficientSkills(persId)).toEqual(["ACROBATICS", "ARCANA", "ATHLETICS", "HISTORY", "STEALTH", "SURVIVAL"]);
  });

  it("writes the tools of a standard background into the proficiency text", async () => {
    const persId = await createOrThrow(await buildFighterForm(BackgroundCategory.FOLK_HERO));
    const text = await readProficiencyText(persId);
    expect(text).toContain("Інструменти ремісника");
    expect(text).not.toContain("Інструменти злодія");
  });
});

describe("2014 creation: skills of the first-level subclass", () => {
  const withSubclassSkills = (subclass: string[] | undefined) => ({
    skillsSchema: { isTasha: false, tashaChoices: [], choiceOptions: {}, basicChoices: { race: [], selectedClass: [], background: [], subclass } },
  });

  it("gives a Peace Domain cleric no skill from Implement of Peace when the draft names none", async () => {
    const persId = await createOrThrow(await buildClericForm(Subclasses.PEACE_DOMAIN));
    const skills = await listProficientSkills(persId);
    expect(skills).toEqual(expect.arrayContaining(["INSIGHT", "RELIGION"]));
    expect(skills).not.toContain("PERFORMANCE");
    expect(skills).not.toContain("PERSUASION");
  });

  it("grants the Implement of Peace skill the draft names", async () => {
    const persId = await createOrThrow(await buildClericForm(Subclasses.PEACE_DOMAIN, withSubclassSkills(["PERFORMANCE"])));
    expect(await listProficientSkills(persId)).toEqual(["INSIGHT", "PERFORMANCE", "RELIGION"]);
  });

  it("grants the Order Domain skill the draft names", async () => {
    const persId = await createOrThrow(await buildClericForm(Subclasses.ORDER_DOMAIN, withSubclassSkills(["INTIMIDATION"])));
    expect(await listProficientSkills(persId)).toEqual(["INSIGHT", "INTIMIDATION", "RELIGION"]);
  });

  it.each([
    ["a skill outside the feature list", ["ARCANA"]],
    ["two skills where the feature gives one", ["PERFORMANCE", "PERSUASION"]],
    ["no skill where the feature gives one", []],
    ["a repeated skill", ["PERFORMANCE", "PERFORMANCE"]],
  ])("rejects %s and writes nothing", async (_label, picked) => {
    const created = await createCharacter(await buildClericForm(Subclasses.PEACE_DOMAIN, withSubclassSkills(picked)));
    expect(created).toMatchObject({ error: expect.stringMatching(/навич/) });
    expect(await prisma.pers.count()).toBe(0);
    expect(await prisma.persSkill.count()).toBe(0);
  });

  it("rejects a skill for a subclass that gives no skill choice", async () => {
    const created = await createCharacter(await buildClericForm(Subclasses.LIFE_DOMAIN, withSubclassSkills(["PERFORMANCE"])));
    expect(created).toMatchObject({ error: expect.stringContaining("Підклас дає обрати навичок: 0") });
    expect(await prisma.pers.count()).toBe(0);
  });
});

describe("2014 creation: a customized background", () => {
  it("replaces the fixed skills of a standard background with the two chosen ones", async () => {
    const form = await buildFighterForm(BackgroundCategory.SAGE, { skills: ["ANIMAL_HANDLING", "NATURE"], backgroundCustomization: { skills: ["ANIMAL_HANDLING", "NATURE"], tools: [] } });
    const persId = await createOrThrow(form);
    expect(await listProficientSkills(persId)).toEqual(["ANIMAL_HANDLING", "NATURE"]);
  });

  it("writes the tools that replace background languages into the proficiency text", async () => {
    const form = await buildFighterForm(BackgroundCategory.SAGE, { skills: ["ANIMAL_HANDLING", "NATURE"], backgroundCustomization: { skills: ["ANIMAL_HANDLING", "NATURE"], tools: [ToolCategory.HERBALISM_KIT, ToolCategory.THIEVES_TOOLS] } });
    const text = await readProficiencyText(await createOrThrow(form));
    expect(text).toContain("Набір травника");
    expect(text).toContain("Інструменти злодія");
  });

  it("builds a fully custom background from any two skills and up to two tools", async () => {
    const form = await buildFighterForm(BackgroundCategory.CUSTOM, { skills: ["PERCEPTION", "STEALTH"], backgroundCustomization: { skills: ["PERCEPTION", "STEALTH"], tools: [ToolCategory.THIEVES_TOOLS] } });
    const persId = await createOrThrow(form);
    expect(await listProficientSkills(persId)).toEqual(["PERCEPTION", "STEALTH"]);
    expect(await readProficiencyText(persId)).toContain("Інструменти злодія");
  });

  it.each([
    ["one skill", { skills: ["NATURE"], tools: [] }, BackgroundCategory.SAGE],
    ["a repeated skill", { skills: ["NATURE", "NATURE"], tools: [] }, BackgroundCategory.SAGE],
    ["three skills", { skills: ["NATURE", "STEALTH", "ARCANA"], tools: [] }, BackgroundCategory.SAGE],
    ["a tool where the background has no language to trade", { skills: ["NATURE", "STEALTH"], tools: [ToolCategory.THIEVES_TOOLS] }, BackgroundCategory.FOLK_HERO],
    ["more tools than languages to trade", { skills: ["NATURE", "STEALTH"], tools: [ToolCategory.THIEVES_TOOLS, ToolCategory.FORGERY_KIT, ToolCategory.HERBALISM_KIT] }, BackgroundCategory.SAGE],
    ["a tool the background already gives", { skills: ["NATURE", "STEALTH"], tools: [ToolCategory.HERBALISM_KIT] }, BackgroundCategory.HERMIT],
    ["a repeated tool", { skills: ["NATURE", "STEALTH"], tools: [ToolCategory.THIEVES_TOOLS, ToolCategory.THIEVES_TOOLS] }, BackgroundCategory.SAGE],
  ])("rejects %s and writes nothing", async (_label, customization, background) => {
    const form = await buildFighterForm(background, { backgroundCustomization: customization as PersFormData["backgroundCustomization"] });
    expect(await createCharacter(form)).toMatchObject({ error: expect.any(String) });
    expect(await prisma.pers.count()).toBe(0);
    expect(await prisma.persSkill.count()).toBe(0);
  });
});
