import { corpusSchema } from "./schema";
import { entityIdentity, resolvePrimaryBinding } from "./bindings";
import { findBoundFeatureContent } from "./feature-analysis";
import { findProgressionIssues } from "./build-executable-levels";
import type { BuildRecipe, ContentBlock, Corpus, EntityBinding, EntityRef, SourceRef, TranslationRevision } from "./types";

export type ValidationIssue = { code: string; path: string; message: string };
type Reporter = (code: string, path: string, message: string) => void;

function checkUnique(values: readonly string[], path: string, report: Reporter) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) report("duplicate-id", path, value);
    seen.add(value);
  }
}

function checkSections(revision: TranslationRevision, report: Reporter) {
  const path = revision.translationRevisionId;
  checkUnique(revision.sections.map((section) => section.sectionId), path, report);
  checkUnique(revision.sections.flatMap((section) => section.blocks.map((block) => block.blockId)), path, report);
  const previous = new Set<string>();
  for (const section of revision.sections) {
    if (section.parentSectionId && !previous.has(section.parentSectionId))
      report("invalid-parent", path, `${section.sectionId}: parent must precede child`);
    previous.add(section.sectionId);
  }
}

function checkArticles(corpus: Corpus, report: Reporter) {
  for (const article of corpus.articles) {
    const source = corpus.sources.find((entry) => entry.sourceId === article.sourceId);
    if (!source) report("invalid-source", article.articleId, article.sourceId);
    else if (!source.rulesets.includes(article.ruleset)) report("edition-mismatch", article.articleId, article.ruleset);
    if (!article.publishedRevisionId) continue;
    const revision = corpus.translations.find((entry) => entry.translationRevisionId === article.publishedRevisionId);
    if (!revision || revision.articleId !== article.articleId || revision.status === "draft" || !revision.reviewedAt)
      report("invalid-publication", article.articleId, article.publishedRevisionId);
  }
}

function checkTranslations(corpus: Corpus, report: Reporter) {
  for (const revision of corpus.translations) {
    const article = corpus.articles.find((entry) => entry.articleId === revision.articleId);
    const source = corpus.sourceRevisions.find((entry) => entry.revisionId === revision.sourceRevisionId);
    if (!article || !source || source.sourceId !== article.sourceId)
      report("invalid-revision-ref", revision.translationRevisionId, revision.sourceRevisionId);
    checkSections(revision, report);
  }
}

function checkRatings(corpus: Corpus, report: Reporter) {
  for (const rating of corpus.ratings) {
    const revision = corpus.translations.find((entry) => entry.translationRevisionId === rating.translationRevisionId);
    const section = revision?.sections.find((entry) => entry.sectionId === rating.sectionId);
    if (!revision || revision.articleId !== rating.articleId || !section)
      report("invalid-rating-ref", rating.ratingId, rating.sectionId);
    for (const blockId of [rating.targetBlockId, rating.explanationBlockId].filter((id) => id !== undefined)) {
      if (!section?.blocks.some((block) => block.blockId === blockId && block.type !== "rating"))
        report("invalid-block-ref", rating.ratingId, blockId);
    }
    const article = corpus.articles.find((entry) => entry.articleId === rating.articleId);
    if (rating.entity && rating.entity.ruleset !== article?.ruleset)
      report("edition-mismatch", rating.ratingId, rating.entity.ruleset);
  }
}

function blockRatingIds(block: ContentBlock): string[] {
  if (block.type === "rating") return [block.ratingId];
  const content = block.type === "list" ? block.items.flat()
    : block.type === "table" ? [...(block.caption ?? []), ...block.headers.flat(), ...block.rows.flat(2)] : block.content;
  return content.filter((node) => node.type === "rating").map((node) => node.ratingId);
}

function checkRatingMarkers(corpus: Corpus, report: Reporter) {
  for (const revision of corpus.translations) for (const section of revision.sections) {
    for (const block of section.blocks) {
      for (const id of blockRatingIds(block)) {
        const rating = corpus.ratings.find((entry) => entry.ratingId === id);
        if (!rating || rating.translationRevisionId !== revision.translationRevisionId || rating.sectionId !== section.sectionId)
          report("invalid-rating-marker", block.blockId, id);
      }
    }
  }
}

