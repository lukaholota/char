import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { findCreatorContent, type CreatorContent } from "@/server/db/creator-content-query";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells, withLevelUpSpells } from "../helpers/creation-spells";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/content/creator-content", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/content/creator-content")>(),
  findCharacterCreatorOptions: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";

let content: CreatorContent;

beforeAll(async () => {
  content = await findCreatorContent(prisma, "RULES_2024");
  vi.mocked(findCharacterCreatorOptions).mockReturnValue(content);
});
beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function signIn(handle: string) {
  const user = await prisma.user.create({ data: { email: `${handle}@holota.family`, name: handle } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);
}

function fixtures(className: string) {
  return {
    characterClass: content.classes.find((candidate) => candidate.name === className)!,
    race: content.races.find((candidate) => candidate.name === "DWARF_2024")!,
    background: content.backgrounds.find((candidate) => candidate.name === "SOLDIER_2024")!,
  };
}

function optionId(owner: { classChoiceOptions?: any[]; subclassChoiceOptions?: any[] }, groupName: string, index = 0) {
  const options = owner.classChoiceOptions ?? owner.subclassChoiceOptions ?? [];
  return options.filter((link: any) => link.choiceOption.groupName === groupName)[index].choiceOptionId as number;
}

async function createBase(className: string, classChoiceSelections: Record<string, number | number[]> = {}) {
  const { characterClass, race, background } = fixtures(className);
  return createCharacter(await withCreationSpells(minimalForm({
    classId: characterClass.classId,
    raceId: race.raceId,
    backgroundId: background.backgroundId,
    ruleset: "RULES_2024",
    backgroundAsiChoice: { mode: "+2/+1", plusTwo: "STR", plusOne: "CON" },
    languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
    classChoiceSelections,
  })));
}

describe("KR31.2 — persistence of 2024 choices", () => {
  it.each([
    ["CLERIC_2024", "Божественний орден", "Divine Order: Protector (2024)", "Важкі обладунки"],
    ["DRUID_2024", "Первісний орден", "Primal Order: Warden (2024)", "Середні обладунки"],
  ])("%s requires and persists %s", async (className, groupName, optionNameEng, armorLabel) => {
    await signIn(`order-${className.toLowerCase()}`);
    const { characterClass } = fixtures(className);
    const selected = characterClass.classChoiceOptions.find(
      (link) => link.choiceOption.optionNameEng === optionNameEng,
    )!;

    await expect(createBase(className)).resolves.toHaveProperty("error");
    const created = await createBase(className, { [groupName]: selected.choiceOptionId });
    expect(created).not.toHaveProperty("error");

    const saved = await prisma.pers.findUniqueOrThrow({
      where: { persId: created.persId! },
      select: { customProficiencies: true, choiceOptions: true, features: { select: { featureId: true } } },
    });
    expect(saved.choiceOptions.map((option) => option.choiceOptionId)).toContain(selected.choiceOptionId);
    expect(saved.features.map((feature) => feature.featureId)).toContain(selected.choiceOption.features[0].featureId);
    expect(saved.customProficiencies).toContain(armorLabel);
    expect(saved.customProficiencies).toContain("Бойова зброя");
  });

  it("Rogue 1 requires and persists exactly two expertises", async () => {
    await signIn("rogue-expertise");
    const base = await createBase("ROGUE_2024");
    expect(base).toHaveProperty("error", "Оберіть рівно 2 навичок для експертизи");

    const { characterClass, race, background } = fixtures("ROGUE_2024");
    const created = await createCharacter(minimalForm({
      classId: characterClass.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      ruleset: "RULES_2024",
      backgroundAsiChoice: { mode: "+2/+1", plusTwo: "DEX", plusOne: "CON" },
      languagesSchema: { languages: ["DWARVISH", "ELVISH"] },
      skills: ["STEALTH", "PERCEPTION"],
      expertiseSchema: { expertises: ["STEALTH", "PERCEPTION"] },
    }));
    expect(created).not.toHaveProperty("error");
    const saved = await prisma.persSkill.findMany({ where: { persId: created.persId!, proficiencyType: "EXPERTISE" } });
    expect(saved.map((skill) => skill.name).sort()).toEqual(["PERCEPTION", "STEALTH"]);
  });

  it.each([
    ["CLERIC_2024", "Божественний орден", "Благословенні удари"],
    ["DRUID_2024", "Первісний орден", "Стихійна лють"],
  ])("%s persists its level-7 class choice", async (className, creationGroup, levelSevenGroup) => {
    await signIn(`level-seven-${className.toLowerCase()}`);
    const { characterClass } = fixtures(className);
    const creationOption = characterClass.classChoiceOptions.find(
      (link) => link.choiceOption.groupName === creationGroup && link.levelsGranted.includes(1),
    )!;
    const created = await createBase(className, { [creationGroup]: creationOption.choiceOptionId });
    if ("error" in created && created.error) throw new Error(created.error);
    await prisma.pers.update({ where: { persId: created.persId! }, data: { level: 6 } });

    const selected = characterClass.classChoiceOptions.find(
      (link) => link.choiceOption.groupName === levelSevenGroup,
    )!;
    const result = await levelUpCharacter(created.persId!, await withLevelUpSpells(created.persId!, minimalLevelUpForm({
      classId: characterClass.classId,
      classChoiceSelections: { [levelSevenGroup]: selected.choiceOptionId },
    })));
    expect(result).not.toHaveProperty("error");
    const saved = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId! }, include: { choiceOptions: true } });
    expect(saved.choiceOptions.map((option) => option.choiceOptionId)).toContain(selected.choiceOptionId);
  });

  it.each([
    ["DRUID_2024", "CIRCLE_OF_THE_LAND", 3, "Коло землі", 1],
    ["RANGER_2024", "HUNTER", 3, "Здобич мисливця", 1],
    ["SORCERER_2024", "DRACONIC_SORCERY", 6, "Стихійна спорідненість", 1],
    ["FIGHTER_2024", "BATTLE_MASTER", 3, "Маневри майстра бою", 3],
  ])("%s/%s level %i persists %s", async (className, subclassName, level, groupName, pickCount) => {
    await signIn(`subclass-${className.toLowerCase()}-${groupName.length}`);
    const { characterClass } = fixtures(className);
    const creationChoices: Record<string, number | number[]> = {};
    for (const group of characterClass.classChoiceOptions.filter((link) => link.levelsGranted.includes(1))) {
      creationChoices[group.choiceOption.groupName] ??= group.choiceOptionId;
    }
    const created = await createBase(className, creationChoices);
    if ("error" in created && created.error) throw new Error(created.error);

    const subclass = characterClass.subclasses.find((candidate) => candidate.name === subclassName)!;
    await prisma.pers.update({
      where: { persId: created.persId! },
      data: { level: level - 1, subclassId: level > 3 ? subclass.subclassId : null },
    });
    const picks = Array.from({ length: pickCount }, (_, index) => optionId(subclass, groupName, index));
    const result = await levelUpCharacter(created.persId!, await withLevelUpSpells(created.persId!, minimalLevelUpForm({
      classId: characterClass.classId,
      ...(level === 3 ? { subclassId: subclass.subclassId } : {}),
      subclassChoiceSelections: { [groupName]: picks },
    })));
    expect(result).not.toHaveProperty("error");

    const saved = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId! }, include: { choiceOptions: true } });
    expect(saved.choiceOptions.map((option) => option.choiceOptionId)).toEqual(expect.arrayContaining(picks));
  }, 30_000);
});
