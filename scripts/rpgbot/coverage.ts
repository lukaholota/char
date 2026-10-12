import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { idSchema, sectionSchema, sourceRevisionSchema } from "../../src/lib/optimization/schema";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import type { ArticleDocument } from "../../src/lib/optimization/types";
import { extractHtml } from "./extract-html";

const manifestSchema = z.object({ entries: z.array(z.object({ sourceId: idSchema, disposition: z.enum(["included", "excluded", "review"]),
  canonicalUrl: z.url(), materialType: z.string(), rulesets: z.array(z.enum(["2014", "2024"])) })) });
const stageSchema = z.object({ kind: z.literal("source-extraction"), sourceRevision: sourceRevisionSchema,
  rawHtmlHash: z.string().regex(/^[a-f0-9]{64}$/), sections: z.array(sectionSchema),
  issues: z.array(z.object({ code: z.string(), location: z.string(), detail: z.string() })),
  metrics: z.object({ words: z.number(), sections: z.number(), blocks: z.number(), tables: z.number(), ratingSignals: z.number() }) });
type ManifestEntry = z.infer<typeof manifestSchema>["entries"][number];
type Stage = z.infer<typeof stageSchema>;
const paginationSchema = z.object({ checks: z.record(z.url(), z.object({ parentSourceId: idSchema,
  url: z.url(), status: z.string(), revisionId: idSchema.optional(), rawHtmlSha256: z.string().optional() })) });
const supplementSchema = z.strictObject({ parentSourceId: idSchema, url: z.url(), revisionId: idSchema,
  htmlFile: z.string().regex(/^[a-zA-Z0-9_-]+\.html$/), rawHtmlSha256: z.string().regex(/^[a-f0-9]{64}$/),
  fetchedAt: z.iso.datetime({ offset: true }), authors: z.array(z.string().min(1)).min(1),
  title: z.string().min(1), sourceUpdatedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  contentSelector: z.string().min(1) });
type Supplement = { revisionId: string; parentSourceId: string; sections: Stage["sections"];
  issues: Stage["issues"]; metrics: Stage["metrics"] };
type Publication = { document: ArticleDocument; translation: ArticleDocument["translations"][number] | undefined };
const reviewSchema = z.strictObject({ sourceRevisionId: idSchema, reviewedAt: z.iso.datetime({ offset: true }),
  issueDecisions: z.array(z.strictObject({ issueIndex: z.number().int().nonnegative(),
    disposition: z.enum(["preserved", "excluded-noncontent", "corrected-in-translation"]),
    evidence: z.string().min(1), ratingIds: z.array(idSchema).optional() })) });