function checkBinding(binding: EntityBinding, corpus: Corpus, report: Reporter) {
  const article = corpus.articles.find((entry) => entry.articleId === binding.articleId);
  const revision = article?.status === "unpublished"
    ? corpus.translations.filter((entry) => entry.articleId === article.articleId).at(-1)
    : corpus.translations.find((entry) => entry.translationRevisionId === article?.publishedRevisionId);
  if (!revision?.sections.some((section) => section.sectionId === binding.sectionId))
    report("invalid-binding-ref", binding.bindingId, binding.sectionId);
  if (binding.entity.ruleset !== article?.ruleset) report("edition-mismatch", binding.bindingId, binding.entity.ruleset);
  const featureContent = revision && binding.optionId ? findBoundFeatureContent(revision, binding) : undefined;
  if (binding.optionId && !featureContent) report("invalid-binding-option", binding.bindingId, binding.optionId);
  for (const id of binding.ratingIds) {
    const rating = corpus.ratings.find((entry) => entry.ratingId === id);
    if (!rating || rating.translationRevisionId !== revision?.translationRevisionId || rating.sectionId !== binding.sectionId ||
      (binding.entity.kind === "feature"
        ? rating.optionId !== binding.optionId || rating.targetBlockId !== featureContent?.blockId
        : !rating.entity || entityIdentity(rating.entity) !== entityIdentity(binding.entity)))
      report("invalid-preview-rating", binding.bindingId, id);
  }
}

function checkBindings(corpus: Corpus, catalog: readonly EntityRef[], report: Reporter) {
  const keys = new Set(catalog.map(entityIdentity));
  for (const binding of corpus.bindings) {
    checkBinding(binding, corpus, report);
    if (!keys.has(entityIdentity(binding.entity))) report("missing-entity", binding.bindingId, entityIdentity(binding.entity));
  }
  for (const key of new Set(corpus.bindings.map((binding) => entityIdentity(binding.entity)))) {
    const entity = corpus.bindings.find((binding) => entityIdentity(binding.entity) === key)!.entity;
    if (resolvePrimaryBinding(corpus.bindings, entity).status === "ambiguous") report("ambiguous-primary", key, "Exactly one primary binding is required");
  }
}

function checkSourceRef(ref: SourceRef, ruleset: EntityRef["ruleset"], corpus: Corpus, report: Reporter) {
  const revision = corpus.translations.find((entry) => entry.translationRevisionId === ref.translationRevisionId);
  const article = corpus.articles.find((entry) => entry.articleId === ref.articleId);
  if (!revision || revision.articleId !== ref.articleId || revision.sourceRevisionId !== ref.sourceRevisionId ||
    !revision.sections.some((section) => section.sectionId === ref.sectionId)) report("invalid-build-ref", ref.articleId, ref.sectionId);
  if (ref.blockId && !revision?.sections.find((section) => section.sectionId === ref.sectionId)?.blocks.some((block) => block.blockId === ref.blockId))
    report("invalid-build-block", ref.articleId, ref.blockId);
  if (article?.ruleset !== ruleset) report("edition-mismatch", ref.articleId, ruleset);
  for (const id of ref.ratingIds) {
    if (!corpus.ratings.some((rating) => rating.ratingId === id && rating.translationRevisionId === ref.translationRevisionId && rating.sectionId === ref.sectionId))
      report("invalid-build-rating", ref.articleId, id);
  }
}

function checkRecipeChoices(recipe: BuildRecipe, report: Reporter) {
  const choices = recipe.choices.map((choice) => choice.choiceId);
  checkUnique(choices, recipe.buildId, report);
  checkUnique(recipe.choices.flatMap((choice) => choice.alternatives.map((entry) => entry.alternativeId)), recipe.buildId, report);
  const previous = new Set<string>();
  for (const choice of recipe.choices) {
    if (choice.count > choice.alternatives.length) report("invalid-choice-count", choice.choiceId, recipe.buildId);
    for (const alternative of choice.alternatives) for (const dependency of alternative.dependsOn)
      if (!previous.has(dependency)) report("invalid-choice-dependency", alternative.alternativeId, dependency);
    previous.add(choice.choiceId);
  }
  for (const id of recipe.initialChoices)
    if (!recipe.choices.some((choice) => choice.choiceId === id && choice.stage === "initial")) report("invalid-choice-ref", recipe.buildId, id);
  for (const id of recipe.progression.flatMap((step) => step.choiceIds))
    if (!recipe.choices.some((choice) => choice.choiceId === id && choice.stage === "progression")) report("invalid-choice-ref", recipe.buildId, id);
}

