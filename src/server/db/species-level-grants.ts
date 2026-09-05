/**
 * KR18.5 — що вид завинив персонажу на його рівні.
 *
 * Один і той самий підрахунок потрібен трьом викликам: майстер підвищення показує майбутні
 * гранти, серверна дія їх записує, ремонтний прогін добирає те, що персонаж проґавив, бо
 * створювався до цього KR. Тому питання формулюється не як «що додати на цьому рівні», а як
 * «що заслужено» мінус «що вже є» — і всі три отримують ту саму відповідь.
 */

import { SpellOrigin } from "@prisma/client";
import { characterLevelOnly } from "@/rules/character-level";
import { findGrantedSpells, type ChosenRaceChoiceOption, type GrantedSpell } from "@/rules/spell-sources";
import { findMissingSpeciesTraits } from "@/rules/species-grants";
import type { RulesetId } from "@/rules/strategies/types";
import type { AbilityKey } from "@/rules/types";

/** Колір бейджа заклинань виду на листі — той самий, що MagicSlide пропонує для раси. */
const SPECIES_SPELL_BADGE_COLOR = "#38bdf8";

type FeatureRow = { engName: string; name: string; givesSpells: Array<{ spellId: number }> };

type RaceTraitRow = { featureId: number; level: number; feature: FeatureRow };

type RaceChoiceOptionRow = {
  optionName: string;
  spellcastingAbility: string | null;
  traitFeature: { engName: string; name: string } | null;
  traits: Array<{ feature: FeatureRow }>;
  spells: Array<{ spellId: number; characterLevel: number }>;
};

export type SpeciesGrantsInput = {
  ruleset: string;
  characterLevel: number;
  raceTraits: readonly RaceTraitRow[];
  raceChoiceOptions: readonly RaceChoiceOptionRow[];
  ownedFeatureIds: readonly number[];
  ownedSpellIds: readonly number[];
};

export type SpeciesGrants = {
  traits: RaceTraitRow[];
  spells: GrantedSpell[];
};

export function findMissingSpeciesGrants(input: SpeciesGrantsInput): SpeciesGrants {
  const levels = characterLevelOnly(input.characterLevel);
  const owned = new Set(input.ownedSpellIds);
  const earnedSpells = findGrantedSpells({
    ruleset: input.ruleset as RulesetId,
    levels,
    raceTraits: input.raceTraits.map((trait) => ({ ...toFeatureWithSpells(trait.feature), level: trait.level })),
    raceChoiceOptions: input.raceChoiceOptions.map(toChosenRaceChoiceOption),
  });

  return {
    traits: findMissingSpeciesTraits(input.raceTraits, levels, input.ownedFeatureIds),
    spells: earnedSpells.filter((spell) => !owned.has(spell.spellId)),
  };
}

function toFeatureWithSpells(feature: FeatureRow) {
  return { engName: feature.engName, name: feature.name, spellIds: feature.givesSpells.map((spell) => spell.spellId) };
}

function toChosenRaceChoiceOption(option: RaceChoiceOptionRow): ChosenRaceChoiceOption {
  return {
    optionName: option.optionName,
    spellcastingAbility: option.spellcastingAbility as AbilityKey | null,
    traitFeature: option.traitFeature,
    grantedFeatures: option.traits.map((trait) => toFeatureWithSpells(trait.feature)),
    leveledSpells: option.spells,
  };
}

/**
 * Заклинання виду лягають окремими рядками зі своїм джерелом і не зʼїдають ліміт класу.
 * Створення й підвищення рівня пишуть їх однаково — рядок будується тут, в одному місці.
 */
export function buildSpeciesPersSpellRows(persId: number, spells: readonly GrantedSpell[], learnedAtLevel: number) {
  return spells.map((spell) => ({
    persId,
    spellId: spell.spellId,
    learnedAtLevel,
    origin: SpellOrigin.RACE,
    sourceName: spell.sourceKey,
    isPrepared: true,
    badgeText: spell.sourceName.slice(0, 24),
    badgeColor: SPECIES_SPELL_BADGE_COLOR,
    excludeFromPreparedCount: true,
    excludeFromKnownCount: true,
  }));
}
