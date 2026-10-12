import type { CreatorContent } from "@/server/db/creator-content-query";
import { buildRecipeSchema } from "./schema";
import { readyPresetSchema, type ReadyPreset } from "./ready-preset";
import { listAbilityScores, formatSchemaProblems, type BlockedBuildSpec, type ReadyBuildSpec } from "./build-spec";
import { findCatalogKeyProblems } from "./build-catalog-keys";
import { flattenSectionText, readAbilityTableBaseScores, readLevelTableRows } from "./build-section-text";
import { findExecutableLevels } from "./build-executable-levels";
import { buildProgressionSteps, listSpecLevelSectionIds } from "./build-spec-progression";
import type { ArticleDocument, BuildRecipe, SourceRef } from "./types";

const MAX_CHARACTER_LEVEL = 20;

type Translation = ArticleDocument["translations"][number];
type Section = Translation["sections"][number];

export type CompiledBuild = { recipe: BuildRecipe; preset: ReadyPreset; warnings: string[] };
export type CompileBuildInput = { slug: string; spec: ReadyBuildSpec; document: ArticleDocument; content: CreatorContent };

export class BuildSpecError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("\n"));
  }
}

export function compileBuildSpec(input: CompileBuildInput): CompiledBuild {
  const translation = input.document.translations.at(-1);
  const problems = [...findArticleProblems(input, translation), ...findCatalogProblems(input.spec, input.content)];
  if (problems.length || !translation) throw new BuildSpecError(problems);
  const recipe = buildRecipe(input, translation);
  const preset = buildPreset(input.spec, recipe);
  validateCompiled(recipe, preset);
  return { recipe, preset, warnings: findAbilityTableWarnings(input.spec, translation, listNodeSectionIds(input.spec, translation)) };
}

export function buildBuildId(slug: string): string {
  return `build-${slug}`;
}

export const HAND_WRITTEN_BUILD_IDS: readonly string[] = ["build-barbarian-berserker-2014", "build-wizard-evocation-2014", "build-sorcadin-clockwork-2014"];

export function findProtectedRecipeProblem(spec: ReadyBuildSpec, storedRecipe: BuildRecipe | null, options: { discardLevels?: boolean } = {}): string | null {
  if (spec.levels || !storedRecipe) return null;
  const executableLevels = findExecutableLevels(storedRecipe);
  if (executableLevels.length === 1) return null;
  const lastLevel = Math.max(...executableLevels);
  const existing = `Збережений рецепт ${storedRecipe.buildId} виконується до ${lastLevel}-го рівня (кроки progression[].decisions), а специфікація не має поля levels. `;
  if (HAND_WRITTEN_BUILD_IDS.includes(storedRecipe.buildId)) {
    return `${existing}Це рецепт, написаний вручну: компілятор його не перезаписує. Опишіть рівні у специфікації (levels) або дайте специфікації інший slug.`;
  }
  if (options.discardLevels) return null;
  return `${existing}Якщо levels прибрано навмисно, а рецепт зібрав компілятор, запустіть із --discard-levels: рецепт стане стартовим (виконується лише 1-й рівень). `
    + "Якщо рецепт писали вручну — опишіть рівні у специфікації (levels) або дайте специфікації інший slug.";
}

export function findShrunkLevelsWarning(storedRecipe: BuildRecipe | null, recipe: BuildRecipe): string | null {
  if (!storedRecipe) return null;
  const before = Math.max(...findExecutableLevels(storedRecipe));
  const after = Math.max(...findExecutableLevels(recipe));
  return after < before ? `рецепт скорочено: виконувався до ${before}-го рівня, тепер виконується до ${after}-го` : null;
}

function validateCompiled(recipe: BuildRecipe, preset: ReadyPreset): void {
  const parsed = [buildRecipeSchema.safeParse(recipe), readyPresetSchema.safeParse(preset)];
  const problems = parsed.flatMap((result) => (result.success ? [] : formatSchemaProblems(result.error)));
  if (problems.length) throw new BuildSpecError(problems);
}

