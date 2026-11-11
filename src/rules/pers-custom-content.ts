import { parseCustomRollFormulas } from "./custom-roll-formula";
import type { AbilityKey } from "./types";

const ABILITY_KEYS: readonly string[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const SKILL_PROFICIENCIES = ["NONE", "HALF", "PROFICIENT", "EXPERTISE"] as const;
const FEATURE_RESTS = ["SHORT_REST", "LONG_REST"] as const;
const MAX_SKILL_NAME = 60;
const MAX_FEATURE_NAME = 100;
const MAX_FEATURE_DESCRIPTION = 4000;
const MAX_ROLL_FORMULA = 200;
const MAX_SKILL_BONUS = 30;
export const MAX_FEATURE_USES = 999;

export const MAX_CUSTOM_SKILLS = 30;
export const MAX_CUSTOM_FEATURES = 40;

export type CustomSkillProficiency = (typeof SKILL_PROFICIENCIES)[number];
export type CustomFeatureRest = (typeof FEATURE_RESTS)[number];
export type CustomSkillInput = { name: string; ability: AbilityKey; proficiencyType: CustomSkillProficiency; bonus: number };
export type CustomFeatureInput = { name: string; description: string; rollFormula: string | null; usesMax: number | null; restoredOn: CustomFeatureRest | null };
export type CustomSkillDraft = Record<"name" | "ability" | "proficiencyType" | "bonus", string>;
export type CustomFeatureDraft = Record<"name" | "description" | "rollFormula" | "usesMax" | "restoredOn", string>;
export type CustomContentErrors<Draft> = Partial<Record<keyof Draft, string>>;
export type CustomContentReading<Input, Draft> = { ok: true; input: Input } | { ok: false; errors: CustomContentErrors<Draft> };
type CustomFeatureUses = { usesMax: number | null; usesRemaining: number | null; restoredOn: string | null };

export function readCustomSkillDraft(raw: unknown): CustomContentReading<CustomSkillInput, CustomSkillDraft> {
  const draft = readTextFields(raw, ["name", "ability", "proficiencyType", "bonus"]);
  const name = draft.name.trim();
  const bonus = draft.bonus.trim() === "" ? 0 : readInteger(draft.bonus);
  const errors: CustomContentErrors<CustomSkillDraft> = {};
  if (!name) errors.name = "Вкажіть назву навички.";
  else if (name.length > MAX_SKILL_NAME) errors.name = `Назва може мати до ${MAX_SKILL_NAME} символів.`;
  if (!ABILITY_KEYS.includes(draft.ability)) errors.ability = "Оберіть характеристику.";
  if (!isSkillProficiency(draft.proficiencyType)) errors.proficiencyType = "Оберіть рівень майстерності.";
  if (bonus === null || Math.abs(bonus) > MAX_SKILL_BONUS) errors.bonus = `Бонус має бути цілим числом від −${MAX_SKILL_BONUS} до ${MAX_SKILL_BONUS}.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, input: { name, ability: draft.ability as AbilityKey, proficiencyType: draft.proficiencyType as CustomSkillProficiency, bonus: bonus as number } };
}

export function readCustomFeatureDraft(raw: unknown): CustomContentReading<CustomFeatureInput, CustomFeatureDraft> {
  const draft = readTextFields(raw, ["name", "description", "rollFormula", "usesMax", "restoredOn"]);
  const name = draft.name.trim();
  const description = draft.description.trim();
  const rollFormula = draft.rollFormula.trim();
  const hasUses = draft.usesMax.trim() !== "";
  const usesMax = hasUses ? readInteger(draft.usesMax) : null;
  const errors: CustomContentErrors<CustomFeatureDraft> = {};
  if (!name) errors.name = "Вкажіть назву.";
  else if (name.length > MAX_FEATURE_NAME) errors.name = `Назва може мати до ${MAX_FEATURE_NAME} символів.`;
  if (description.length > MAX_FEATURE_DESCRIPTION) errors.description = `Опис може мати до ${MAX_FEATURE_DESCRIPTION} символів.`;
  const formulaError = rollFormula.length > MAX_ROLL_FORMULA ? `Формула може мати до ${MAX_ROLL_FORMULA} символів.` : parseCustomRollFormulas(rollFormula).error;
  if (formulaError) errors.rollFormula = formulaError;
  if (hasUses && (usesMax === null || usesMax < 1 || usesMax > MAX_FEATURE_USES)) errors.usesMax = `Кількість має бути цілим числом від 1 до ${MAX_FEATURE_USES}.`;
  if (draft.restoredOn && !isFeatureRest(draft.restoredOn)) errors.restoredOn = "Оберіть, коли відновлюється.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    input: { name, description, rollFormula: rollFormula || null, usesMax, restoredOn: hasUses && isFeatureRest(draft.restoredOn) ? draft.restoredOn : null },
  };
}

/// Більший максимум одразу дає ці використання, менший лише обрізає залишок.
export function findUsesRemainingAfterEdit(previous: Pick<CustomFeatureUses, "usesMax" | "usesRemaining"> | null, usesMax: number | null): number | null {
  if (usesMax === null) return null;
  if (previous?.usesMax == null || previous.usesRemaining == null) return usesMax;
  return Math.min(usesMax, previous.usesRemaining + Math.max(0, usesMax - previous.usesMax));
}

export function findCustomRestTypes(rest: CustomFeatureRest): CustomFeatureRest[] {
  return rest === "LONG_REST" ? ["SHORT_REST", "LONG_REST"] : ["SHORT_REST"];
}

export function restoreCustomFeatures<T extends CustomFeatureUses>(features: T[], rest: CustomFeatureRest): T[] {
  const restTypes: readonly string[] = findCustomRestTypes(rest);
  return features.map((feature) => (feature.restoredOn && restTypes.includes(feature.restoredOn) ? { ...feature, usesRemaining: feature.usesMax } : feature));
}

function readTextFields<Key extends string>(raw: unknown, keys: readonly Key[]): Record<Key, string> {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(keys.map((key) => [key, typeof source[key] === "string" ? source[key] : ""])) as Record<Key, string>;
}

function readInteger(text: string): number | null {
  const normalized = text.trim().replace("−", "-");
  return /^[+-]?\d{1,4}$/.test(normalized) ? Number(normalized) : null;
}

function isSkillProficiency(value: string): value is CustomSkillProficiency {
  return (SKILL_PROFICIENCIES as readonly string[]).includes(value);
}

function isFeatureRest(value: string): value is CustomFeatureRest {
  return (FEATURE_RESTS as readonly string[]).includes(value);
}
