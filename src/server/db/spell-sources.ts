import { prisma } from "@/lib/prisma";
import {
  findSpellSources,
  findSpellcastingSources,
  type SpellcastingClass,
  type SpellSource,
  type SpellSourcesInput,
} from "@/rules/spell-sources";
import type { AbilityKey } from "@/rules/types";
import type { RulesetId } from "@/rules/strategies/types";

const CASTING_CLASS_SELECT = { name: true, spellcastingType: true, primaryCastingStat: true } as const;

/**
 * Джерела заклинань персонажа: клас, родовід виду й риси на кшталт «Посвяченого у магію».
 * Величина виведена — у базі її немає й бути не має: клас дає список, із якого гравець обирає,
 * тому джерело існує ще до того, як у персонажа зʼявиться хоч одне заклинання.
 */
export async function loadPersSpellSources(persId: number): Promise<SpellSource[]> {
  const input = await loadSpellSourcesInput(persId);
  return input ? findSpellSources(input) : [];
}

/** Джерела, за якими лист малює КС і атаку — в обох редакціях, із характеристикою підкласу для третинних. */
export async function loadPersSpellcastingSources(persId: number): Promise<SpellSource[]> {
  const input = await loadSpellSourcesInput(persId);
  return input ? findSpellcastingSources(input) : [];
}

async function loadSpellSourcesInput(persId: number): Promise<SpellSourcesInput | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      ruleset: true,
      class: { select: CASTING_CLASS_SELECT },
      subclass: { select: CASTING_CLASS_SELECT },
      multiclasses: { select: { class: { select: CASTING_CLASS_SELECT }, subclass: { select: CASTING_CLASS_SELECT } } },
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
          feat: { select: { name: true, grantsFeature: { select: { givesSpells: { select: { spellId: true } } } } } },
          choices: { select: { choiceOption: { select: { effectKind: true, effectAbility: true } } } },
        },
      },
    },
  });

  if (!pers) return null;

  return {
    ruleset: pers.ruleset as RulesetId,
    characterClasses: collectSpellcastingClasses(pers),
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
        featGrantsSpells: persFeat.feat.grantsFeature.some((feature) => feature.givesSpells.length > 0),
      })),
    ),
  };
}

type ClassRow = { name: string; spellcastingType: string; primaryCastingStat: string | null };

export type PersClassRows = {
  class: ClassRow | null;
  subclass: ClassRow | null;
  multiclasses: ReadonlyArray<{ class: ClassRow | null; subclass: ClassRow | null }>;
};

/** Початковий клас і кожен побічний, кожен зі своїм підкласом — у порядку взяття класів. */
export function collectSpellcastingClasses(pers: PersClassRows): SpellcastingClass[] {
  const pairs = [
    { class: pers.class, subclass: pers.subclass },
    ...pers.multiclasses.map((entry) => ({ class: entry.class, subclass: entry.subclass })),
  ];

  return pairs.flatMap((pair) => (pair.class ? [toSpellcastingClass(pair.class, pair.subclass)] : []));
}

function toSpellcastingClass(characterClass: ClassRow, subclass: ClassRow | null): SpellcastingClass {
  return {
    name: characterClass.name,
    spellcastingType: characterClass.spellcastingType,
    primaryCastingStat: characterClass.primaryCastingStat as AbilityKey | null,
    subclass: subclass
      ? {
          name: subclass.name,
          spellcastingType: subclass.spellcastingType,
          primaryCastingStat: subclass.primaryCastingStat as AbilityKey | null,
        }
      : null,
  };
}

type FeatureRow = { engName: string; name: string; givesSpells: Array<{ spellId: number }> };

function toFeatureWithSpells(feature: FeatureRow) {
  return { engName: feature.engName, name: feature.name, spellIds: feature.givesSpells.map((spell) => spell.spellId) };
}
