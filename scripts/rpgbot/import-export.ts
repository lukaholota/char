import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { z } from "zod";
import { idSchema, sourceRevisionSchema } from "../../src/lib/optimization/schema";
import { extractHtml } from "./extract-html";

const recordSchema = z.strictObject({
  sourceId: idSchema, canonicalUrl: z.url(), htmlFile: z.string().regex(/^[a-zA-Z0-9_.-]+\.html$/),
  contentSelector: z.string().min(1), fetchedAt: z.iso.datetime({ offset: true }),
  sourceUpdatedAt: z.iso.datetime({ offset: true }).optional(),
  authors: z.array(z.string().min(1)).min(1), title: z.string().min(1),
  provenance: z.strictObject({ kind: z.enum(["owner-supplied", "publisher-permission", "owner-requested-crawl"]), evidence: z.string().min(1) }),
  etag: z.string().min(1).optional(), lastModified: z.string().min(1).optional(),
});
const manifestSchema = z.object({ entries: z.array(z.object({ sourceId: idSchema, canonicalUrl: z.url(),
  disposition: z.enum(["included", "excluded", "review"]) })) });
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function existing(path: string): Promise<string | undefined> {
  try { return await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}

async function writeImmutable(path: string, content: string) {
  const previous = await existing(path);
  if (previous !== undefined && previous !== content) throw new Error(`Existing revision differs: ${path}`);
  if (previous !== undefined) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, { flag: "wx" });
}

function verifyCanonical(html: string, expected: string) {
  const document = new JSDOM(html, { url: expected, virtualConsole: new VirtualConsole() }).window.document;
  const canonical = document.querySelector("link[rel~='canonical']")?.getAttribute("href");
  if (canonical && new URL(canonical, expected).href !== expected) throw new Error(`HTML canonical differs from manifest: ${canonical}`);
}

export async function prepareExport(recordPath: string, corpusRoot: string) {
  const record = recordSchema.parse(JSON.parse(await readFile(recordPath, "utf8")));
  const manifest = manifestSchema.parse(JSON.parse(await readFile(join(corpusRoot, "manifest.json"), "utf8")));
  const source = manifest.entries.find((entry) => entry.sourceId === record.sourceId && entry.disposition === "included");
  if (!source || source.canonicalUrl !== record.canonicalUrl) throw new Error(`Source absent or canonical mismatch: ${record.sourceId}`);
  const html = await readFile(join(dirname(recordPath), record.htmlFile), "utf8");
  verifyCanonical(html, record.canonicalUrl);
  const extracted = extractHtml(html, record.canonicalUrl, record.contentSelector, record.title);
  const revisionId = `${record.sourceId}-${sha256(html).slice(0, 16)}`;
  const revision = sourceRevisionSchema.parse({ revisionId, sourceId: record.sourceId,
    fetchedAt: record.fetchedAt, sourceUpdatedAt: record.sourceUpdatedAt, contentHash: extracted.contentHash,
    authors: record.authors, title: record.title, sourceFile: `source/${revisionId}.html`,
    evidence: record.provenance.evidence, etag: record.etag, lastModified: record.lastModified });
  const staged = { schemaVersion: 1, kind: "source-extraction", canonicalUrl: record.canonicalUrl,
    contentSelector: record.contentSelector, provenance: record.provenance, rawHtmlHash: sha256(html), sourceRevision: revision,
    sections: extracted.sections, issues: extracted.issues, metrics: extracted.metrics,
    status: "needs-editorial-review" };
  return { html, staged, sourcePath: join(corpusRoot, revision.sourceFile),
    stagingPath: join(corpusRoot, "staging", `${revisionId}.json`) };
}

export async function importExport(recordPath: string, corpusRoot: string, apply: boolean) {
  const prepared = await prepareExport(recordPath, corpusRoot);
  const staging = json(prepared.staged);
  const [oldSource, oldStaging] = await Promise.all([existing(prepared.sourcePath), existing(prepared.stagingPath)]);
  if (oldSource !== undefined && oldSource !== prepared.html) throw new Error(`Existing source differs: ${prepared.sourcePath}`);
  if (oldStaging !== undefined && oldStaging !== staging) throw new Error(`Existing staging differs: ${prepared.stagingPath}`);
  if (apply) {
    await writeImmutable(prepared.sourcePath, prepared.html);
    await writeImmutable(prepared.stagingPath, staging);
  }
  return { mode: apply ? "apply" : "preview", sourceId: prepared.staged.sourceRevision.sourceId,
    revisionId: prepared.staged.sourceRevision.revisionId, status: prepared.staged.status,
    metrics: prepared.staged.metrics, issueCounts: Object.entries(Object.groupBy(prepared.staged.issues, (issue) => issue.code))
      .map(([code, issues]) => ({ code, count: issues!.length })).sort((a, b) => a.code.localeCompare(b.code)),
    files: [{ path: prepared.sourcePath, changed: oldSource !== prepared.html },
      { path: prepared.stagingPath, changed: oldStaging !== staging }] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { record: { type: "string" }, output: { type: "string", default: "data/rpgbot" },
    apply: { type: "boolean", default: false } } });
  if (!values.record) throw new Error("--record <local-export.json> is required");
  console.log(JSON.stringify(await importExport(resolve(values.record), resolve(values.output!), values.apply!), null, 2));
}
