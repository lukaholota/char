import type { AbilityKey, AbilityScores } from "./types";
import { STANDARD_ABILITY_SCORE_CEILING, raiseAbilityScore } from "./ability-score-ceiling";

type UnknownRecord = Record<string, unknown>;

export type AbilityScoreChoice = {
  groupIndex: number;
  selectedAbilities: string[];
};

export type AbilityScoreChoiceGroup = {
  groupName: string;
  value: number;
  choiceCount: number;
  unique: boolean;
};

const ABILITY_KEYS = new Set<AbilityKey>(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

export function isAbilityKey(value: string): value is AbilityKey {
  return ABILITY_KEYS.has(value.toUpperCase() as AbilityKey);
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getChildRecord(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) return null;
  const child = value[key];
  return isRecord(child) ? child : null;
}

export function getSimpleBonuses(asi: unknown): Record<string, number> {
  const basic = getChildRecord(asi, "basic");
  const simple = getChildRecord(basic, "simple");
  if (!simple) return {};

  const bonuses: Record<string, number> = {};
  for (const [ability, rawBonus] of Object.entries(simple)) {
    if (!isAbilityKey(ability)) continue;
    const bonus = typeof rawBonus === "number" ? rawBonus : typeof rawBonus === "string" ? Number(rawBonus) : NaN;
    if (Number.isFinite(bonus)) bonuses[ability] = bonus;
  }
  return bonuses;
}

export function getPlainBonuses(asi: unknown): Record<string, number> {
  if (!isRecord(asi)) return {};
  if ("basic" in asi || "tasha" in asi || "flexible" in asi) return {};

  const bonuses: Record<string, number> = {};
  for (const [ability, rawBonus] of Object.entries(asi)) {
    if (!isAbilityKey(ability)) continue;
    const bonus = typeof rawBonus === "number" ? rawBonus : typeof rawBonus === "string" ? Number(rawBonus) : NaN;
    if (Number.isFinite(bonus) && bonus !== 0) bonuses[ability] = bonus;
  }
  return bonuses;
}

export function addAbilityBonuses(
  scores: Record<string, number>,
  bonuses: Record<string, number>,
): Record<string, number> {
  const updatedScores = { ...scores };
  for (const [ability, bonus] of Object.entries(bonuses)) {
    if (updatedScores[ability] == null) continue;
    updatedScores[ability] += Number(bonus) || 0;
  }
  return updatedScores;
}

export function normalizeASI(asi: unknown): UnknownRecord | null {
  if (!isRecord(asi)) return null;

  let normalized: UnknownRecord;
  try {
    const cloned = JSON.parse(JSON.stringify(asi));
    normalized = isRecord(cloned) ? cloned : { ...asi };
  } catch {
    normalized = { ...asi };
  }

  if (!isRecord(normalized.basic)) {
    const flexible = getChildRecord(normalized, "flexible");
    if (Array.isArray(flexible?.groups)) {
      normalized.basic = { simple: {}, flexible };
    }
  }

  if (!isRecord(normalized.basic)) {
    const tasha = getChildRecord(normalized, "tasha");
    const flexible = getChildRecord(tasha, "flexible");
    if (flexible) normalized.basic = { simple: {}, flexible };
  }

  const basic = getChildRecord(normalized, "basic");
  if (basic && !isRecord(basic.simple)) basic.simple = {};

  return normalized;
}

export function extractFlexibleGroups(asi: unknown, mode: "basic" | "tasha"): unknown[] {
  const normalized = normalizeASI(asi);
  if (!normalized) return [];

  const container = getChildRecord(normalized, mode);
  const flexible = getChildRecord(container, "flexible");
  return Array.isArray(flexible?.groups) ? flexible.groups : [];
}

export function plainAsiChoiceGroups(asi: unknown): AbilityScoreChoiceGroup[] {
  const groupsByBonus = new Map<number, number>();
  for (const bonus of Object.values(getPlainBonuses(asi))) {
    if (!Number.isFinite(bonus) || bonus === 0) continue;
    groupsByBonus.set(bonus, (groupsByBonus.get(bonus) ?? 0) + 1);
  }

  return Array.from(groupsByBonus.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([value, choiceCount]) => ({
      groupName: `+${value} до ${choiceCount}`,
      value,
      choiceCount,
      unique: true,
    }));
}

export function applyRacialChoices(
  scores: Record<string, number>,
  choices: AbilityScoreChoice[] | undefined,
  groups: unknown[],
): Record<string, number> {
  if (!choices?.length) return { ...scores };

  const updatedScores = { ...scores };
  for (const choice of choices) {
    const group = groups[choice.groupIndex];
    const rawValue = isRecord(group) ? group.value : undefined;
    const bonus = typeof rawValue === "number" ? rawValue : Number(rawValue) || 1;
    for (const ability of choice.selectedAbilities) {
      if (updatedScores[ability] == null) continue;
      updatedScores[ability] += bonus;
    }
  }
  return updatedScores;
}

export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function applyAbilityScoreIncrease(
  scores: AbilityScores,
  ability: AbilityKey,
  increase: number,
): AbilityScores {
  return { ...scores, [ability]: raiseAbilityScore(scores[ability], increase, STANDARD_ABILITY_SCORE_CEILING) };
}

export type CustomAsiEntry = { ability?: string; value?: string | number };

/** PHB — ASI: одна характеристика +2, або дві по +1 кожній, і жодна двічі в одному пакеті. */
export function findCustomAsiPackageProblem(customAsi: unknown): string | null {
  if (!Array.isArray(customAsi)) return null;
  const entries = (customAsi as CustomAsiEntry[]).filter((entry) => entry?.ability != null);
  if (!entries.length) return null;

  const seenAbilities = new Set<string>();
  let total = 0;
  for (const entry of entries) {
    const ability = String(entry.ability ?? "").toUpperCase();
    const delta = Number(entry.value);
    if (!isAbilityKey(ability)) return "Невідома характеристика в пакеті підвищення";
    if (delta !== 1 && delta !== 2) return "Підвищення характеристики має бути +1 або +2";
    if (seenAbilities.has(ability)) return "Кожна характеристика підвищується не більше одного разу за раз";
    seenAbilities.add(ability);
    total += delta;
  }

  if (total !== 2) return "Підвищення характеристик — рівно 2 очки: одна +2 або дві по +1";

  return null;
}
