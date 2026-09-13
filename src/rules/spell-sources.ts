/**
 * KR18.4 — джерела заклинань персонажа 2024.
 *
 * У 2024 персонаж чаклує з кількох незалежних джерел, і кожне має власну характеристику
 * замовляння (референс §15.3, §15.9): книга чарівника — Інтелектом, заклинання родоводу —
 * тим, що обрав гравець, риса «Посвячений у магію» — характеристикою обраного списку.
 *
 * Джерело — **виведена** величина, а не рядок у базі. Клас дає список, із якого гравець
 * обирає (`spell_classes`), тому Бард без жодного вивченого заклинання все одно має джерело
 * «Бард · Харизма». Матеріалізуються тільки ті заклинання, які правило називає поіменно —
 * заклинання видів; їх повертає `findGrantedSpells`.
 */

import type { AbilityKey } from "./types";
import type { RulesetId } from "./strategies/types";
import { hasCharacterLevelAtLeast, type CharacterLevels } from "./character-level";

export type SpellSourceKind = "CLASS" | "SPECIES" | "FEAT";

export type SpellSource = {
  key: string;
  name: string;
  ability: AbilityKey | null;
  kind: SpellSourceKind;
};

export type SpellcastingSubclass = {
  name: string;
  spellcastingType: string;
  primaryCastingStat: AbilityKey | null;
};

export type SpellcastingClass = {
  name: string;
  spellcastingType: string;
  primaryCastingStat: AbilityKey | null;
  /** Третинний заклинач (Лицар-Чаклун, Містичний спритник) чаклує підкласом: клас сам порожній. */
  subclass?: SpellcastingSubclass | null;
};

export type ChosenRaceChoiceOption = {
  optionName: string;
  spellcastingAbility: AbilityKey | null;
  traitFeature: { engName: string; name: string } | null;
  grantedFeatures: readonly FeatureWithSpells[];
  /** Колонки Level 3 і Level 5 таблиці родоводів PHB 2024 — заклинання без окремої риси. */
  leveledSpells: readonly LeveledOptionSpell[];
};

export type LeveledOptionSpell = { spellId: number; characterLevel: number };

export type FeatureWithSpells = {
  engName: string;
  name: string;
  spellIds: readonly number[];
  /** Рівень персонажа, з якого риса діє. Не вказано — з першого, як `race_trait.level DEFAULT 1`. */
  level?: number;
};

/** Риса персонажа разом із опцією, яку в ній обрали: «Посвячений у магію» → список чарівника. */
export type ChosenFeatOption = {
  featName: string;
  effectKind: string | null;
  effectAbility: AbilityKey | null;
  /** Доторк феї: заклинання риси чаклуються тією характеристикою, яку риса підвищила. */
  featGrantsSpells: boolean;
};

export type GrantedSpell = {
  spellId: number;
  sourceKey: string;
  sourceName: string;
  ability: AbilityKey | null;
};

export type SpellSourcesInput = {
  ruleset: RulesetId;
  /** Початковий клас і кожен побічний: у мультикласі 2024 кожен клас чаклує своєю характеристикою (§15.9). */
  characterClasses: readonly SpellcastingClass[];
  raceTraits: readonly FeatureWithSpells[];
  raceChoiceOptions: readonly ChosenRaceChoiceOption[];
  featOptions: readonly ChosenFeatOption[];
};

export function findSpellSources(input: SpellSourcesInput): SpellSource[] {
  if (input.ruleset !== "RULES_2024") return [];

  return [
    ...findClassSources(input.characterClasses),
    ...findSpeciesSource(input.raceTraits, input.raceChoiceOptions),
    ...findFeatSources(input.featOptions),
  ];
}

/**
 * Джерела, за якими лист рахує КС і атаку заклинань. В обох редакціях кожен клас мультикласу
 * чаклує своєю характеристикою (PHB 2014, с. 164; SRD 5.2.1, Multiclassing → Spellcasting),
 * а третинний заклинач бере її з підкласу. Джерела виду й рис — поняття 2024, як і в
 * `findSpellSources`; 2014 бачить лише класи.
 */
export function findSpellcastingSources(input: SpellSourcesInput): SpellSource[] {
  if (input.ruleset === "RULES_2024") return findSpellSources(input);

  return findClassSources(input.characterClasses);
}

/**
 * Заклинання, які правило видає поіменно: замовляння родоводу й рис виду. Вибір гравця тут
 * лише один — сам родовід; конкретні заклинання далі диктує книга.
 */
export function findGrantedSpells(input: {
  ruleset: RulesetId;
  levels: CharacterLevels;
  raceTraits: readonly FeatureWithSpells[];
  raceChoiceOptions: readonly ChosenRaceChoiceOption[];
}): GrantedSpell[] {
  if (input.ruleset !== "RULES_2024") return [];

  const [source] = findSpeciesSource(input.raceTraits, input.raceChoiceOptions);
  if (!source) return [];

  const earnedTraits = input.raceTraits.filter((trait) => hasCharacterLevelAtLeast(input.levels, trait.level ?? 1));
  const spellIds = [
    ...collectSpeciesSpellIds(earnedTraits, input.raceChoiceOptions),
    ...collectEarnedLeveledSpellIds(input.raceChoiceOptions, input.levels),
  ];

  return Array.from(new Set(spellIds)).map((spellId) => ({
    spellId,
    sourceKey: source.key,
    sourceName: source.name,
    ability: source.ability,
  }));
}

