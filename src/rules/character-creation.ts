import {
  addAbilityBonuses,
  applyRacialChoices,
  calculateAbilityModifier,
  extractFlexibleGroups,
  getPlainBonuses,
  getSimpleBonuses,
  isAbilityKey,
  normalizeASI,
  plainAsiChoiceGroups,
} from "./abilities";
import { calculateInitialHitPoints } from "./health";
import { calculateCasterLevel } from "./spellcasting";
import type { AbilityKey, AbilityScores, BackgroundASIChoice, SpellcastingKind } from "./types";
import { getRulesStrategy } from "./strategies";
import type { RulesetId } from "./strategies/types";
import { STANDARD_ABILITY_SCORE_CEILING } from "./ability-score-ceiling";

export type CreationAbilityInput = {
  ruleset?: RulesetId;
  asiSystem: string;
  pointBuy: Array<{ ability: string; value: number }>;
  simple: Array<{ ability: string; value: number }>;
  custom?: Array<{ ability: string; value: string | number }>;
  isDefaultASI: boolean;
  raceASI: unknown;
  variantASI?: unknown;
  subraceASI?: unknown;
  subraceReplacesASI: boolean;
  racialChoices?: {
    basicChoices: Array<{ groupIndex: number; selectedAbilities: string[] }>;
    tashaChoices: Array<{ groupIndex: number; selectedAbilities: string[] }>;
  };
  raceChoiceAbilityBonuses?: Array<{ ASI: unknown }>;
  backgroundAbilityOptions?: readonly AbilityKey[];
  backgroundAsiChoice?: BackgroundASIChoice;
  feats: CreationFeatAbilityInput[];
};

export type CreationFeatAbilityInput = {
  grantedASI: unknown;
  selectedChoiceOptionIds: Array<number | number[]>;
  choiceOptions: Array<{
    choiceOptionId: number;
    optionNameEng?: string | null;
    effectKind?: string | null;
    effectAbility?: string | null;
    effectAmount?: number | null;
  }>;
  resilient: boolean;
};

export type CreationAbilityResult = {
  scores: AbilityScores;
  resilientSavingThrows: string[];
};

export type InitialCharacterRulesInput = CreationAbilityInput & {
  className: string | null | undefined;
  spellcastingType: SpellcastingKind | null | undefined;
  savingThrows: string[];
  hitDie: number;
  hasTough: boolean;
  /** Хіти за кожен рівень персонажа від рис виду — Dwarven Toughness і подібні. */
  traitHitPointsPerLevel?: number;
  standardProgression: Record<number, readonly number[]>;
  pactProgression: Record<number, { slots: number; level: number }>;
};

export function buildInitialCharacterState(input: InitialCharacterRulesInput): CreationAbilityResult & {
  currentSpellSlots: number[];
  currentPactSlots: number;
  maxHp: number;
  savingThrows: string[];
} {
  const abilityResult = buildCreationAbilityScores(input);
  const slots = getInitialSpellSlots(input);
  return {
    ...abilityResult,
    ...slots,
    maxHp: getInitialHitPoints(input.hitDie, abilityResult.scores.CON, input.hasTough) + (input.traitHitPointsPerLevel ?? 0),
    savingThrows: Array.from(new Set([...input.savingThrows, ...abilityResult.resilientSavingThrows])),
  };
}

export function buildCreationAbilityScores(input: CreationAbilityInput): CreationAbilityResult {
  const ruleset: RulesetId = input.ruleset ?? "RULES_2014";
  const strategy = getRulesStrategy(ruleset);

  let scores = buildBaseAbilityScores(input);

  if (ruleset === "RULES_2024") {
    scores = strategy.applySpeciesASI(scores, input.raceASI);
    if (input.backgroundAbilityOptions && input.backgroundAsiChoice) {
      scores = strategy.applyBackgroundASI(scores, input.backgroundAbilityOptions, input.backgroundAsiChoice);
    }
  } else {
    scores = applyRacialAbilityScores(scores, input);
  }

  const resilientSavingThrows: string[] = [];
  for (const feat of input.feats) {
    const result = applyFeatAbilityScores(scores, feat);
    scores = result.scores;
    if (result.resilientSavingThrow) resilientSavingThrows.push(result.resilientSavingThrow);
  }

  scores = applyRaceChoiceAbilityBonuses(scores, input.raceChoiceAbilityBonuses ?? []);

  return {
    scores: clampAbilityScores(scores),
    resilientSavingThrows: Array.from(new Set(resilientSavingThrows)),
  };
}

function applyRaceChoiceAbilityBonuses(scores: AbilityScores, choices: Array<{ ASI: unknown }>): AbilityScores {
  return choices.reduce((updated, choice) => {
    const withPlainBonuses = addAbilityBonuses(updated, getPlainBonuses(choice.ASI));
    return addAbilityBonuses(withPlainBonuses, getSimpleBonuses(normalizeASI(choice.ASI))) as AbilityScores;
  }, scores);
}

