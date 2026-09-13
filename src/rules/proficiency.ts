export type SkillProficiency = "NONE" | "HALF" | "PROFICIENT" | "EXPERTISE";

export type NormalizedSkillProficiency<Skill extends string> =
  | { type: "fixed"; skills: Skill[] }
  | { type: "choice"; choiceCount: number; options: Skill[] };

export const JACK_OF_ALL_TRADES_FEATURE_ENG_NAMES = ["Jack of All Trades", "Bard: Jack of all Trades (2024)"] as const;

export function hasJackOfAllTradesFeature(featureEngNames: readonly string[]): boolean {
  return featureEngNames.some((engName) => (JACK_OF_ALL_TRADES_FEATURE_ENG_NAMES as readonly string[]).includes(engName.trim()));
}

export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function calculateSkillProficiencyBonus(
  proficiency: SkillProficiency,
  proficiencyBonus: number,
  hasJackOfAllTrades: boolean,
): number {
  if (proficiency === "EXPERTISE") return proficiencyBonus * 2;
  if (proficiency === "PROFICIENT") return proficiencyBonus;
  if (proficiency === "HALF" || hasJackOfAllTrades) return Math.floor(proficiencyBonus / 2);
  return 0;
}

export function calculateSavingThrowProficiencyBonus(
  isProficient: boolean,
  proficiencyBonus: number,
): number {
  return isProficient ? proficiencyBonus : 0;
}

export function normalizeSkillProficiencies<Skill extends string>(
  value: unknown,
  allSkills: readonly Skill[],
): NormalizedSkillProficiency<Skill> | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    return { type: "fixed", skills: value.filter((skill): skill is Skill => allSkills.includes(skill as Skill)) };
  }

  if (typeof value !== "object") return null;

  const raw = value as { options?: unknown; choices?: unknown; choiceCount?: unknown; chooseAny?: unknown; any?: unknown };
  const anyCount = toFiniteNumber(raw.any);
  const choiceCount = toFiniteNumber(raw.choiceCount) ?? anyCount;
  const optionSource = Array.isArray(raw.options) ? raw.options : Array.isArray(raw.choices) ? raw.choices : [];
  const chooseAny = Boolean(raw.chooseAny) || optionSource.includes("ANY") || anyCount !== null;
  const options = chooseAny
    ? [...allSkills]
    : optionSource.filter((skill): skill is Skill => allSkills.includes(skill as Skill));

  if (choiceCount === null || choiceCount <= 0) return null;
  return { type: "choice", choiceCount: Math.max(0, Math.trunc(choiceCount)), options: options.length ? options : [...allSkills] };
}

// Обрана опція виду з одним конкретним варіантом («Гострі чуття: Аналіз») і є навичкою; «будь-які»
// навички гравець називає на кроці «Навички», тож тут їх не вигадуємо.
export function findSkillsGrantedByChosenOption<Skill extends string>(value: unknown, allSkills: readonly Skill[]): Skill[] {
  const normalized = normalizeSkillProficiencies(value, allSkills);
  if (!normalized) return [];
  if (normalized.type === "fixed") return normalized.skills;
  const isConcrete = normalized.options.length <= normalized.choiceCount && normalized.options.length < allSkills.length;
  return isConcrete ? normalized.options : [];
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export type SkillChoiceLabel<Skill extends string> =
  | { type: "fixed"; skills: Skill[] }
  | { type: "some"; choiceCount: number; options: Skill[] }
  | { type: "any"; choiceCount: number };

export function describeSkillChoice<Skill extends string>(
  normalized: NormalizedSkillProficiency<Skill>,
  allSkills: readonly Skill[],
): SkillChoiceLabel<Skill> {
  if (normalized.type === "fixed") return { type: "fixed", skills: normalized.skills };
  if (coversAllSkills(normalized.options, allSkills)) return { type: "any", choiceCount: normalized.choiceCount };
  return { type: "some", choiceCount: normalized.choiceCount, options: normalized.options };
}

export function formatAnySkillsLabel(count: number): string {
  return `${count} ${pickAnySkillsForm(count)}`;
}

function coversAllSkills<Skill extends string>(options: readonly Skill[], allSkills: readonly Skill[]): boolean {
  const distinct = new Set(options);
  return allSkills.every((skill) => distinct.has(skill));
}

function pickAnySkillsForm(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return "будь-яких навичок";
  if (last === 1) return "будь-яка навичка";
  if (last >= 2 && last <= 4) return "будь-які навички";
  return "будь-яких навичок";
}