export function findBlockedSpecProblems(spec: BlockedBuildSpec, document: ArticleDocument): string[] {
  const translation = document.translations.at(-1);
  if (document.article.ruleset !== "RULES_2014") return [`Стаття ${document.article.slug} має редакцію ${document.article.ruleset}; потрібна RULES_2014`];
  if (!translation) return [`У статті ${spec.articleSlug} немає перекладу`];
  const hasExample = translation.sections.some((section) => section.sectionId === spec.exampleSection);
  return [
    ...findRevisionProblems(spec, translation),
    ...(hasExample ? [] : [`Невідомий розділ «${spec.exampleSection}» (exampleSection)`]),
  ];
}

function findArticleProblems({ spec, document }: CompileBuildInput, translation: Translation | undefined): string[] {
  if (document.article.ruleset !== "RULES_2014") return [`Стаття ${document.article.slug} має редакцію ${document.article.ruleset}; потрібна RULES_2014`];
  if (!translation) return [`У статті ${spec.articleSlug} немає перекладу`];
  const problems = [...findRevisionProblems(spec, translation), ...findSectionProblems(spec, translation)];
  if (translation.status === "stale") problems.push(`Переклад ${translation.translationRevisionId} позначено stale: оновіть його перед компіляцією`);
  return problems;
}

type ReviewedSpec = Pick<ReadyBuildSpec, "articleSlug" | "exampleSection" | "reviewedRevision">;

function findRevisionProblems(spec: ReviewedSpec, translation: Translation): string[] {
  const reviewed = spec.reviewedRevision;
  if (reviewed.translationRevisionId === translation.translationRevisionId && reviewed.sourceRevisionId === translation.sourceRevisionId) return [];
  return [
    `Стаття оновилась після огляду: у специфікації reviewedRevision ${reviewed.translationRevisionId} / ${reviewed.sourceRevisionId}, `
    + `а чинні ${translation.translationRevisionId} / ${translation.sourceRevisionId}. Перечитайте розділи (bun scripts/rpgbot/show-build-source.ts ${spec.articleSlug} ${spec.exampleSection}) і оновіть reviewedRevision.`,
  ];
}

function listSpecSectionUses(spec: ReadyBuildSpec): { field: string; sectionId: string }[] {
  const { preset } = spec;
  return [
    { field: "exampleSection", sectionId: spec.exampleSection },
    { field: "levelTableSection", sectionId: spec.levelTableSection },
    { field: "preset.skillSection", sectionId: preset.skillSection },
    { field: "preset.equipmentSection", sectionId: preset.equipmentSection },
    ...(preset.featSection ? [{ field: "preset.featSection", sectionId: preset.featSection }] : []),
    ...(preset.spells ? [{ field: "preset.spells.sectionId", sectionId: preset.spells.sectionId }] : []),
    ...(spec.nodeSections ?? []).map((sectionId) => ({ field: "nodeSections", sectionId })),
    ...listSpecLevelSectionIds(spec.levels),
    ...spec.incomplete.map((item) => ({ field: `incomplete[${item.field}].section`, sectionId: item.section })),
  ];
}

function findSectionProblems(spec: ReadyBuildSpec, translation: Translation): string[] {
  const known = new Set(translation.sections.map((section) => section.sectionId));
  const problems = listSpecSectionUses(spec).filter((use) => !known.has(use.sectionId))
    .map((use) => `Невідомий розділ «${use.sectionId}» (${use.field}). Розділи прикладу: ${listChildSectionIds(translation, spec.exampleSection).join(", ") || "розділ-приклад не знайдено"}`);
  if (problems.length) return problems;
  return [...findNodeProblems(spec, translation)];
}

function findNodeProblems(spec: ReadyBuildSpec, translation: Translation): string[] {
  const nodes = listNodeSectionIds(spec, translation);
  const required = [{ field: "preset.skillSection", sectionId: spec.preset.skillSection }, ...(spec.preset.featSection ? [{ field: "preset.featSection", sectionId: spec.preset.featSection }] : [])];
  const problems = required.filter((use) => !nodes.includes(use.sectionId))
    .map((use) => `${use.field} «${use.sectionId}» не входить у вузли рецепта (${nodes.join(", ")}): сторінка пресета читає цей вузол`);
  if (!nodes.length) problems.push(`У розділі прикладу «${spec.exampleSection}» немає вкладених розділів із текстом; задайте nodeSections`);
  return [...problems, ...findLevelPlanProblems(spec, translation)];
}

