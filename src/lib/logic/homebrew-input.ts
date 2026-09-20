import { z } from "zod";
import { calculateAbilityModifier } from "@/rules/abilities";
import { CHALLENGE_RATINGS, findChallengeProficiencyBonus, findChallengeXp, isChallengeRating } from "@/rules/challenge-rating";
import { parseCreatureSpeeds } from "@/rules/creature-speed";
import { classTranslations } from "@/lib/refs/translation";
import { formatModifier } from "@/lib/logic/utils";

export const HOMEBREW_KINDS = ["SPELL", "CREATURE"] as const;
export const HOMEBREW_RULESETS = ["RULES_2014", "RULES_2024"] as const;
export const HOMEBREW_EDITIONS = ["RULES_2014", "RULES_2024", "ANY"] as const;
export const SPELL_SCHOOLS = ["Виклик", "Ворожіння", "Втілення", "Захист", "Ілюзія", "Некромантія", "Перетворення", "Причарування"] as const;
export const CREATURE_SIZES = ["Крихітний", "Малий", "Середній", "Великий", "Величезний", "Гігантський"] as const;
export const CREATURE_TYPES = ["Аберація", "Велетень", "Гуманоїд", "Дракон", "Елементаль", "Звір", "Конструкт", "Небожитель", "Нежить", "Почвара", "Рослина", "Слиз", "Фея", "Чудовисько"] as const;
export const ABILITY_FIELDS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
export const CREATURE_PROSE_FIELDS = ["specialAbilities", "actions", "bonusActions", "reactions", "legendaryActions", "description"] as const;

export type HomebrewKind = (typeof HOMEBREW_KINDS)[number];
export type HomebrewRuleset = (typeof HOMEBREW_RULESETS)[number];
export type HomebrewEdition = (typeof HOMEBREW_EDITIONS)[number];

const MAX_PROSE = 10_000;

const requiredText = (max: number) => z.string().trim().min(1, "Заповніть поле").max(max, `До ${max} символів`);
const optionalText = (max: number) => z.string().trim().max(max, `До ${max} символів`).default("");
const abilityScore = z.coerce.number("Ціле число").int("Ціле число");

export const homebrewSpellSchema = z.object({
  ruleset: z.enum(HOMEBREW_EDITIONS, "Оберіть редакцію"),
  name: requiredText(120),
  engName: optionalText(120),
  level: z.coerce.number().int().min(0, "Від 0").max(9, "До 9"),
  school: z.enum(SPELL_SCHOOLS, "Оберіть школу"),
  castingTime: requiredText(80),
  range: requiredText(80),
  components: requiredText(300),
  duration: requiredText(80),
  isRitual: z.boolean(),
  isConcentration: z.boolean(),
  classes: z.array(z.string()).max(20),
  description: requiredText(20_000),
});

export const homebrewCreatureSchema = z.object({
  ruleset: z.enum(HOMEBREW_EDITIONS, "Оберіть редакцію"),
  name: requiredText(120),
  engName: optionalText(120),
  size: z.enum(CREATURE_SIZES, "Оберіть розмір"),
  type: requiredText(128),
  alignment: optionalText(64),
  ac: requiredText(64),
  hp: requiredText(64),
  speed: requiredText(120),
  strength: abilityScore,
  dexterity: abilityScore,
  constitution: abilityScore,
  intelligence: abilityScore,
  wisdom: abilityScore,
  charisma: abilityScore,
  savingThrows: optionalText(300),
  skills: optionalText(300),
  damageVulnerability: optionalText(300),
  damageResistance: optionalText(300),
  damageImmunity: optionalText(300),
  conditionImmunity: optionalText(300),
  senses: optionalText(300),
  languages: optionalText(300),
  challenge: z.string().refine(isChallengeRating, "Оберіть показник небезпеки"),
  specialAbilities: optionalText(MAX_PROSE),
  actions: optionalText(MAX_PROSE),
  bonusActions: optionalText(MAX_PROSE),
  reactions: optionalText(MAX_PROSE),
  legendaryActions: optionalText(MAX_PROSE),
  description: optionalText(MAX_PROSE),
});

