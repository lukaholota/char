import type { AssemblyChoiceContext, LevelStep, ReadyPresetLevels } from "./ready-preset-levels";

export const ADVANCEMENT_ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type AdvancementAbility = (typeof ADVANCEMENT_ABILITIES)[number];
export type AbilityGain = { ability: AdvancementAbility; amount: number };

export type AdvancementChoice =
  | { kind: "asi"; abilities: [AdvancementAbility, AdvancementAbility] }
  | { kind: "feat"; featKey: string; optionNameEng: string | null };
export type AdvancementChoices = Record<string, AdvancementChoice>;

export type FeatPoolOption = { nameEng: string; name: string; gains: AbilityGain[] };
export type FeatPoolEntry = { key: string; name: string; gains: AbilityGain[]; optionGroupLabel: string | null; options: FeatPoolOption[] };

export type OpenAdvancementRequest = {
  characterLevel: number;
  featKey?: string;
  featOptions?: { optionNameEng: string }[];
  abilityScoreIncrease?: { ability: AdvancementAbility; amount: 1 | 2 }[];
};

const MAX_ABILITY_SCORE = 20;

export function buildAdvancementKey(characterLevel: number): string {
  return String(characterLevel);
}

export function listOpenAdvancementSteps(levels: ReadyPresetLevels, targetLevel: number): LevelStep[] {
  return levels.steps.filter((step) => step.characterLevel <= targetLevel && step.advancement);
}

export function findEffectiveAdvancement(step: LevelStep, choices: AdvancementChoices): AdvancementChoice | null {
  if (!step.advancement) return null;
  return choices[buildAdvancementKey(step.characterLevel)] ?? step.advancement.default;
}

export function listChoiceGains(choice: AdvancementChoice, pool: readonly FeatPoolEntry[]): AbilityGain[] {
  if (choice.kind === "asi") return mergeGains(choice.abilities.map((ability) => ({ ability, amount: 1 })));
  const feat = pool.find((entry) => entry.key === choice.featKey);
  const option = feat?.options.find((entry) => entry.nameEng === choice.optionNameEng);
  return [...(feat?.gains ?? []), ...(option?.gains ?? [])];
}

export function listStepGains(step: LevelStep, choices: AdvancementChoices, pool: readonly FeatPoolEntry[]): AbilityGain[] {
  const choice = findEffectiveAdvancement(step, choices);
  return choice ? listChoiceGains(choice, pool) : step.fixedGains;
}

export function listAbilityScoresBeforeLevel(context: AssemblyChoiceContext, characterLevel: number): Record<AdvancementAbility, number> {
  const scores = { ...context.start.abilities };
  const earlierSteps = context.levels.steps.filter((step) => step.characterLevel < characterLevel && step.characterLevel <= context.targetLevel);
  for (const step of earlierSteps) {
    for (const gain of listStepGains(step, context.advancements, context.levels.featPool)) scores[gain.ability] = Math.min(MAX_ABILITY_SCORE, scores[gain.ability] + gain.amount);
  }
  return scores;
}

export function listFeatKeysBeforeLevel(context: AssemblyChoiceContext, characterLevel: number): string[] {
  const fromSteps = context.levels.steps
    .filter((step) => step.characterLevel < characterLevel && step.characterLevel <= context.targetLevel)
    .flatMap((step) => {
      const choice = findEffectiveAdvancement(step, context.advancements);
      if (!choice) return step.featKey ? [step.featKey] : [];
      return choice.kind === "feat" ? [choice.featKey] : [];
    });
  return [...context.start.featKeys, ...fromSteps];
}

export function isAbilityRaisable(scores: Record<AdvancementAbility, number>, ability: AdvancementAbility, amount: number): boolean {
  return scores[ability] + amount <= MAX_ABILITY_SCORE;
}

export function findAdvancementProblem(context: AssemblyChoiceContext): string | null {
  for (const step of listOpenAdvancementSteps(context.levels, context.targetLevel)) {
    const choice = findEffectiveAdvancement(step, context.advancements)!;
    const problem = choice.kind === "asi" ? findAsiProblem(context, step, choice) : findFeatProblem(context, step, choice);
    if (problem) return `Рівень ${step.characterLevel}, ${step.className}: ${problem}`;
  }
  return null;
}

function findAsiProblem(context: AssemblyChoiceContext, step: LevelStep, choice: Extract<AdvancementChoice, { kind: "asi" }>): string | null {
  const scores = listAbilityScoresBeforeLevel(context, step.characterLevel);
  const [first, second] = choice.abilities;
  if (!ADVANCEMENT_ABILITIES.includes(first) || !ADVANCEMENT_ABILITIES.includes(second)) return "оберіть характеристики для підвищення.";
  const gains = mergeGains(choice.abilities.map((ability) => ({ ability, amount: 1 })));
  return gains.every((gain) => isAbilityRaisable(scores, gain.ability, gain.amount)) ? null : "характеристика не може перевищити 20.";
}

function findFeatProblem(context: AssemblyChoiceContext, step: LevelStep, choice: Extract<AdvancementChoice, { kind: "feat" }>): string | null {
  const feat = context.levels.featPool.find((entry) => entry.key === choice.featKey) ?? findDefaultFeat(step, choice);
  if (!feat) return "обрану рису не можна взяти на цьому рівні.";
  if (listFeatKeysBeforeLevel(context, step.characterLevel).includes(feat.key)) return `риса «${feat.name}» вже є в персонажа.`;
  if (feat.options.length && !feat.options.some((option) => option.nameEng === choice.optionNameEng)) return `для риси «${feat.name}» оберіть ${feat.optionGroupLabel?.toLowerCase() ?? "варіант"}.`;
  const scores = listAbilityScoresBeforeLevel(context, step.characterLevel);
  const gains = listChoiceGains(choice, context.levels.featPool);
  return gains.every((gain) => isAbilityRaisable(scores, gain.ability, gain.amount)) ? null : `риса «${feat.name}» підняла б характеристику вище 20.`;
}

function findDefaultFeat(step: LevelStep, choice: Extract<AdvancementChoice, { kind: "feat" }>): FeatPoolEntry | null {
  const fallback = step.advancement?.defaultFeat;
  return fallback && fallback.key === choice.featKey ? fallback : null;
}

export function buildAdvancementSelections(levels: ReadyPresetLevels, targetLevel: number, choices: AdvancementChoices): OpenAdvancementRequest[] {
  return listOpenAdvancementSteps(levels, targetLevel).flatMap((step) => {
    const choice = choices[buildAdvancementKey(step.characterLevel)];
    return choice ? [toRequest(step.characterLevel, choice)] : [];
  });
}

function toRequest(characterLevel: number, choice: AdvancementChoice): OpenAdvancementRequest {
  if (choice.kind === "feat") {
    return { characterLevel, featKey: choice.featKey, ...(choice.optionNameEng ? { featOptions: [{ optionNameEng: choice.optionNameEng }] } : {}) };
  }
  return { characterLevel, abilityScoreIncrease: mergeGains(choice.abilities.map((ability) => ({ ability, amount: 1 }))).map((gain) => ({ ability: gain.ability, amount: gain.amount as 1 | 2 })) };
}

export function mergeGains(gains: readonly AbilityGain[]): AbilityGain[] {
  const totals = new Map<AdvancementAbility, number>();
  for (const gain of gains) totals.set(gain.ability, (totals.get(gain.ability) ?? 0) + gain.amount);
  return [...totals].map(([ability, amount]) => ({ ability, amount }));
}