function findLevelPlanProblems(spec: ReadyBuildSpec, translation: Translation): string[] {
  const rows = readLevelTableRows(findSection(translation, spec.levelTableSection), spec.levelPlans);
  const wanted = spec.levelPlans.levels;
  const found = rows.filter((row) => wanted === "all" || wanted.includes(row.level));
  if (!found.length) return [`У таблиці рівнів «${spec.levelTableSection}» не знайдено рядків для levelPlans.levels (рядки таблиці: ${rows.map((row) => row.level).join(", ") || "немає"}); перевірте featuresColumn/notesColumn`];
  const emptyFeatures = found.filter((row) => !row.features.trim()).map((row) => row.level);
  return emptyFeatures.length ? [`Порожній текст умінь у рядках рівнів ${emptyFeatures.join(", ")}: перевірте levelPlans.featuresColumn (зараз ${spec.levelPlans.featuresColumn})`] : [];
}

function listChildSectionIds(translation: Translation, parentSectionId: string): string[] {
  return translation.sections.filter((section) => section.parentSectionId === parentSectionId).map((section) => section.sectionId);
}

function listNodeSectionIds(spec: ReadyBuildSpec, translation: Translation): string[] {
  const nodes = spec.nodeSections ?? translation.sections
    .filter((section) => section.parentSectionId === spec.exampleSection && section.sectionId !== spec.levelTableSection && section.blocks.length > 0)
    .map((section) => section.sectionId);
  const readsLevelTable = [spec.preset.skillSection, spec.preset.featSection].includes(spec.levelTableSection);
  return readsLevelTable && !nodes.includes(spec.levelTableSection) ? [...nodes, spec.levelTableSection] : nodes;
}

function findCatalogProblems(spec: ReadyBuildSpec, content: CreatorContent): string[] {
  return findCatalogKeyProblems({
    classKey: spec.classKey, subclassKey: spec.subclassKey, raceKey: spec.raceKey, variantKey: spec.variantKey,
    subraceKey: spec.preset.subraceKey, backgroundKey: spec.backgroundKey, featKey: spec.featKey,
    weapons: spec.preset.equipment.flatMap((pick) => pick.weapons),
  }, content);
}

function createSourceRef(translation: Translation, sectionId: string): SourceRef {
  return {
    articleId: translation.articleId,
    translationRevisionId: translation.translationRevisionId,
    sourceRevisionId: translation.sourceRevisionId,
    sectionId,
    ratingIds: [],
  };
}

function findSection(translation: Translation, sectionId: string): Section {
  return translation.sections.find((section) => section.sectionId === sectionId)!;
}

function buildRecipe(input: CompileBuildInput, translation: Translation): BuildRecipe {
  const { slug, spec } = input;
  const buildId = buildBuildId(slug);
  return {
    buildId,
    revisionId: `${buildId}-v${spec.revision}`,
    ruleset: spec.ruleset,
    title: spec.recipeTitle ?? findSection(translation, spec.exampleSection).heading.replace(/^Приклад збірки /, ""),
    sourceRefs: [createSourceRef(translation, spec.exampleSection)],
    startingClassKey: spec.classKey,
    supportedLevels: listSupportedLevels(spec),
    initialChoices: spec.initialChoices ?? [],
    choices: spec.choices ?? [],
    progression: buildProgression(input, translation),
    coverage: findCoverage(spec),
    details: buildRecipeDetails(spec, translation),
  };
}

function listSupportedLevels(spec: ReadyBuildSpec): number[] {
  return [1, ...(spec.levels ?? []).map((entry) => entry.level)];
}

function findCoverage(spec: ReadyBuildSpec): BuildRecipe["coverage"] {
  const reachesLastLevel = spec.levels?.some((entry) => entry.level === MAX_CHARACTER_LEVEL) ?? false;
  return reachesLastLevel && spec.incomplete.length === 0 ? "complete" : "partial";
}

function buildProgression({ spec, content }: CompileBuildInput, translation: Translation): BuildRecipe["progression"] {
  const startSubclassKey = hasFirstLevelSubclass(spec, content) ? spec.subclassKey : undefined;
  const start = {
    characterLevel: 1, classKey: spec.classKey, classLevel: 1, sourceRefs: [createSourceRef(translation, spec.levelTableSection)], choiceIds: [],
    ...(spec.levels && startSubclassKey ? { subclassKey: startSubclassKey } : {}),
  };
  if (!spec.levels) return [start];
  const steps = buildProgressionSteps({ startingClassKey: spec.classKey, levels: spec.levels, levelTableSection: spec.levelTableSection, createSourceRef: (sectionId) => createSourceRef(translation, sectionId) });
  return [start, ...steps];
}

