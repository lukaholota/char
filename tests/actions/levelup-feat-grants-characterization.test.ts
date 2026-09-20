/**
 * KR31.13 `L10-sheet-config-01` — характеризація: що риса дає персонажу на підвищенні рівня.
 * Знімок зроблено ДО винесення набуття риси в спільне правило; воно не має його змінити.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Classes, Feats, Races, Ruleset, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { auth } from "@/lib/auth";
import { levelUpCharacter } from "@/lib/actions/levelup";

vi.setConfig({ testTimeout: 120_000 });

beforeEach(resetUserData);
afterAll(disconnectDatabase);

type FeatCase = {
  ruleset: Ruleset;
  feat: Feats;
  options?: string[];
  languages?: string[];
};

const FIGHTER: Record<Ruleset, { className: Classes; race: Races; background: string; subclass: Subclasses }> = {
  RULES_2014: { className: "FIGHTER_2014", race: "HUMAN_2014", background: "ACOLYTE", subclass: "CHAMPION" },
  RULES_2024: { className: "FIGHTER_2024", race: "HUMAN_2024", background: "SAGE_2024", subclass: "CHAMPION" },
};

const CASES: FeatCase[] = [
  { ruleset: "RULES_2014", feat: "RESILIENT", options: ["Resilient (Constitution)"] },
  { ruleset: "RULES_2014", feat: "ATHLETE", options: ["ATHLETE Ability (Strength)"] },
  { ruleset: "RULES_2014", feat: "OBSERVANT", options: ["OBSERVANT Ability (Wisdom)"] },
  {
    ruleset: "RULES_2014",
    feat: "SKILL_EXPERT",
    options: ["Skill Expert (DEX)", "Skill Expert Proficiency (STEALTH)", "Skill Expert Expertise (STEALTH)"],
  },
  { ruleset: "RULES_2014", feat: "PRODIGY", options: ["Prodigy Proficiency (INSIGHT)", "Prodigy Expertise (INSIGHT)"], languages: ["ELVISH"] },
  { ruleset: "RULES_2014", feat: "TOUGH" },
  { ruleset: "RULES_2014", feat: "LINGUIST", languages: ["ELVISH", "DWARVISH", "GIANT"] },
  { ruleset: "RULES_2014", feat: "HEAVILY_ARMORED" },
  { ruleset: "RULES_2014", feat: "MARTIAL_ADEPT", options: ["Riposte (Maneuver)", "Trip Attack (Maneuver)"] },
  { ruleset: "RULES_2024", feat: "RESILIENT", options: ["Resilient 2024 (WIS)"] },
  { ruleset: "RULES_2024", feat: "SKILLED", options: ["Skilled 2024 (ARCANA)", "Skilled 2024 (HISTORY)", "Skilled 2024 (STEALTH)"] },
  {
    ruleset: "RULES_2024",
    feat: "SKILL_EXPERT",
    options: ["Skill Expert 2024 (INT)", "Skill Expert 2024 proficiency (ARCANA)", "Skill Expert 2024 expertise (ARCANA)"],
  },
  { ruleset: "RULES_2024", feat: "TOUGH" },
  { ruleset: "RULES_2024", feat: "HEAVILY_ARMORED", options: ["Heavily Armored 2024 (CON)"] },
  { ruleset: "RULES_2024", feat: "CRAFTER" },
  { ruleset: "RULES_2024", feat: "ALERT" },
];

describe("KR31.13 — набуття риси на підвищенні рівня (характеризація)", () => {
  it.each(CASES.map((featCase) => [`${featCase.ruleset} ${featCase.feat}`, featCase] as const))("%s", async (_label, featCase) => {
    const { persId, classId } = await createFighterAtLevelThree(featCase.ruleset);
    const { featId, featChoiceSelections } = await findFeatSelections(featCase);

    const result = await levelUpCharacter(
      persId,
      minimalLevelUpForm({ classId, featId, featChoiceSelections, languagesSchema: { languages: featCase.languages ?? [] } }),
    );

    expect({ result, character: await readFeatOutcome(persId) }).toMatchSnapshot();
  });
});

async function createFighterAtLevelThree(ruleset: Ruleset) {
  const setup = FIGHTER[ruleset];
  const user = await prisma.user.create({ data: { email: `feat-grants-${Math.random()}@holota.family`, name: "Характеризація рис" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const cls = await prisma.class.findFirstOrThrow({ where: { name: setup.className } });
  const [race, background, subclass] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: setup.race } }),
    prisma.background.findFirstOrThrow({ where: { name: setup.background as never, ruleset } }),
    prisma.subclass.findFirstOrThrow({ where: { classId: cls.classId, name: setup.subclass } }),
  ]);

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: `Воїн ${ruleset}`,
      ruleset,
      classId: cls.classId,
      subclassId: subclass.subclassId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp: 28,
      maxHp: 28,
      str: 15, dex: 13, con: 14, int: 12, wis: 10, cha: 8,
      customProficiencies: "Усі обладунки",
      customLanguagesKnown: "Загальна",
    },
  });
  return { persId: pers.persId, classId: cls.classId };
}

async function findFeatSelections(featCase: FeatCase) {
  const feat = await prisma.feat.findFirstOrThrow({
    where: { name: featCase.feat, ruleset: featCase.ruleset },
    select: { featId: true, featChoiceOptions: { select: { choiceOption: { select: { choiceOptionId: true, groupName: true, optionNameEng: true } } } } },
  });

  const featChoiceSelections: Record<string, number[]> = {};
  for (const optionNameEng of featCase.options ?? []) {
    const link = feat.featChoiceOptions.find((candidate) => candidate.choiceOption.optionNameEng === optionNameEng);
    if (!link) throw new Error(`${featCase.feat}: немає опції ${optionNameEng}`);
    (featChoiceSelections[link.choiceOption.groupName] ??= []).push(link.choiceOption.choiceOptionId);
  }
  return { featId: feat.featId, featChoiceSelections };
}

async function readFeatOutcome(persId: number) {
  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId },
    select: {
      level: true,
      str: true, dex: true, con: true, int: true, wis: true, cha: true,
      maxHp: true,
      additionalSaveProficiencies: true,
      customProficiencies: true,
      customLanguagesKnown: true,
      skills: { select: { name: true, proficiencyType: true } },
      features: { select: { feature: { select: { engName: true } } } },
      feats: { select: { feat: { select: { name: true } }, choices: { select: { choiceOption: { select: { optionNameEng: true } } } } } },
      persSpells: { select: { origin: true, spell: { select: { engName: true } } } },
    },
  });

  return {
    ...pers,
    skills: pers.skills.map((skill) => `${skill.name}:${skill.proficiencyType}`).sort(),
    features: pers.features.map((entry) => entry.feature.engName).sort(),
    feats: pers.feats.map((entry) => ({ name: entry.feat.name, choices: entry.choices.map((choice) => choice.choiceOption.optionNameEng).sort() })),
    persSpells: pers.persSpells.map((entry) => `${entry.origin}:${entry.spell.engName}`).sort(),
  };
}
