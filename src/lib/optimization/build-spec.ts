import { z } from "zod";
import { idSchema, recipeChoiceSchema } from "./schema";
import { readyPresetSchema } from "./ready-preset";
import { specLevelsSchema } from "./build-spec-progression";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const text = z.string().min(1);
const onlyRules2014 = z.literal("RULES_2014", { error: "Специфікація підтримує лише ruleset RULES_2014" });

const abilityScoreSchema = z.number().int().min(8).max(15);
const abilityScoresSchema = z.strictObject({
  STR: abilityScoreSchema, DEX: abilityScoreSchema, CON: abilityScoreSchema,
  INT: abilityScoreSchema, WIS: abilityScoreSchema, CHA: abilityScoreSchema,
});

const reviewedRevisionSchema = z.strictObject({ translationRevisionId: idSchema, sourceRevisionId: idSchema });

const levelPlansSchema = z.strictObject({
  levels: z.union([z.literal("all"), z.array(z.number().int().min(1).max(20)).min(1)]).default("all"),
  notes: z.boolean().default(false),
  featuresColumn: z.number().int().min(1).default(1),
  notesColumn: z.number().int().min(1).default(2),
});

const incompleteItemSchema = z.strictObject({ field: text, reason: text, section: idSchema });

const presetBodySchema = readyPresetSchema.omit({ buildId: true, revisionId: true, articleSlug: true });

export const readyBuildSpecSchema = z.strictObject({
  status: z.literal("ready"),
  ruleset: onlyRules2014,
  articleSlug: idSchema,
  reviewedRevision: reviewedRevisionSchema,
  exampleSection: idSchema,
  levelTableSection: idSchema,
  revision: z.number().int().positive().default(1),
  recipeTitle: text.optional(),
  classKey: text, subclassKey: text.optional(), raceKey: text, variantKey: text.optional(),
  backgroundKey: text, featKey: text.optional(),
  abilityScores: abilityScoresSchema,
  nodeSections: z.array(idSchema).min(1).optional(),
  levelPlans: levelPlansSchema.default({ levels: "all", notes: false, featuresColumn: 1, notesColumn: 2 }),
  levels: specLevelsSchema.optional(),
  initialChoices: z.array(idSchema).optional(),
  choices: z.array(recipeChoiceSchema).optional(),
  incomplete: z.array(incompleteItemSchema).default([]),
  preset: presetBodySchema,
});

export const BLOCKED_REASON_CODES = [
  "needs-spells-at-level-one",
  "needs-subclass-at-level-one",
  "needs-higher-start-level",
  "needs-multiclass",
  "needs-decisions-authoring",
  "missing-catalog-entity",
  "unofficial-content",
  "author-choice-not-executable",
  "platform-limit",
  "other",
] as const;

export const blockedBuildSpecSchema = z.strictObject({
  status: z.literal("blocked"),
  ruleset: onlyRules2014,
  articleSlug: idSchema,
  reviewedRevision: reviewedRevisionSchema,
  exampleSection: idSchema,
  reasonCode: z.enum(BLOCKED_REASON_CODES),
  reason: z.string().min(30),
  missing: z.array(text).default([]),
});

export const buildSpecSchema = z.discriminatedUnion("status", [readyBuildSpecSchema, blockedBuildSpecSchema]);

export type ReadyBuildSpec = z.infer<typeof readyBuildSpecSchema>;
export type BlockedBuildSpec = z.infer<typeof blockedBuildSpecSchema>;
export type BuildSpec = z.infer<typeof buildSpecSchema>;

export function listAbilityScores(scores: ReadyBuildSpec["abilityScores"]) {
  return ABILITIES.map((ability) => ({ ability, value: scores[ability] }));
}

export function formatSchemaProblems(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "(корінь)"}: ${issue.message}`);
}
