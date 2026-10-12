import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { importExport } from "../../../scripts/rpgbot/import-export";
import { buildCoverage } from "../../../scripts/rpgbot/coverage";
import { extractHtml } from "../../../scripts/rpgbot/extract-html";
import { reextractCorrections } from "../../../scripts/rpgbot/reextract-corrections";

const date = "2026-09-29T00:00:00Z";
const canonicalUrl = "https://example.org/original-guide/";
const html = `<html><head><link rel="canonical" href="${canonicalUrl}"></head><body>
  <article><nav>Unrelated menu</nav><h2 id="choices">Choices</h2>
  <p id="option">An <span class="rating-red">option</span> under conditions. <a href="/more/">Read more</a>.</p>
  <ul><li>One</li><li>Two</li></ul><table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>B</td></tr></table>
  <figure><img alt="decorative"></figure><aside>Advertisement</aside></article></body></html>`;
const created: string[] = [];
afterEach(async () => { await Promise.all(created.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "rpgbot-import-fixture-")); created.push(directory);
  await mkdir(join(directory, "uk"));
  const recordPath = join(directory, "record.json");
  const record = { sourceId: "fixture-source", canonicalUrl, htmlFile: "article.html", contentSelector: "article",
    fetchedAt: date, authors: ["Fixture author"], title: "Original guide",
    provenance: { kind: "owner-supplied", evidence: "Original technical fixture" } };
  await writeFile(join(directory, "manifest.json"), JSON.stringify({ entries: [
    { sourceId: "fixture-source", canonicalUrl, disposition: "included", materialType: "practical-guide", rulesets: ["2014"] },
    { sourceId: "review-source", canonicalUrl: "https://example.org/review/", disposition: "review", materialType: "guide", rulesets: [] },
  ] }));
  await writeFile(join(directory, "article.html"), html);
  await writeFile(recordPath, JSON.stringify(record));
  return { directory, recordPath, record };
}

it("normalizes supported HTML and reports content needing editorial review", () => {
  const extracted = extractHtml(html, canonicalUrl, "article", "Original guide");
  expect(extracted.sections).toHaveLength(1);
  expect(extracted.sections[0].blocks.map((block) => block.type)).toEqual(["paragraph", "list", "table"]);
  expect(extracted.sections[0].blocks[0]).toMatchObject({ blockId: "block-section-choices-option", type: "paragraph" });
  expect(extracted.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["rating-signal-review", "provisional-id", "unsupported-block"]));
  expect(extracted.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
  expect(extracted.metrics).toMatchObject({ sections: 1, blocks: 3, tables: 1, ratingSignals: 1 });
  expect(JSON.stringify(extracted.sections)).not.toContain("Unrelated menu");
  expect(JSON.stringify(extracted.sections)).not.toContain("Advertisement");
});