function hasFirstLevelSubclass(spec: ReadyBuildSpec, content: CreatorContent): boolean {
  return content.classes.find((entry) => entry.name === spec.classKey)?.subclassLevel === 1;
}

function buildRecipeDetails(spec: ReadyBuildSpec, translation: Translation): NonNullable<BuildRecipe["details"]> {
  return {
    origin: "example",
    ...(spec.subclassKey ? { subclassKey: spec.subclassKey } : {}),
    raceKey: spec.raceKey,
    ...(spec.variantKey ? { variantKey: spec.variantKey } : {}),
    backgroundKey: spec.backgroundKey,
    ...(spec.featKey ? { featKey: spec.featKey } : {}),
    abilityScores: listAbilityScores(spec.abilityScores),
    nodes: listNodeSectionIds(spec, translation).map((sectionId) => buildNode(translation, sectionId)),
    levelPlans: buildLevelPlans(spec, translation),
    incomplete: spec.incomplete.map((item) => ({ field: item.field, reason: item.reason, sourceRefs: [createSourceRef(translation, item.section)] })),
  };
}

function buildNode(translation: Translation, sectionId: string) {
  const section = findSection(translation, sectionId);
  return { nodeId: sectionId, title: section.heading, text: flattenSectionText(section), sourceRefs: [createSourceRef(translation, sectionId)] };
}

function buildLevelPlans(spec: ReadyBuildSpec, translation: Translation) {
  const { levels, notes } = spec.levelPlans;
  const rows = readLevelTableRows(findSection(translation, spec.levelTableSection), spec.levelPlans).filter((row) => levels === "all" || levels.includes(row.level));
  return rows.map((row) => ({
    level: row.level,
    text: row.features,
    ...(notes && row.notes ? { notes: row.notes } : {}),
    sourceRefs: [createSourceRef(translation, spec.levelTableSection)],
  }));
}

const PRESET_KEY_ORDER = [
  "title", "description", "skills", "expertise", "classOptions", "raceOptions", "subclassOptions", "subraceKey", "equipment",
  "abilityExplanation", "skillExplanation", "equipmentExplanation", "featSection", "portraitSrc", "featOptionName",
  "racialAbilities", "racialAbilityRules", "languages", "skillSection", "equipmentSection", "spells",
] as const;
const OPTIONAL_WHEN_EMPTY = ["raceOptions", "subclassOptions"];

function buildPreset(spec: ReadyBuildSpec, recipe: BuildRecipe): ReadyPreset {
  const body: Record<string, unknown> = spec.preset;
  const orderedKeys = [...PRESET_KEY_ORDER, ...Object.keys(body).filter((key) => !(PRESET_KEY_ORDER as readonly string[]).includes(key))];
  const entries = orderedKeys.filter((key) => key in body && body[key] !== undefined && !isOmittedDefault(key, body[key])).map((key) => [key, body[key]]);
  return { buildId: recipe.buildId, revisionId: recipe.revisionId, articleSlug: spec.articleSlug, ...Object.fromEntries(entries) } as ReadyPreset;
}

function isOmittedDefault(key: string, value: unknown): boolean {
  return OPTIONAL_WHEN_EMPTY.includes(key) && Array.isArray(value) && value.length === 0;
}

function findAbilityTableWarnings(spec: ReadyBuildSpec, translation: Translation, nodeSectionIds: string[]): string[] {
  const sectionId = nodeSectionIds.find((id) => /abilit/.test(id));
  const tableScores = sectionId ? readAbilityTableBaseScores(findSection(translation, sectionId)) : null;
  if (!tableScores) return [];
  const mismatches = listAbilityScores(spec.abilityScores)
    .flatMap((score, index) => (score.value === tableScores[index] ? [] : [`${score.ability} ${score.value} (у таблиці автора ${tableScores[index]})`]));
  return mismatches.length ? [`abilityScores не збігаються з таблицею автора «${sectionId}»: ${mismatches.join(", ")}. Якщо відступ навмисний, поясніть його в abilityExplanation.`] : [];
}