export function getInitialSpellSlots(input: {
  ruleset?: RulesetId;
  className: string | null | undefined;
  spellcastingType: SpellcastingKind | null | undefined;
  standardProgression: Record<number, readonly number[]>;
  pactProgression: Record<number, { slots: number; level: number }>;
}): { currentSpellSlots: number[]; currentPactSlots: number } {
  // Паладин і слідопит 2024 мають слоти вже на 1-му рівні: половина вгору дає рівень заклинача 1.
  const caster = calculateCasterLevel(
    { level: 1, characterClass: { name: input.className, spellcastingType: input.spellcastingType } },
    input.ruleset ?? "RULES_2014",
  );
  const standard = input.standardProgression[caster.casterLevel] ?? [];
  const pact = input.pactProgression[caster.pactLevel];

  return {
    currentSpellSlots: Array.from({ length: 9 }, (_, index) => toSlotCount(standard[index])),
    currentPactSlots: toSlotCount(pact?.slots),
  };
}

export function getInitialHitPoints(hitDie: number, constitutionScore: number, hasTough: boolean): number {
  return calculateInitialHitPoints(hitDie, calculateAbilityModifier(constitutionScore)) + (hasTough ? 2 : 0);
}

function buildBaseAbilityScores(input: CreationAbilityInput): AbilityScores {
  const scores: AbilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
  const selected = input.asiSystem === "POINT_BUY" ? input.pointBuy : input.asiSystem === "SIMPLE" ? input.simple : input.custom ?? [];
  for (const entry of selected) {
    if (isAbilityKey(entry.ability)) scores[entry.ability] = Number(entry.value);
  }
  return scores;
}

function applyRacialAbilityScores(scores: AbilityScores, input: CreationAbilityInput): AbilityScores {
  const effectiveASI = input.variantASI ?? (input.subraceReplacesASI ? input.subraceASI : input.raceASI);
  let updated = scores;
  if (input.isDefaultASI) {
    updated = addAbilityBonuses(updated, getSimpleBonuses(normalizeASI(effectiveASI))) as AbilityScores;
    updated = addAbilityBonuses(updated, getPlainBonuses(effectiveASI)) as AbilityScores;
    if (!input.subraceReplacesASI) updated = addAbilityBonuses(updated, getPlainBonuses(input.subraceASI)) as AbilityScores;
  }

  if (!input.racialChoices) return updated;
  const choices = input.isDefaultASI ? input.racialChoices.basicChoices : input.racialChoices.tashaChoices;
  const raceGroups = extractFlexibleGroups(effectiveASI, input.isDefaultASI ? "basic" : "tasha");
  const fallbackGroups = raceGroups.length === 0 ? plainAsiChoiceGroups(effectiveASI) : [];
  const extraGroups = !input.isDefaultASI && !input.subraceReplacesASI ? plainAsiChoiceGroups(input.subraceASI) : [];
  return applyRacialChoices(updated, choices, [...raceGroups, ...fallbackGroups, ...extraGroups]) as AbilityScores;
}

function applyFeatAbilityScores(scores: AbilityScores, feat: CreationFeatAbilityInput): { scores: AbilityScores; resilientSavingThrow?: string } {
  let updated = addAbilityBonuses(scores, getPlainBonuses(feat.grantedASI)) as AbilityScores;
  updated = addAbilityBonuses(updated, getSimpleBonuses(feat.grantedASI)) as AbilityScores;
  let resilientSavingThrow: string | undefined;

  for (const selected of feat.selectedChoiceOptionIds.flatMap((value) => (Array.isArray(value) ? value : [value]))) {
    const option = feat.choiceOptions.find((candidate) => candidate.choiceOptionId === Number(selected));
    if (!option) continue;

    const ability = getAbilityFromChoiceOption(option);
    if (!ability) continue;
    updated = addAbilityBonuses(updated, { [ability]: option.effectKind === "ASI" ? Number(option.effectAmount ?? 1) || 1 : 1 }) as AbilityScores;
    if (feat.resilient) resilientSavingThrow = ability;
  }

  return { scores: updated, resilientSavingThrow };
}

function getAbilityFromChoiceOption(option: CreationFeatAbilityInput["choiceOptions"][number]): string | null {
  if (option.effectKind === "ASI" && option.effectAbility && isAbilityKey(option.effectAbility)) return option.effectAbility;
  const name = option.optionNameEng ?? "";
  if (name.includes("Strength")) return "STR";
  if (name.includes("Dexterity")) return "DEX";
  if (name.includes("Constitution")) return "CON";
  if (name.includes("Intelligence")) return "INT";
  if (name.includes("Wisdom")) return "WIS";
  if (name.includes("Charisma")) return "CHA";
  return null;
}

function clampAbilityScores(scores: AbilityScores): AbilityScores {
  return Object.fromEntries(Object.entries(scores).map(([ability, score]) => [ability, Number.isFinite(score) ? Math.min(STANDARD_ABILITY_SCORE_CEILING, score) : score])) as AbilityScores;
}

function toSlotCount(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value ?? 0)) : 0;
}