it("never hides unsupported content, unsafe links or table spans", () => {
  const sample = `<article><h2 id="h">Guide</h2><p><a href="javascript:alert(1)">unsafe</a>
    <a href="http://[malformed">malformed</a></p>
    <table><tr><th>H</th></tr><tr><td colspan="2">Cell</td></tr></table>
    <blockquote><p>Important quote</p></blockquote></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "unsafe-link", "table-span-review", "blockquote-review",
  ]));
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
  expect(JSON.stringify(result.sections)).not.toContain("javascript:");
  expect(JSON.stringify(result.sections)).not.toContain("http://[malformed");
});

it("preserves hierarchy and orderedness of nested list items", () => {
  const sample = `<article><h2 id="h">Guide</h2><ol><li>Parent<div><ul><li>Child</li></ul></div></li><li>Next</li></ol></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.sections[0].blocks[0]).toMatchObject({ type: "list", depths: [0, 1, 0],
    itemKinds: ["ordered", "unordered", "ordered"] });
  expect(result.issues.map((issue) => issue.code)).not.toContain("nested-list-review");
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("extracts figure-wrapped tables and disambiguates repeated source anchors", () => {
  const sample = `<article><h2 id="h">Guide</h2><figure class="wp-block-table"><table>
    <tr><th>Choice</th><th>Rating</th></tr><tr><td>A</td><td>Blue</td></tr></table>
    <figcaption>Comparison</figcaption></figure><h2 id="h">More</h2><p id="same">First</p><p id="same">Second</p></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.metrics.tables).toBe(1);
  expect(result.sections.map((section) => section.sectionId)).toEqual(["section-h", "section-h-2"]);
  expect(result.sections[0].blocks.map((block) => block.type)).toEqual(["table", "paragraph"]);
  expect(result.sections[1].blocks.map((block) => block.blockId)).toEqual([
    "block-section-h-2-same", "block-section-h-2-same-2",
  ]);
  expect(result.issues.map((issue) => issue.code)).toContain("duplicate-id-review");
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("keeps content after an empty heading and reports the malformed heading", () => {
  const sample = `<article><h2 id="guide">Guide</h2><p>Before</p><h3 id="empty"></h3><p>After</p></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.sections).toHaveLength(1);
  expect(result.sections[0].blocks).toHaveLength(2);
  expect(result.issues.map((issue) => issue.code)).toContain("empty-heading-review");
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("preserves loose text between container elements", () => {
  const sample = `<article><h2 id="guide">Guide</h2><p>Before</p>Unwrapped explanation<div>Nested text</div><p>After</p></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.sections[0].blocks.map((block) => block.type)).toEqual([
    "paragraph", "paragraph", "paragraph", "paragraph",
  ]);
  expect(result.issues.map((issue) => issue.code)).toContain("loose-text-review");
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("preserves a list nested inside a loose list item", () => {
  const sample = `<article><h2>Guide</h2><li>Outer<div><ul><li>Inner</li></ul></div></li></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.sections[0].blocks.map((block) => block.type)).toEqual(["paragraph", "list"]);
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("retains malformed text and links directly inside a list", () => {
  const sample = `<article><h2>Guide</h2><ul>See <a href="/guide">guide</a> first<li>Option</li></ul></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  const block = result.sections[0].blocks[0];
  expect(block).toMatchObject({ type: "list", depths: [0, 0], itemKinds: ["unordered", "unordered"] });
  if (block.type === "list") {
    expect(block.items[0].map((node) => node.text).join("")).toBe("See guide first");
    expect(block.items[0][1]).toMatchObject({ type: "link", href: "https://example.org/guide" });
  }
  expect(result.issues.map((issue) => issue.code)).toContain("orphan-list-content-review");
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("retains a nested list without a parent list item", () => {
  const sample = `<article><h2>Guide</h2><ul><li>First</li><ul><li>Nested</li></ul><li>Last</li></ul></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.sections[0].blocks[0]).toMatchObject({ type: "list", depths: [0, 1, 0],
    itemKinds: ["unordered", "unordered", "unordered"] });
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("keeps a quoted embed and an empty-row table without losing text", () => {
  const sample = `<article><h2>Guide</h2><figure class="wp-block-embed"><div>
    <blockquote><p>A ruling with <a href="/proof">proof</a>.</p>— Author</blockquote></div></figure>
    <table><thead><tr><th>Build</th><th>Score</th></tr><tr><th>Type</th><th>Value</th></tr></thead>
    <tbody><tr><td>Archer</td><td>14</td></tr><tr></tr><tr><td>Mage</td><td>15</td></tr></tbody></table></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(result.sections[0].blocks.map((block) => block.type)).toEqual(["paragraph", "table"]);
  const quote = result.sections[0].blocks[0];
  if (quote.type === "paragraph") expect(quote.content.map((node) => node.text).join("")).toContain("— Author");
  const table = result.sections[0].blocks[1];
  if (table.type === "table") expect(table.rows).toHaveLength(3);
  expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "blockquote-review", "empty-table-row-review", "multi-header-row-review",
  ]));
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("preserves text in lists nested inside table cells", () => {
  const sample = `<article><h2>Guide</h2><table><caption>Summon choices</caption><tr><th>Options</th></tr>
    <tr><td>Summons<ul><li>First</li><li>Second</li></ul></td></tr></table></article>`;
  const result = extractHtml(sample, canonicalUrl, "article", "Guide");
  const table = result.sections[0].blocks[0];
  expect(table.type).toBe("table");
  if (table.type === "table") {
    expect(table.caption?.map((node) => node.text).join("")).toBe("Summon choices");
    expect(table.rows[0][0].map((node) => node.text).join("")).toContain("FirstSecond");
  }
  expect(result.issues.map((issue) => issue.code)).toContain("table-nested-list-review");
  expect(result.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
});

it("excludes numbered page navigation from text coverage", () => {
  const sample = `<article><h2>Classes</h2><p>Class advice.</p>
    <div class="pagination"><a class="post-page-numbers" href="/guide/">Previous</a><span>2</span></div></article>`;
  const extracted = extractHtml(sample, canonicalUrl, "article", "Guide");
  expect(extracted.sections[0].blocks).toHaveLength(1);
  expect(extracted.issues.map((issue) => issue.code)).not.toContain("text-coverage-review");
  expect(JSON.stringify(extracted.sections)).not.toContain("Previous");
});

it("rejects missing/multiple selectors, canonical mismatch and non-included sources", async () => {
  const fixture = await setup();
  expect(() => extractHtml(html, canonicalUrl, "main", "Guide")).toThrow("matched 0");
  expect(() => extractHtml("<main></main><main></main>", canonicalUrl, "main", "Guide")).toThrow("matched 2");
  await writeFile(join(fixture.directory, "article.html"), html.replace(canonicalUrl, "https://example.org/other/"));
  await expect(importExport(fixture.recordPath, fixture.directory, false)).rejects.toThrow("canonical differs");
  await writeFile(join(fixture.directory, "article.html"), html);
  await writeFile(fixture.recordPath, JSON.stringify({ ...fixture.record, sourceId: "review-source" }));
  await expect(importExport(fixture.recordPath, fixture.directory, false)).rejects.toThrow("absent or canonical mismatch");
});

it("previews, applies immutably and reports missing, reviewed, structural and stale states", async () => {
  const fixture = await setup();
  expect((await buildCoverage(fixture.directory)).statusCounts).toEqual({ "missing-source": 1 });
  expect((await importExport(fixture.recordPath, fixture.directory, false)).files.every((file) => file.changed)).toBe(true);
  const applied = await importExport(fixture.recordPath, fixture.directory, true);
  expect((await importExport(fixture.recordPath, fixture.directory, false)).files.every((file) => !file.changed)).toBe(true);
  expect((await buildCoverage(fixture.directory)).statusCounts).toEqual({ "missing-translation": 1 });
  const staged = JSON.parse(await readFile(applied.files[1].path, "utf8"));
  expect(staged.status).toBe("needs-editorial-review");
  const blocks = staged.sections[0].blocks;
  const document = { sources: [{ sourceId: "fixture-source", rulesets: ["RULES_2014"] }],
    sourceRevisions: [staged.sourceRevision], article: { articleId: "fixture-article", sourceId: "fixture-source",
      slug: "fixture-guide", ruleset: "RULES_2014", titleUk: "Технічний приклад", titleEn: "Original guide",
      topics: [], status: "published", publishedRevisionId: "translation-r1" },
    translations: [{ translationRevisionId: "translation-r1", articleId: "fixture-article",
      sourceRevisionId: staged.sourceRevision.revisionId, status: "reviewed", reviewedAt: date, sections: staged.sections }],
    ratings: [{ ratingId: "rating-r1", articleId: "fixture-article", translationRevisionId: "translation-r1",
      sectionId: staged.sections[0].sectionId, targetBlockId: blocks[0].blockId, context: "Fixture condition",
      score: 1, sourceColor: "red", explanation: "Original fixture rationale" }] };
  await writeFile(join(fixture.directory, "uk/fixture-article.json"), JSON.stringify(document));
  expect((await buildCoverage(fixture.directory)).statusCounts).toEqual({ "extraction-review-required": 1 });
  await mkdir(join(fixture.directory, "reviews"));
  const review = { sourceRevisionId: staged.sourceRevision.revisionId, reviewedAt: date,
    issueDecisions: staged.issues.flatMap((issue: { code: string }, index: number) => issue.code === "provisional-id" ? [] : [{
      issueIndex: index, disposition: issue.code === "rating-signal-review" ? "preserved" : "excluded-noncontent",
      evidence: "Checked original technical fixture", ...(issue.code === "rating-signal-review" ? { ratingIds: ["rating-r1"] } : {}),
    }]) };
  await writeFile(join(fixture.directory, `reviews/${review.sourceRevisionId}.json`), JSON.stringify(review));
  expect((await buildCoverage(fixture.directory)).statusCounts).toEqual({ reviewed: 1 });
  document.translations[0].sections[0].blocks = blocks.filter((block: { type: string }) => block.type !== "table");
  await writeFile(join(fixture.directory, "uk/fixture-article.json"), JSON.stringify(document));
  expect((await buildCoverage(fixture.directory)).rows[0].missingBlockIds).toContain(`${staged.sections[0].sectionId}/${blocks[2].blockId}`);
  document.translations[0].sections[0].blocks = blocks;
  await writeFile(join(fixture.directory, "uk/fixture-article.json"), JSON.stringify(document));
  await writeFile(join(fixture.directory, "article.html"), html.replace("under conditions", "under changed conditions"));
  await writeFile(fixture.recordPath, JSON.stringify({ ...fixture.record, fetchedAt: "2026-09-30T00:00:00Z" }));
  await importExport(fixture.recordPath, fixture.directory, true);
  expect((await buildCoverage(fixture.directory)).statusCounts).toEqual({ "stale-translation": 1 });
  expect(await readFile(applied.files[0].path, "utf8")).toBe(html);
  expect(document.translations[0].sourceRevisionId).toBe(staged.sourceRevision.revisionId);
});

it("refuses to overwrite an immutable revision and detects source corruption", async () => {
  const fixture = await setup();
  const applied = await importExport(fixture.recordPath, fixture.directory, true);
  await writeFile(fixture.recordPath, JSON.stringify({ ...fixture.record, title: "Changed metadata" }));
  await expect(importExport(fixture.recordPath, fixture.directory, true)).rejects.toThrow("Existing staging differs");
  await writeFile(applied.files[0].path, "corrupted");
  await expect(buildCoverage(fixture.directory)).rejects.toThrow("hash mismatch");
});

it("applies an append-only extraction correction without changing the original stage", async () => {
  const fixture = await setup();
  const applied = await importExport(fixture.recordPath, fixture.directory, true);
  const stage = JSON.parse(await readFile(applied.files[1].path, "utf8"));
  stage.metrics.words = 1;
  stage.sourceRevision.contentHash = "0".repeat(64);
  stage.issues.push({ code: "text-coverage-review", location: "root", detail: "Old extractor loss" });
  await writeFile(applied.files[1].path, JSON.stringify(stage));
  await writeFile(join(fixture.directory, "source", `${stage.sourceRevision.revisionId}.record.json`),
    JSON.stringify({ ...fixture.record, htmlFile: `${stage.sourceRevision.revisionId}.html` }));
  const preview = await reextractCorrections(fixture.directory, false);
  expect(preview).toMatchObject({ examined: 1, fixed: 1, unresolved: 0 });
  expect((await buildCoverage(fixture.directory)).rows[0].textMetrics.words).toBe(1);
  const appliedCorrection = await reextractCorrections(fixture.directory, true);
  expect((await buildCoverage(fixture.directory)).rows[0].textMetrics.words).toBeGreaterThan(1);
  expect((await buildCoverage(fixture.directory)).rows[0].sourceRevisionId).toBe(stage.sourceRevision.revisionId);
  const corrected = JSON.parse(await readFile(join(fixture.directory, "staging-corrections",
    appliedCorrection.rows[0].correctionFile!), "utf8"));
  expect(corrected.sourceRevision.contentHash).not.toBe(stage.sourceRevision.contentHash);
  expect(JSON.parse(await readFile(applied.files[1].path, "utf8")).metrics.words).toBe(1);
});

it("counts a paginated supplement and requires its sections in the translation", async () => {
  const fixture = await setup();
  const imported = await importExport(fixture.recordPath, fixture.directory, true);
  const continuation = `<article><h2 id="next-page">Continuation</h2><p>Additional advice.</p>
    <div class="pagination"><a href="/original-guide/">Previous</a></div></article>`;
  const revisionId = "fixture-source-page2-abcdef0123456789";
  const url = "https://example.org/original-guide/2/";
  const hash = createHash("sha256").update(continuation).digest("hex");
  await mkdir(join(fixture.directory, "source-supplements"));
  await writeFile(join(fixture.directory, "source-supplements", `${revisionId}.html`), continuation);
  await writeFile(join(fixture.directory, "source-supplements", `${revisionId}.record.json`), JSON.stringify({
    parentSourceId: "fixture-source", url, revisionId, htmlFile: `${revisionId}.html`, rawHtmlSha256: hash,
    fetchedAt: date, authors: ["Fixture author"], title: "Continuation", contentSelector: "article",
  }));
  await writeFile(join(fixture.directory, "source-pagination.json"), JSON.stringify({ checks: { [url]: {
    parentSourceId: "fixture-source", url, status: "record-ready", revisionId, rawHtmlSha256: hash,
  } } }));
  const coverage = await buildCoverage(fixture.directory);
  expect(coverage.rows[0].supplementRevisionIds).toEqual([revisionId]);
  expect(coverage.rows[0].textMetrics.sections).toBe(2);
  expect(coverage.rows[0].unresolvedExtractionIssueCodes).toContain("pagination-supplement-review");
  const stage = JSON.parse(await readFile(imported.files[1].path, "utf8"));
  const supplementIssues = extractHtml(continuation, url, "article", "Continuation").issues;
  const lastIssueIndex = stage.issues.length + supplementIssues.length;
  await mkdir(join(fixture.directory, "reviews"));
  const reviewPath = join(fixture.directory, "reviews", `${stage.sourceRevision.revisionId}.json`);
  const review = { sourceRevisionId: stage.sourceRevision.revisionId, reviewedAt: date,
    issueDecisions: [{ issueIndex: lastIssueIndex, disposition: "preserved",
      evidence: "Checked the continuation against its original HTML" }] };
  await writeFile(reviewPath, JSON.stringify(review));
  await expect(buildCoverage(fixture.directory)).resolves.toMatchObject({ publicationSlots: 1 });
  await writeFile(reviewPath, JSON.stringify({ ...review, issueDecisions: [
    { ...review.issueDecisions[0], issueIndex: lastIssueIndex + 1 },
  ] }));
  await expect(buildCoverage(fixture.directory)).rejects.toThrow("Invalid review issue indexes");
  await writeFile(reviewPath, JSON.stringify({ ...review, issueDecisions: [
    review.issueDecisions[0], review.issueDecisions[0],
  ] }));
  await expect(buildCoverage(fixture.directory)).rejects.toThrow("Invalid review issue indexes");
  await writeFile(reviewPath, JSON.stringify(review));
  await writeFile(join(fixture.directory, "uk/fixture-article.json"), JSON.stringify({
    sources: [{ sourceId: "fixture-source", rulesets: ["RULES_2014"] }],
    sourceRevisions: [stage.sourceRevision],
    article: { articleId: "fixture-article", sourceId: "fixture-source", slug: "fixture-guide",
      ruleset: "RULES_2014", titleUk: "Приклад", titleEn: "Original guide", topics: [], status: "unpublished" },
    translations: [{ translationRevisionId: "translation-r1", articleId: "fixture-article",
      sourceRevisionId: stage.sourceRevision.revisionId, status: "draft", sections: stage.sections }], ratings: [],
  }));
  expect((await buildCoverage(fixture.directory)).rows[0].missingSectionIds).toContain("section-next-page");
  await writeFile(join(fixture.directory, "source-supplements", `${revisionId}.html`), "corrupted");
  await expect(buildCoverage(fixture.directory)).rejects.toThrow("Supplement HTML hash mismatch");
});

// The raw rpgbot.net HTML stays out of git, so CI has no source to hash.
it.skipIf(!existsSync("data/rpgbot/source"))("reports current manifest coverage without mistaking URL count for publications", async () => {
  const report = await buildCoverage("data/rpgbot");
  expect(report.includedSources).toBe(391);
  expect(report.publicationSlots).toBe(393);
  expect(report.unresolvedManifestSources).toBe(63);
  expect(report.rows).toHaveLength(393);
});
