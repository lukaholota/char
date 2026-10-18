import { z } from "zod";
import { SkillsEnum } from "@/lib/types/enums";

export const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const text = z.string().min(1);
const date = z.iso.datetime({ offset: true });
export const rulesetSchema = z.enum(["RULES_2014", "RULES_2024"]);
export const entitySchema = z.strictObject({
  ruleset: rulesetSchema,
  kind: z.enum(["class", "subclass", "race", "subrace", "variant", "feat", "background", "spell", "magicItem", "feature"]),
  entityKey: text,
  parentKey: text.optional(),
}).refine((entity) => !["subclass", "subrace", "variant", "feature"].includes(entity.kind) || !!entity.parentKey,
  { message: "Branch entity requires parentKey" });

const href = z.string().refine((value) => {
  if (/^\/(?!\/)/.test(value)) return !/[\\\s]/.test(value);
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Only HTTP(S) or local absolute links are allowed");
const inline = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("text"), text }),
  z.strictObject({ type: z.literal("emphasis"), text }),
  z.strictObject({ type: z.literal("strong"), text }),
  z.strictObject({ type: z.literal("superscript"), text }),
  z.strictObject({ type: z.literal("subscript"), text }),
  z.strictObject({ type: z.literal("link"), text, href, format: z.enum(["strong", "emphasis"]).optional() }),
  z.strictObject({ type: z.literal("rating"), text, ratingId: idSchema }),
]);
const inlines = z.array(inline).min(1);
export const blockSchema = z.discriminatedUnion("type", [
  z.strictObject({ blockId: idSchema, type: z.literal("paragraph"), content: inlines }),
  z.strictObject({ blockId: idSchema, type: z.literal("heading"), level: z.number().int().min(2).max(6), content: inlines }),
  z.strictObject({ blockId: idSchema, type: z.literal("list"), ordered: z.boolean(), items: z.array(inlines).min(1),
    depths: z.array(z.number().int().nonnegative()).optional(),
    itemKinds: z.array(z.enum(["ordered", "unordered"])).optional() })
    .refine((list) => !list.depths || list.depths.length === list.items.length && list.depths[0] === 0 &&
      list.depths.every((depth, index) => index === 0 || depth <= list.depths![index - 1] + 1), "Invalid list depths")
    .refine((list) => !list.itemKinds || list.itemKinds.length === list.items.length, "List item kinds must match items"),
  z.strictObject({ blockId: idSchema, type: z.literal("table"), caption: inlines.optional(),
    headers: z.array(z.array(inline)).min(1),
    rows: z.array(z.array(z.array(inline)).min(1)) }),
  z.strictObject({ blockId: idSchema, type: z.literal("rating"), ratingId: idSchema }),
]);
export const sectionSchema = z.strictObject({
  sectionId: idSchema, parentSectionId: idSchema.optional(), heading: text,
  sourceAnchor: text.optional(), blocks: z.array(blockSchema),
});
export const sourceSchema = z.strictObject({ sourceId: idSchema, rulesets: z.array(rulesetSchema).min(1) });
export const sourceRevisionSchema = z.strictObject({
  revisionId: idSchema, sourceId: idSchema, fetchedAt: date, sourceUpdatedAt: date.optional(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/), title: text, authors: z.array(text).min(1),
  sourceFile: z.string().regex(/^source\/[a-zA-Z0-9_/-]+\.(html|json|txt|md)$/).refine((path) => !path.includes("..")),
  evidence: text, etag: text.optional(), lastModified: text.optional(),
});
export const articleSchema = z.strictObject({
  articleId: idSchema, sourceId: idSchema, slug: idSchema, ruleset: rulesetSchema,
  titleUk: text, titleEn: text, topics: z.array(text),
  status: z.enum(["unpublished", "published"]), publishedRevisionId: idSchema.optional(),
}).refine((article) => (article.status === "published") === !!article.publishedRevisionId,
  "Published article requires a revision; unpublished article must not have one");