function checkRecipeEntities(recipe: BuildRecipe, keys: Set<string>, report: Reporter) {
  for (const alternative of recipe.choices.flatMap((choice) => choice.alternatives)) {
    if (alternative.entity.ruleset !== recipe.ruleset) report("edition-mismatch", alternative.alternativeId, recipe.ruleset);
    if (!keys.has(entityIdentity(alternative.entity))) report("missing-entity", alternative.alternativeId, alternative.entity.entityKey);
  }
  const classes = [recipe.startingClassKey, ...recipe.progression.map((step) => step.classKey)];
  for (const key of classes)
    if (!keys.has(entityIdentity({ ruleset: recipe.ruleset, kind: "class", entityKey: key }))) report("missing-entity", recipe.buildId, key);
  for (const step of recipe.progression)
    if (step.subclassKey && !keys.has(entityIdentity({ ruleset: recipe.ruleset, kind: "subclass", parentKey: step.classKey, entityKey: step.subclassKey }))) report("missing-entity", recipe.buildId, step.subclassKey);
}

function checkRecipes(corpus: Corpus, catalog: readonly EntityRef[], report: Reporter) {
  const keys = new Set(catalog.map(entityIdentity));
  for (const recipe of corpus.recipes) {
    checkRecipeChoices(recipe, report);
    checkRecipeEntities(recipe, keys, report);
    for (const issue of findProgressionIssues(recipe)) report(issue.code, recipe.buildId, `level ${issue.characterLevel}: ${issue.message}`);
    const alternatives = recipe.choices.flatMap((choice) => choice.alternatives);
    const refs = [...recipe.sourceRefs, ...alternatives.flatMap((entry) => entry.sourceRefs),
      ...recipe.choices.flatMap((choice) => choice.sourceRefs), ...recipe.progression.flatMap((step) => step.sourceRefs),
      ...(recipe.details?.nodes.flatMap((node) => node.sourceRefs) ?? []),
      ...(recipe.details?.levelPlans.flatMap((step) => step.sourceRefs) ?? []),
      ...(recipe.details?.incomplete.flatMap((item) => item.sourceRefs) ?? [])];
    refs.forEach((ref) => checkSourceRef(ref, recipe.ruleset, corpus, report));
  }
}

function checkCorpusIds(corpus: Corpus, report: Reporter) {
  for (const [path, ids] of [
    ["sources", corpus.sources.map((entry) => entry.sourceId)], ["sourceRevisions", corpus.sourceRevisions.map((entry) => entry.revisionId)],
    ["articles", corpus.articles.map((entry) => entry.articleId)], ["slugs", corpus.articles.map((entry) => `${entry.ruleset}/${entry.slug}`)],
    ["translations", corpus.translations.map((entry) => entry.translationRevisionId)], ["ratings", corpus.ratings.map((entry) => entry.ratingId)],
    ["bindings", corpus.bindings.map((entry) => entry.bindingId)], ["recipes", corpus.recipes.map((entry) => entry.buildId)],
  ] as const) checkUnique(ids, path, report);
}

export function validateCorpus(input: unknown, catalog: readonly EntityRef[] = []) {
  const parsed = corpusSchema.safeParse(input);
  if (!parsed.success) return { corpus: undefined, issues: parsed.error.issues.map((issue) => ({ code: "schema", path: issue.path.join("."), message: issue.message })) };
  const corpus = parsed.data;
  const issues: ValidationIssue[] = [];
  const report: Reporter = (code, path, message) => { issues.push({ code, path, message }); };
  checkCorpusIds(corpus, report);
  for (const revision of corpus.sourceRevisions) if (!corpus.sources.some((entry) => entry.sourceId === revision.sourceId)) report("invalid-source", revision.revisionId, revision.sourceId);
  checkArticles(corpus, report);
  checkTranslations(corpus, report);
  checkRatings(corpus, report);
  checkRatingMarkers(corpus, report);
  checkBindings(corpus, catalog, report);
  checkRecipes(corpus, catalog, report);
  return { corpus, issues };
}

export function requireValidCorpus(input: unknown, catalog: readonly EntityRef[] = []): Corpus {
  const result = validateCorpus(input, catalog);
  if (!result.corpus || result.issues.length) throw new Error(JSON.stringify(result.issues, null, 2));
  return result.corpus;
}