export type HomebrewSpellInput = z.infer<typeof homebrewSpellSchema>;
export type HomebrewCreatureInput = z.infer<typeof homebrewCreatureSchema>;

export type HomebrewFieldErrors = Record<string, string>;
export type ParsedHomebrewInput<T> = { data: T } | { errors: HomebrewFieldErrors };

export function parseHomebrewSpellInput(raw: unknown): ParsedHomebrewInput<HomebrewSpellInput> {
  const parsed = readSchema(homebrewSpellSchema, raw);
  if ("errors" in parsed) return parsed;
  return { data: { ...parsed.data, classes: expandEditionClasses(parsed.data.classes, parsed.data.ruleset) } };
}

export function parseHomebrewCreatureInput(raw: unknown): ParsedHomebrewInput<HomebrewCreatureInput> {
  return readSchema(homebrewCreatureSchema, raw);
}

export function toStoredRuleset(edition: HomebrewEdition): HomebrewRuleset | null {
  return edition === "ANY" ? null : edition;
}

export function toHomebrewEdition(ruleset: string | null): HomebrewEdition {
  return ruleset === "RULES_2014" || ruleset === "RULES_2024" ? ruleset : "ANY";
}

export function listEditionClasses(edition: HomebrewEdition): Array<{ value: string; label: string }> {
  const suffix = edition === "RULES_2024" ? "_2024" : "_2014";
  return Object.entries(classTranslations)
    .filter(([value]) => value.endsWith(suffix))
    .map(([value, label]) => ({ value, label }));
}

export function buildCreatureStatBlock(input: HomebrewCreatureInput) {
  const challenge = isChallengeRating(input.challenge) ? input.challenge : CHALLENGE_RATINGS[0];
  return {
    name: input.name,
    nameEng: input.engName,
    size: input.size,
    type: input.type,
    alignment: input.alignment,
    source: "HOMEBREW",
    ruleset: toStoredRuleset(input.ruleset),
    ac: input.ac,
    hp: input.hp,
    speed: input.speed,
    ...Object.fromEntries(ABILITY_FIELDS.map((field) => [field, formatAbilityScore(input[field])])),
    savingThrows: input.savingThrows,
    skills: input.skills,
    damageVulnerability: input.damageVulnerability,
    damageResistance: input.damageResistance,
    damageImmunity: input.damageImmunity,
    conditionImmunity: input.conditionImmunity,
    senses: input.senses,
    languages: input.languages,
    challenge,
    xp: `${findChallengeXp(challenge)} XP`,
    proficiencyBonus: formatModifier(findChallengeProficiencyBonus(challenge)),
    ...Object.fromEntries(CREATURE_PROSE_FIELDS.map((field) => [field, input[field]])),
    lairActions: "",
    lairInfo: "",
    regionEffects: "",
    ...parseCreatureSpeeds(input.speed),
  };
}

export function readCreatureInputFromStatBlock(statBlock: Record<string, unknown>): Record<string, unknown> {
  return {
    ...statBlock,
    engName: statBlock.nameEng,
    ...Object.fromEntries(ABILITY_FIELDS.map((field) => [field, Number.parseInt(String(statBlock[field] ?? "10"), 10)])),
  };
}

function formatAbilityScore(score: number): string {
  return `${score} (${formatModifier(calculateAbilityModifier(score))})`;
}

function expandEditionClasses(classes: readonly string[], edition: HomebrewEdition): string[] {
  const allowed = new Set(listEditionClasses(edition).map((option) => option.value));
  const chosen = [...new Set(classes)].filter((value) => allowed.has(value));
  if (edition !== "ANY") return chosen;
  return chosen.flatMap((value) => [value, value.replace(/_2014$/, "_2024")].filter((candidate) => candidate in classTranslations));
}

function readSchema<T>(schema: z.ZodType<T>, raw: unknown): ParsedHomebrewInput<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { data: result.data };
  const errors: HomebrewFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return { errors };
}
