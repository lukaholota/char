import { prisma } from "@/lib/prisma";
import { findSpellSources, type SpellcastingClass, type SpellSource } from "@/rules/spell-sources";
import type { AbilityKey } from "@/rules/types";
import type { RulesetId } from "@/rules/strategies/types";

/**
 * Джерела заклинань персонажа: клас, родовід виду й риси на кшталт «Посвяченого у магію».
 * Величина виведена — у базі її немає й бути не має: клас дає список, із якого гравець обирає,
 * тому джерело існує ще до того, як у персонажа зʼявиться хоч одне заклинання.
 */
export async function loadPersSpellSources(persId: number): Promise<SpellSource[]> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      ruleset: true,
      class: { select: { name: true, spellcastingType: true, primaryCastingStat: true } },
      multiclasses: { select: { class: { select: { name: true, spellcastingType: true, primaryCastingStat: true } } } },
      race: {
        select: {
          traits: { select: { feature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } } } },
        },
      },
      raceChoiceOptions: {
        select: {
          optionName: true,
          spellcastingAbility: true,
          traitFeature: { select: { engName: true, name: true } },
          traits: { select: { feature: { select: { engName: true, name: true, givesSpells: { select: { spellId: true } } } } } },
          spells: { select: { spellId: true, characterLevel: true } },
        },
      },
      feats: {
        select: {
          feat: { select: { name: true } },
          choices: { select: { choiceOption: { select: { effectKind: true, effectAbility: true } } } },
        },
      },
    },
  });

  if (!pers) return [];

  return findSpellSources({
    ruleset: pers.ruleset as RulesetId,
    characterClasses: [pers.class, ...pers.multiclasses.map((entry) => entry.class)].flatMap((characterClass) =>
      characterClass ? [toSpellcastingClass(characterClass)] : [],
    ),
    raceTraits: pers.race.traits.map((trait) => toFeatureWithSpells(trait.feature)),
    raceChoiceOptions: pers.raceChoiceOptions.map((option) => ({
      optionName: option.optionName,
      spellcastingAbility: option.spellcastingAbility as AbilityKey | null,
      traitFeature: option.traitFeature,
      grantedFeatures: option.traits.map((trait) => toFeatureWithSpells(trait.feature)),
      leveledSpells: option.spells,
    })),
    featOptions: pers.feats.flatMap((persFeat) =>
      persFeat.choices.map((choice) => ({
        featName: persFeat.feat.name,
        effectKind: choice.choiceOption?.effectKind ?? null,
        effectAbility: (choice.choiceOption?.effectAbility ?? null) as AbilityKey | null,
      })),
    ),
  });
}

type ClassRow = { name: string; spellcastingType: string; primaryCastingStat: string | null };

function toSpellcastingClass(characterClass: ClassRow): SpellcastingClass {
  return {
    name: characterClass.name,
    spellcastingType: characterClass.spellcastingType,
    primaryCastingStat: characterClass.primaryCastingStat as AbilityKey | null,
  };
}

type FeatureRow = { engName: string; name: string; givesSpells: Array<{ spellId: number }> };

function toFeatureWithSpells(feature: FeatureRow) {
  return { engName: feature.engName, name: feature.name, spellIds: feature.givesSpells.map((spell) => spell.spellId) };
}