type Review = z.infer<typeof reviewSchema>;

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function jsonFiles(directory: string): Promise<string[]> {
  try { return (await readdir(directory)).filter((name) => name.endsWith(".json")).sort(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

function publicationFor(source: ManifestEntry, edition: "2014" | "2024", documents: ArticleDocument[]): Publication[] {
  return documents.filter((document) => document.article.sourceId === source.sourceId &&
    document.article.ruleset === `RULES_${edition}`).map((document) => ({ document,
    translation: document.translations.find((revision) => revision.translationRevisionId === document.article.publishedRevisionId)
      ?? document.translations[document.translations.length - 1] }));
}

function structureGaps(stage: Stage, publication: Publication) {
  const translated = new Map(publication.translation?.sections.map((section) => [section.sectionId, section]) ?? []);
  const missingSectionIds = stage.sections.filter((section) => !translated.has(section.sectionId)).map((section) => section.sectionId);
  const missingBlockIds: string[] = [];
  const blockTypeMismatches: string[] = [];
  for (const section of stage.sections) {
    const translatedBlocks = new Map(translated.get(section.sectionId)?.blocks.map((block) => [block.blockId, block.type]) ?? []);
    for (const block of section.blocks) {
      const key = `${section.sectionId}/${block.blockId}`;
      if (!translatedBlocks.has(block.blockId)) missingBlockIds.push(key);
      else if (translatedBlocks.get(block.blockId) !== block.type) blockTypeMismatches.push(key);
    }
  }
  return { missingSectionIds, missingBlockIds, blockTypeMismatches };
}

function unresolvedIssues(stage: Stage, review: Review | undefined, publication: Publication): string[] {
  const translationId = publication.translation?.translationRevisionId;
  const ratings = new Set(publication.document.ratings.filter((rating) => rating.translationRevisionId === translationId)
    .map((rating) => rating.ratingId));
  const decisions = review?.sourceRevisionId === stage.sourceRevision.revisionId ? review.issueDecisions : [];
  return stage.issues.flatMap((issue, index) => {
    if (issue.code === "provisional-id") return [];
    const matches = decisions.filter((decision) => decision.issueIndex === index);
    if (matches.length !== 1) return [issue.code];
    if (issue.code === "rating-signal-review" && matches[0].disposition === "preserved" &&
      (!matches[0].ratingIds?.length || !matches[0].ratingIds.every((id) => ratings.has(id)))) return [issue.code];
    return [];
  });
}

function selectStage(stages: Stage[], sourceId: string) {
  const matches = stages.filter((stage) => stage.sourceRevision.sourceId === sourceId)
    .sort((a, b) => b.sourceRevision.fetchedAt.localeCompare(a.sourceRevision.fetchedAt));
  const latest = matches[0];
  const ambiguous = !!latest && matches.some((stage) => stage.sourceRevision.fetchedAt === latest.sourceRevision.fetchedAt &&
    stage.sourceRevision.contentHash !== latest.sourceRevision.contentHash);
  return { latest, ambiguous };
}

function statusOf(stage: Stage | undefined, publications: Publication[], review?: Review) {
  if (!stage) return "missing-source";
  if (!publications.length) return "missing-translation";
  if (publications.length > 1) return "ambiguous-publication";
  const publication = publications[0];
  if (publication.document.article.status === "unpublished") return "unpublished-translation";
  if (!publication.translation) return "missing-translation";
  if (publication.translation.status === "draft") return "unreviewed-translation";
  const pinnedRevisionId = publication.translation.sourceRevisionId;
  const pinned = publication.document.sourceRevisions.find((revision) => revision.revisionId === pinnedRevisionId);
  if (publication.translation.status === "stale" || pinned?.contentHash !== stage.sourceRevision.contentHash)
    return "stale-translation";
  const gaps = structureGaps(stage, publication);
  if (unresolvedIssues(stage, review, publication).length || Object.values(gaps).some((ids) => ids.length))
    return "extraction-review-required";
  return "reviewed";
}

async function readStages(directory: string) {
  const names = await jsonFiles(join(directory, "staging"));
  const stages = await Promise.all(names.map(async (name) => {
    const stage = stageSchema.parse(await readJson(join(directory, "staging", name)));
    if (name !== `${stage.sourceRevision.revisionId}.json`) throw new Error(`Staging filename mismatch: ${name}`);
    const html = await readFile(join(directory, stage.sourceRevision.sourceFile), "utf8");
    const hash = createHash("sha256").update(html).digest("hex");
    if (hash !== stage.rawHtmlHash) throw new Error(`Source HTML hash mismatch: ${name}`);
    return stage;
  }));
  let index: Record<string, string> = {};
  try { index = z.record(idSchema, z.string().regex(/^[a-zA-Z0-9_-]+\.json$/))
    .parse(await readJson(join(directory, "staging-corrections", "index.json"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  for (const [revisionId, name] of Object.entries(index)) {
    const position = stages.findIndex((stage) => stage.sourceRevision.revisionId === revisionId);
    if (position < 0) throw new Error(`Correction without original stage: ${revisionId}`);
    const correction = await readJson(join(directory, "staging-corrections", name));
    if (!correction || typeof correction !== "object" ||
      (correction as { correctionOf?: string }).correctionOf !== `staging/${revisionId}.json`)
      throw new Error(`Correction parent mismatch: ${name}`);
    const corrected = stageSchema.parse(correction);
    if (corrected.sourceRevision.revisionId !== revisionId || corrected.rawHtmlHash !== stages[position].rawHtmlHash ||
      corrected.sourceRevision.sourceFile !== stages[position].sourceRevision.sourceFile)
      throw new Error(`Correction source mismatch: ${name}`);
    stages[position] = corrected;
  }
  return stages;
}

async function readSupplements(directory: string): Promise<Supplement[]> {
  let pagination: z.infer<typeof paginationSchema>;
  try { pagination = paginationSchema.parse(await readJson(join(directory, "source-pagination.json"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  return Promise.all(Object.entries(pagination.checks).filter(([, check]) => check.status === "record-ready")
    .map(async ([url, check]) => {
      const record = supplementSchema.parse(await readJson(join(directory, "source-supplements", `${check.revisionId}.record.json`)));
      if (url !== record.url || check.url !== url || check.parentSourceId !== record.parentSourceId ||
        check.revisionId !== record.revisionId || check.rawHtmlSha256 !== record.rawHtmlSha256 ||
        record.htmlFile !== `${record.revisionId}.html`) throw new Error(`Supplement metadata mismatch: ${url}`);
      const html = await readFile(join(directory, "source-supplements", record.htmlFile), "utf8");
      if (createHash("sha256").update(html).digest("hex") !== record.rawHtmlSha256)
        throw new Error(`Supplement HTML hash mismatch: ${url}`);
      const extracted = extractHtml(html, url, record.contentSelector, record.title);
      return { revisionId: record.revisionId, parentSourceId: record.parentSourceId,
        sections: extracted.sections, issues: extracted.issues, metrics: extracted.metrics };
    }));
}

function withSupplements(stage: Stage | undefined, supplements: Supplement[]): Stage | undefined {
  if (!stage || !supplements.length) return stage;
  const sections = [...stage.sections, ...supplements.flatMap((supplement) => supplement.sections)];
  const sectionIds = sections.map((section) => section.sectionId);
  const blockIds = sections.flatMap((section) => section.blocks.map((block) => block.blockId));
  if (new Set(sectionIds).size !== sectionIds.length || new Set(blockIds).size !== blockIds.length)
    throw new Error(`Supplement ID collision: ${stage.sourceRevision.sourceId}`);
  const metrics = { ...stage.metrics };
  for (const supplement of supplements) for (const key of Object.keys(metrics) as (keyof Stage["metrics"])[])
    metrics[key] += supplement.metrics[key];
  return { ...stage, sections, metrics, issues: [...stage.issues, ...supplements.flatMap((supplement) => supplement.issues),
    { code: "pagination-supplement-review", location: stage.sourceRevision.sourceId,
      detail: supplements.map((supplement) => supplement.revisionId).join(", ") }] };
}

export async function buildCoverage(directory: string) {
  const manifest = manifestSchema.parse(await readJson(join(directory, "manifest.json")));
  const stages = await readStages(directory);
  const supplements = await readSupplements(directory);
  const documents = await Promise.all((await jsonFiles(join(directory, "uk")))
    .map(async (name) => parseArticleDocument(await readJson(join(directory, "uk", name)))));
  const reviews = await Promise.all((await jsonFiles(join(directory, "reviews")))
    .map(async (name) => {
      const review = reviewSchema.parse(await readJson(join(directory, "reviews", name)));
      if (name !== `${review.sourceRevisionId}.json`) throw new Error(`Review filename mismatch: ${name}`);
      return review;
    }));
  for (const review of reviews) {
    const original = stages.find((item) => item.sourceRevision.revisionId === review.sourceRevisionId);
    if (!original) throw new Error(`Review without source revision: ${review.sourceRevisionId}`);
    const stage = withSupplements(original, supplements.filter((entry) => entry.parentSourceId === original.sourceRevision.sourceId))!;
    const indices = review.issueDecisions.map((decision) => decision.issueIndex);
    if (indices.some((index) => index >= stage.issues.length) || new Set(indices).size !== indices.length)
      throw new Error(`Invalid review issue indexes: ${review.sourceRevisionId}`);
  }
  const included = manifest.entries.filter((entry) => entry.disposition === "included");
  const excluded = new Set(manifest.entries.filter((entry) => entry.disposition === "excluded").map((entry) => entry.sourceId));
  for (const supplement of supplements) if (!included.some((entry) => entry.sourceId === supplement.parentSourceId))
    throw new Error(`Supplement without included parent: ${supplement.revisionId}`);
  const rows = included.flatMap((source) => source.rulesets.map((edition) => {
    const selected = selectStage(stages, source.sourceId);
    const sourceSupplements = supplements.filter((supplement) => supplement.parentSourceId === source.sourceId);
    const stage = withSupplements(selected.latest, sourceSupplements);
    const publications = publicationFor(source, edition, documents);
    const review = reviews.find((item) => item.sourceRevisionId === stage?.sourceRevision.revisionId);
    const gaps = stage && publications.length === 1 ? structureGaps(stage, publications[0])
      : { missingSectionIds: [], missingBlockIds: [], blockTypeMismatches: [] };
    return { sourceId: source.sourceId, ruleset: `RULES_${edition}`, canonicalUrl: source.canonicalUrl,
      materialType: source.materialType, status: selected.ambiguous ? "ambiguous-source-revision" : statusOf(stage, publications, review),
      sourceRevisionId: stage?.sourceRevision.revisionId ?? null,
      supplementRevisionIds: sourceSupplements.map((supplement) => supplement.revisionId),
      articleIds: publications.map((item) => item.document.article.articleId),
      ...gaps,
      unresolvedExtractionIssueCodes: stage && publications.length === 1 ? unresolvedIssues(stage, review, publications[0])
        : stage?.issues.filter((issue) => issue.code !== "provisional-id").map((issue) => issue.code) ?? [],
      textMetrics: stage?.metrics ?? { words: "unknown", sections: "unknown", blocks: "unknown", tables: "unknown", ratingSignals: "unknown" } };
  }));
  rows.sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.ruleset.localeCompare(b.ruleset));
  const statusCounts = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort()
    .map((status) => [status, rows.filter((row) => row.status === status).length]));
  const orphanSourceRevisionIds = stages.filter((stage) => !excluded.has(stage.sourceRevision.sourceId) && !included.some((entry) => entry.sourceId === stage.sourceRevision.sourceId))
    .map((stage) => stage.sourceRevision.revisionId);
  const orphanArticleIds = documents.filter((document) => !excluded.has(document.article.sourceId) && !included.some((entry) => entry.sourceId === document.article.sourceId))
    .map((document) => document.article.articleId);
  return { schemaVersion: 1, includedSources: included.length, publicationSlots: rows.length,
    unresolvedManifestSources: manifest.entries.filter((entry) => entry.disposition === "review").length,
    orphanSourceRevisionIds, orphanArticleIds, statusCounts,
    fullyEditoriallyVerified: rows.length > 0 && !orphanSourceRevisionIds.length && !orphanArticleIds.length &&
      rows.every((row) => row.status === "reviewed"), rows };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { input: { type: "string", default: "data/rpgbot" },
    output: { type: "string", default: "data/rpgbot/translation.coverage.json" },
    apply: { type: "boolean", default: false } } });
  const report = await buildCoverage(resolve(values.input!));
  const next = `${JSON.stringify(report, null, 2)}\n`;
  let previous: string | undefined;
  try { previous = await readFile(resolve(values.output!), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  if (values.apply && previous !== next) await writeFile(resolve(values.output!), next);
  console.log(JSON.stringify({ mode: values.apply ? "apply" : "preview", output: resolve(values.output!),
    changed: previous !== next, includedSources: report.includedSources, publicationSlots: report.publicationSlots,
    unresolvedManifestSources: report.unresolvedManifestSources, statusCounts: report.statusCounts }, null, 2));
}