export const translationSchema = z.strictObject({
  translationRevisionId: idSchema, articleId: idSchema, sourceRevisionId: idSchema,
  status: z.enum(["draft", "reviewed", "stale"]), reviewedAt: date.optional(),
  sections: z.array(sectionSchema).min(1),
}).refine((revision) => revision.status !== "reviewed" || !!revision.reviewedAt, "Reviewed revision requires reviewedAt");
const scores = { red: 1, orange: 2, green: 3, blue: 4 } as const;
const ratingScoreSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const ratingColorSchema = z.enum(["red", "orange", "green", "blue"]);
const ratingAlternativeSchema = z.strictObject({
  score: ratingScoreSchema, sourceColor: ratingColorSchema, condition: text, subclassKeys: z.array(text).min(1).optional(),
}).refine((alternative) => alternative.score === scores[alternative.sourceColor], "Alternative score/color mismatch");
export const ratingSchema = z.strictObject({
  ratingId: idSchema, articleId: idSchema, translationRevisionId: idSchema, sectionId: idSchema,
  targetBlockId: idSchema, optionId: idSchema.optional(), context: text,
  score: ratingScoreSchema.optional(),
  sourceColor: ratingColorSchema.optional(),
  alternative: ratingAlternativeSchema.optional(),
  explanation: text.optional(), explanationBlockId: idSchema.optional(), entity: entitySchema.optional(),
}).refine((rating) => !!rating.explanation || !!rating.explanationBlockId, "Rating requires explanation")
  .refine((rating) => rating.sourceColor === undefined || rating.score === scores[rating.sourceColor], "Score/color mismatch");
export const bindingSchema = z.strictObject({
  bindingId: idSchema, entity: entitySchema, articleId: idSchema, sectionId: idSchema,
  optionId: idSchema.optional(),
  role: z.enum(["overview", "comparison", "dedicated"]), primary: z.boolean(),
  preview: text.max(600), ratingIds: z.array(idSchema), evidence: text, reviewedAt: date,
}).refine((binding) => binding.entity.kind !== "feature" || !!binding.optionId, "Feature binding requires optionId");
export const sourceRefSchema = z.strictObject({
  articleId: idSchema, translationRevisionId: idSchema, sourceRevisionId: idSchema, sectionId: idSchema,
  blockId: idSchema.optional(), ratingIds: z.array(idSchema),
});
const alternative = z.strictObject({
  alternativeId: idSchema, entity: entitySchema, sourceRefs: z.array(sourceRefSchema).min(1),
  explanation: text, dependsOn: z.array(idSchema),
  levelOverrides: z.array(z.strictObject({ characterLevel: z.number().int().min(1).max(20), text,
    abilityChanges: z.array(z.strictObject({ ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]), increase: z.number().int().positive() })) })).optional(),
});
export const buildDetailsSchema = z.strictObject({
  origin: z.enum(["example", "recommendations"]),
  subclassKey: text.optional(),
  raceKey: text.nullable(), variantKey: text.optional(), backgroundKey: text,
  featKey: text.optional(),
  abilityScores: z.array(z.strictObject({ ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]), value: z.number().int().min(8).max(15) })).length(6)
    .refine((scores) => scores.every((score, index) => score.ability === ["STR", "DEX", "CON", "INT", "WIS", "CHA"][index]), "Invalid ability order"),
  nodes: z.array(z.strictObject({ nodeId: idSchema, title: text, text, sourceRefs: z.array(sourceRefSchema).min(1) })),
  levelPlans: z.array(z.strictObject({ level: z.number().int().min(1).max(20), text, notes: text.optional(),
    abilityChanges: z.array(z.strictObject({ ability: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]), increase: z.number().int().positive() })).optional(),
    featKeys: z.array(text).optional(), sourceRefs: z.array(sourceRefSchema).min(1) })),
  incomplete: z.array(z.strictObject({ field: text, reason: text, sourceRefs: z.array(sourceRefSchema).min(1) })),
});
const abilitySchema = z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
const choiceOptionRefSchema = z.strictObject({ optionNameEng: text, groupName: text.optional() });
const levelSpellPicksSchema = z.strictObject({
  cantripKeys: z.array(idSchema).default([]),
  knownSpellKeys: z.array(idSchema).default([]),
  spellbookKeys: z.array(idSchema).default([]),
});
const optionReplacementSchema = z.strictObject({ drop: choiceOptionRefSchema, add: choiceOptionRefSchema });
const spellReplacementSchema = z.strictObject({ drop: idSchema, add: idSchema });
const openSpellCategorySchema = z.enum(["cantrips", "knownSpells", "spellbook"]);
export const levelDecisionFields = {
  abilityScoreIncrease: z.array(z.strictObject({ ability: abilitySchema, amount: z.union([z.literal(1), z.literal(2)]) })).min(1).max(2).optional(),
  featKey: text.optional(),
  featOptions: z.array(choiceOptionRefSchema).optional(),
  openAdvancement: z.literal(true).optional(),
  openClassOptions: z.literal(true).optional(),
  classOptions: z.array(choiceOptionRefSchema).optional(),
  subclassOptions: z.array(choiceOptionRefSchema).optional(),
  spells: levelSpellPicksSchema.optional(),
  openSpellPicks: z.array(z.strictObject({ category: openSpellCategorySchema, count: z.number().int().positive() })).optional(),
  classOptionSpellKeys: z.array(idSchema).min(1).optional(),
  replaceSpell: spellReplacementSchema.optional(),
  replaceOptions: z.array(optionReplacementSchema).min(1).optional(),
  expertise: z.array(z.enum(SkillsEnum)).min(1).optional(),
  skillProficiencies: z.array(z.enum(SkillsEnum)).min(1).optional(),
  multiclassSkills: z.array(z.enum(SkillsEnum)).min(1).optional(),
  infusions: z.array(text).min(1).optional(),
};
type LevelDecisionRuleSubject = { abilityScoreIncrease?: unknown; featKey?: string; featOptions?: unknown; openAdvancement?: true; openClassOptions?: true; classOptions?: unknown };
export function refineLevelDecisions<Schema extends z.ZodType<LevelDecisionRuleSubject>>(schema: Schema) {
  return schema
    .refine((decisions) => !(decisions.abilityScoreIncrease && decisions.featKey), "A level takes either an ability score increase or a feat")
    .refine((decisions) => !decisions.featOptions || !!decisions.featKey, "Feat options require a feat")
    .refine((decisions) => !decisions.openAdvancement || !!decisions.featKey || !!decisions.abilityScoreIncrease, "An open advancement needs a default feat or ability score increase")
    .refine((decisions) => !decisions.openClassOptions || (Array.isArray(decisions.classOptions) && decisions.classOptions.length > 0), "Open class options need default classOptions");
}
export const levelDecisionsSchema = refineLevelDecisions(z.strictObject(levelDecisionFields));
export const recipeChoiceSchema = z.strictObject({ choiceId: idSchema, stage: z.enum(["initial", "progression"]),
  sourceRefs: z.array(sourceRefSchema).min(1), count: z.number().int().positive(), alternatives: z.array(alternative).min(1) });
