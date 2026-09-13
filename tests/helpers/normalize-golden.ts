import { prisma } from "@/lib/prisma";

function sortBy<T>(arr: T[], key: (item: T) => string | number) {
  return [...arr].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export async function readFullPers(persId: number) {
  return prisma.pers.findUniqueOrThrow({
    where: { persId },
    include: {
      race: { select: { name: true } },
      subrace: { select: { name: true } },
      class: { select: { name: true } },
      subclass: { select: { name: true } },
      background: { select: { name: true } },
      raceVariants: { select: { name: true } },
      raceChoiceOptions: { select: { optionId: true, choiceGroupName: true, optionName: true } },
      choiceOptions: { select: { choiceOptionId: true, optionNameEng: true } },
      classOptionalFeatures: { select: { optionalFeatureId: true } },
      features: { include: { feature: { select: { engName: true } } } },
      feats: {
        include: {
          feat: { select: { name: true } },
          choices: { include: { choiceOption: { select: { optionNameEng: true } } } },
        },
      },
      skills: { select: { name: true, proficiencyType: true } },
      weapons: { include: { weapon: { select: { name: true, ruleset: true } } } },
      armors: { include: { armor: { select: { name: true, ruleset: true } } } },
      multiclasses: {
        include: { class: { select: { name: true } }, subclass: { select: { name: true } } },
      },
      persInfusions: { include: { infusion: { select: { engName: true } } } },
    },
  });
}

type FullPers = Awaited<ReturnType<typeof readFullPers>>;

/**
 * DB state -> plain comparable object for a golden file.
 * IDs are omitted, not renumbered: tests/user-data.ts truncates with RESTART IDENTITY per test,
 * so within a single-user, single-character test persId/userId/child-row ids are always the same
 * small deterministic sequence anyway — nothing here depends on them.
 */
export function normalizeForGolden(pers: FullPers) {
  return {
    level: pers.level,
    scores: { str: pers.str, dex: pers.dex, con: pers.con, int: pers.int, wis: pers.wis, cha: pers.cha },
    hp: { current: pers.currentHp, max: pers.maxHp },
    raceStaticAcBonus: pers.raceStaticAcBonus,
    money: { cp: pers.cp, sp: pers.sp, ep: pers.ep, gp: pers.gp, pp: pers.pp },
    spellSlots: { current: pers.currentSpellSlots, pact: pers.currentPactSlots },
    additionalSaveProficiencies: [...pers.additionalSaveProficiencies].sort(),
    customLanguagesKnown: pers.customLanguagesKnown,
    customProficiencies: pers.customProficiencies,
    customEquipment: pers.customEquipment,
    race: pers.race.name,
    subrace: pers.subrace?.name ?? null,
    raceVariants: sortBy(pers.raceVariants, (v) => v.name).map((v) => v.name),
    class: pers.class.name,
    subclass: pers.subclass?.name ?? null,
    background: pers.background.name,
    raceChoiceOptions: sortBy(pers.raceChoiceOptions, (o) => o.optionId).map(
      (o) => `${o.choiceGroupName}:${o.optionName}`,
    ),
    choiceOptions: sortBy(pers.choiceOptions, (o) => o.choiceOptionId).map((o) => o.optionNameEng),
    classOptionalFeatures: sortBy(pers.classOptionalFeatures, (o) => o.optionalFeatureId).map(
      (o) => o.optionalFeatureId,
    ),
    features: sortBy(pers.features, (f) => f.feature.engName).map((f) => f.feature.engName),
    feats: sortBy(pers.feats, (f) => f.feat.name).map((f) => ({
      name: f.feat.name,
      choices: sortBy(f.choices, (c) => c.choiceOption.optionNameEng).map((c) => c.choiceOption.optionNameEng),
    })),
    skills: sortBy(pers.skills, (s) => s.name).map((s) => `${s.name}:${s.proficiencyType}`),
    weapons: sortBy(pers.weapons, (w) => w.weapon.name).map((w) => `${w.weapon.name}:${w.weapon.ruleset}`),
    armors: sortBy(pers.armors, (a) => a.armor.name).map(
      (a) => `${a.armor.name}:${a.armor.ruleset}${a.equipped ? "*" : ""}`,
    ),
    multiclasses: sortBy(pers.multiclasses, (m) => m.class.name).map((m) => ({
      class: m.class.name,
      subclass: m.subclass?.name ?? null,
      classLevel: m.classLevel,
    })),
    infusions: sortBy(pers.persInfusions, (i) => i.infusion.engName).map((i) => i.infusion.engName),
  };
}

export type GoldenPers = ReturnType<typeof normalizeForGolden>;
