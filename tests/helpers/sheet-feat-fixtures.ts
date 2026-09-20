import { vi } from "vitest";
import type { Classes, Feats, Races, Ruleset, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addFeatToPers } from "@/lib/actions/feat-actions";

const FIGHTER: Record<Ruleset, { className: Classes; race: Races; background: string; subclass: Subclasses }> = {
  RULES_2014: { className: "FIGHTER_2014", race: "HUMAN_2014", background: "ACOLYTE", subclass: "CHAMPION" },
  RULES_2024: { className: "FIGHTER_2024", race: "HUMAN_2024", background: "SAGE_2024", subclass: "CHAMPION" },
};

export async function createFighter(input: { ruleset: Ruleset; level: number; con?: number }) {
  const setup = FIGHTER[input.ruleset];
  const user = await prisma.user.create({ data: { email: `sheet-feat-${Math.random()}@holota.family`, name: "Риса з листа" } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const cls = await prisma.class.findFirstOrThrow({ where: { name: setup.className } });
  const [race, background, subclass] = await Promise.all([
    prisma.race.findFirstOrThrow({ where: { name: setup.race } }),
    prisma.background.findFirstOrThrow({ where: { name: setup.background as never, ruleset: input.ruleset } }),
    prisma.subclass.findFirstOrThrow({ where: { classId: cls.classId, name: setup.subclass } }),
  ]);

  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: `Воїн ${input.ruleset}`,
      ruleset: input.ruleset,
      classId: cls.classId,
      subclassId: subclass.subclassId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 50,
      maxHp: 50,
      str: 15, dex: 13, con: input.con ?? 14, int: 12, wis: 10, cha: 8,
      customProficiencies: "Усі обладунки",
      customLanguagesKnown: "Загальна",
    },
  });
  return pers.persId;
}

export async function acquire(persId: number, ruleset: Ruleset, featName: Feats, options: string[] = [], featSpellIds: number[] = []) {
  const feat = await prisma.feat.findFirstOrThrow({
    where: { name: featName, ruleset },
    select: { featId: true, featChoiceOptions: { select: { choiceOptionId: true, choiceOption: { select: { optionNameEng: true } } } } },
  });
  const choiceOptionIds = options.map((optionNameEng) => {
    const link = feat.featChoiceOptions.find((candidate) => candidate.choiceOption.optionNameEng === optionNameEng);
    if (!link) throw new Error(`${featName}: немає опції ${optionNameEng}`);
    return link.choiceOptionId;
  });
  return addFeatToPers({ persId, featId: feat.featId, choiceOptionIds, featSpellIds });
}

export async function readCharacter(persId: number) {
  const pers = await prisma.pers.findUniqueOrThrow({
    where: { persId },
    select: {
      str: true, dex: true, con: true, int: true, wis: true, cha: true,
      maxHp: true,
      currentHp: true,
      additionalSaveProficiencies: true,
      customProficiencies: true,
      customLanguagesKnown: true,
      skills: { select: { name: true, proficiencyType: true } },
      features: { select: { feature: { select: { engName: true } } } },
      feats: { select: { feat: { select: { name: true } } } },
      persSpells: { select: { origin: true, spell: { select: { engName: true } } } },
    },
  });

  return {
    ...pers,
    skills: pers.skills.map((skill) => `${skill.name}:${skill.proficiencyType}`).sort(),
    features: pers.features.map((entry) => entry.feature.engName).sort(),
    feats: pers.feats.map((entry) => entry.feat.name),
    spells: pers.persSpells.map((entry) => `${entry.origin}:${entry.spell.engName}`).sort(),
  };
}