export const buildRecipeSchema = z.strictObject({
  buildId: idSchema, revisionId: idSchema, ruleset: rulesetSchema, title: text,
  sourceRefs: z.array(sourceRefSchema).min(1), startingClassKey: text,
  supportedLevels: z.array(z.number().int().min(1).max(20)).min(1),
  initialChoices: z.array(idSchema),
  choices: z.array(recipeChoiceSchema),
  progression: z.array(z.strictObject({ characterLevel: z.number().int().min(1).max(20), classKey: text,
    sourceRefs: z.array(sourceRefSchema).min(1), classLevel: z.number().int().min(1).max(20), subclassKey: text.optional(), choiceIds: z.array(idSchema),
    decisions: levelDecisionsSchema.optional() })),
  coverage: z.enum(["partial", "complete"]),
  details: buildDetailsSchema.optional(),
});
const contentReferenceOptionSchema = z.strictObject({
  kind: z.enum(["feature", "equipment", "weapon", "armor", "feat", "magic-item", "race", "class", "subclass", "background", "invocation", "infusion", "metamagic", "rule", "spell", "creature"]), href, name: text, engName: text,
  description: z.string().optional(), details: z.array(z.strictObject({ label: text, value: text })).default([]),
  feature: z.strictObject({ entity: entitySchema, featureKey: text, level: z.number().int() }).optional(),
});
export const contentReferenceSchema = contentReferenceOptionSchema.extend({ options: z.array(contentReferenceOptionSchema).min(2).optional() });
export const documentSchema = z.strictObject({
  sources: z.array(sourceSchema), sourceRevisions: z.array(sourceRevisionSchema),
  article: articleSchema, translations: z.array(translationSchema), ratings: z.array(ratingSchema),
  contentReferences: z.array(contentReferenceSchema).optional(),
});
export const featureAnalysisSchema = z.object({
  binding: bindingSchema, name: text, engName: text, level: z.number().int(),
  content: inlines, rating: ratingSchema.optional(), href,
  childrenBlock: blockSchema.optional(),
  contentReferences: z.array(contentReferenceSchema).default([]),
});
export const slicePreviewSchema = z.object({
  binding: bindingSchema, slug: idSchema, title: text, href, guideHref: href.nullable().default(null),
  rating: ratingSchema.optional(),
  builds: z.array(z.object({ buildId: idSchema, title: text, guideHref: href })),
  features: z.array(featureAnalysisSchema).default([]),
});
export const corpusSchema = z.strictObject({
  schemaVersion: z.literal(1), sources: z.array(sourceSchema), sourceRevisions: z.array(sourceRevisionSchema),
  articles: z.array(articleSchema), translations: z.array(translationSchema), ratings: z.array(ratingSchema),
  bindings: z.array(bindingSchema), recipes: z.array(buildRecipeSchema),
});
