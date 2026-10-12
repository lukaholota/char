import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { idSchema } from "../../src/lib/optimization/schema";
import { prepareExport } from "./import-export";

const indexSchema = z.record(idSchema, z.string().regex(/^[a-zA-Z0-9_-]+\.json$/));
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

async function readIndex(directory: string) {
  try { return indexSchema.parse(JSON.parse(await readFile(join(directory, "staging-corrections", "index.json"), "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}; throw error; }
}

export async function reextractCorrections(directory: string, apply: boolean) {
  const staging = join(directory, "staging");
  const corrections = join(directory, "staging-corrections");
  const index = await readIndex(directory);
  const names = (await readdir(staging)).filter((name) => name.endsWith(".json")).sort();
  const results: { sourceId: string; revisionId: string; oldWords: number; newWords: number;
    fixed: boolean; pending: boolean; correctionFile: string | null }[] = [];
  for (const name of names) {
    const previous = JSON.parse(await readFile(join(staging, name), "utf8"));
    if (!previous.issues.some((issue: { code: string }) => issue.code === "text-coverage-review")) continue;
    const revisionId = previous.sourceRevision.revisionId as string;
    const prepared = await prepareExport(join(directory, "source", `${revisionId}.record.json`), directory);
    const updated = prepared.staged;
    if (updated.rawHtmlHash !== previous.rawHtmlHash ||
      updated.sourceRevision.revisionId !== previous.sourceRevision.revisionId ||
      updated.sourceRevision.sourceFile !== previous.sourceRevision.sourceFile)
      throw new Error(`Source changed while re-extracting: ${revisionId}`);
    const fixed = !updated.issues.some((issue) => issue.code === "text-coverage-review");
    let correctionFile: string | null = null;
    let pending = false;
    if (fixed) {
      const correction = { ...updated, correctionOf: `staging/${name}` };
      const content = json(correction);
      correctionFile = `${revisionId}-extract-${sha256(content).slice(0, 16)}.json`;
      pending = index[revisionId] !== correctionFile;
      if (apply) {
        const reviewPath = join(directory, "reviews", `${revisionId}.json`);
        try { await readFile(reviewPath); throw new Error(`Review already exists: ${revisionId}`); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        await mkdir(corrections, { recursive: true });
        const path = join(corrections, correctionFile);
        try { await writeFile(path, content, { flag: "wx" }); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(path, "utf8") !== content) throw error;
        }
        index[revisionId] = correctionFile;
      }
    }
    results.push({ sourceId: updated.sourceRevision.sourceId, revisionId,
      oldWords: previous.metrics.words, newWords: updated.metrics.words, fixed, pending, correctionFile });
  }
  if (apply) {
    await mkdir(corrections, { recursive: true });
    await writeFile(join(corrections, "index.json"), json(Object.fromEntries(Object.entries(index).sort())));
  }
  return { mode: apply ? "apply" : "preview", examined: results.length, fixed: results.filter((row) => row.fixed).length,
    unresolved: results.filter((row) => !row.fixed).length, pending: results.filter((row) => row.pending).length, rows: results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { input: { type: "string", default: "data/rpgbot" },
    apply: { type: "boolean", default: false } } });
  console.log(JSON.stringify(await reextractCorrections(resolve(values.input!), values.apply!), null, 2));
}