/** Заклинання родоводу 3-го і 5-го рівня — гейт саме на рівні ПЕРСОНАЖА, не класу (§4). */
function collectEarnedLeveledSpellIds(
  raceChoiceOptions: readonly ChosenRaceChoiceOption[],
  levels: CharacterLevels,
): number[] {
  return raceChoiceOptions
    .flatMap((option) => option.leveledSpells)
    .filter((spell) => hasCharacterLevelAtLeast(levels, spell.characterLevel))
    .map((spell) => spell.spellId);
}

function findClassSources(characterClasses: readonly SpellcastingClass[]): SpellSource[] {
  const sources = characterClasses.flatMap((characterClass): SpellSource[] => {
    const caster = findCastingAbilityOwner(characterClass);
    if (!caster) return [];

    return [{ key: characterClass.name, name: caster.name, ability: caster.primaryCastingStat, kind: "CLASS" }];
  });

  return dedupeByKey(sources);
}

function findCastingAbilityOwner(characterClass: SpellcastingClass): SpellcastingClass | SpellcastingSubclass | null {
  if (characterClass.spellcastingType !== "NONE") return characterClass;

  const subclass = characterClass.subclass;
  return subclass && subclass.spellcastingType !== "NONE" ? subclass : null;
}

/**
 * Вид дає щонайбільше одне джерело: PHB 2024 привʼязує всі заклинання виду до однієї
 * характеристики, обраної разом із родоводом («Потойбічна присутність» тифлінга чаклується
 * тією ж характеристикою, що й «Почварна спадщина»).
 */
function findSpeciesSource(
  raceTraits: readonly FeatureWithSpells[],
  raceChoiceOptions: readonly ChosenRaceChoiceOption[],
): SpellSource[] {
  const givesAnySpell =
    collectSpeciesSpellIds(raceTraits, raceChoiceOptions).length > 0 ||
    raceChoiceOptions.some((option) => option.leveledSpells.length > 0);
  if (!givesAnySpell) return [];

  const abilityChoice = raceChoiceOptions.find((option) => option.spellcastingAbility && option.traitFeature);
  if (abilityChoice?.traitFeature) {
    return [
      {
        key: abilityChoice.traitFeature.engName,
        name: abilityChoice.traitFeature.name,
        ability: abilityChoice.spellcastingAbility,
        kind: "SPECIES",
      },
    ];
  }

  const granting = findGrantingTrait(raceTraits, raceChoiceOptions);
  if (!granting) return [];

  const ability = FIXED_TRAIT_SPELLCASTING_ABILITIES[granting.engName] ?? null;
  return [{ key: granting.engName, name: granting.name, ability, kind: "SPECIES" }];
}

/** Риса, що сама називає характеристику замовляння, вибору не питає: «Charisma is your spellcasting ability for it». */
const FIXED_TRAIT_SPELLCASTING_ABILITIES: Readonly<Record<string, AbilityKey>> = {
  "Aasimar: Light Bearer (2024)": "CHA",
};

/**
 * Риса стає джерелом заклинань, коли обрана в ній опція називає характеристику замовляння.
 * Підвищення характеристики (`effectKind: ASI`) додає лише +1 до значення — окрім рис, що самі
 * дають заклинання: там книга каже «the spells' spellcasting ability is the ability increased by this feat».
 */
function findFeatSources(featOptions: readonly ChosenFeatOption[]): SpellSource[] {
  const sources = featOptions
    .filter((option) => option.effectAbility && (option.effectKind !== "ASI" || option.featGrantsSpells))
    .map((option): SpellSource => ({
      key: option.featName,
      name: option.featName,
      ability: option.effectAbility,
      kind: "FEAT",
    }));

  return dedupeByKey(sources);
}

function collectSpeciesSpellIds(
  raceTraits: readonly FeatureWithSpells[],
  raceChoiceOptions: readonly ChosenRaceChoiceOption[],
): number[] {
  const fromChoices = raceChoiceOptions.flatMap((option) => option.grantedFeatures);
  const spellIds = [...raceTraits, ...fromChoices].flatMap((feature) => feature.spellIds);

  return Array.from(new Set(spellIds));
}

function findGrantingTrait(
  raceTraits: readonly FeatureWithSpells[],
  raceChoiceOptions: readonly ChosenRaceChoiceOption[],
): FeatureWithSpells | null {
  const fromChoices = raceChoiceOptions.flatMap((option) => option.grantedFeatures);

  return [...raceTraits, ...fromChoices].find((feature) => feature.spellIds.length > 0) ?? null;
}

function dedupeByKey(sources: readonly SpellSource[]): SpellSource[] {
  const byKey = new Map<string, SpellSource>();
  for (const source of sources) {
    if (!byKey.has(source.key)) byKey.set(source.key, source);
  }

  return Array.from(byKey.values());
}
