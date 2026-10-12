import { readFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { idSchema } from "../../src/lib/optimization/schema";
import { importExport } from "./import-export";

const crawlSchema = z.object({ checks: z.record(idSchema, z.object({
  status: z.string(), revisionId: idSchema.optional(),
})) });

async function isFile(path: string) {
  try { await access(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

export async function stageSources(directory: string, apply: boolean, limit?: number) {
  const crawl = crawlSchema.parse(JSON.parse(await readFile(join(directory, "source-crawl.json"), "utf8")));
  const ready = Object.entries(crawl.checks).filter(([, check]) => check.status === "record-ready" && check.revisionId)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const pending: { sourceId: string; revisionId: string }[] = [];
  for (const [sourceId, check] of ready) {
    const stagePath = join(directory, "staging", `${check.revisionId}.json`);
    if (!await isFile(stagePath)) pending.push({ sourceId, revisionId: check.revisionId! });
  }
  const batch = limit === undefined ? pending : pending.slice(0, limit);
  const failures: { sourceId: string; error: string }[] = [];
  const issueCounts: Record<string, number> = {};
  let prepared = 0;
  for (const [index, item] of batch.entries()) {
    const recordPath = join(directory, "source", `${item.revisionId}.record.json`);
    try {
      const result = await importExport(recordPath, directory, apply);
      prepared += 1;
      for (const issue of result.issueCounts) issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + issue.count;
    } catch (error) {
      failures.push({ sourceId: item.sourceId, error: error instanceof Error ? error.message.slice(0, 250) : String(error).slice(0, 250) });
    }
    if (apply && (index + 1) % 10 === 0) console.log(JSON.stringify({ processed: index + 1, of: batch.length, written: prepared, failures: failures.length }));
  }
  return { mode: apply ? "apply" : "preview", ready: ready.length, alreadyStaged: ready.length - pending.length,
    pending: pending.length, processed: batch.length, validated: prepared,
    written: apply ? prepared : 0, failures, issueCounts };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { input: { type: "string", default: "data/rpgbot" },
    apply: { type: "boolean", default: false }, limit: { type: "string" } } });
  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new Error("--limit must be a positive integer");
  console.log(JSON.stringify(await stageSources(resolve(values.input!), values.apply!, limit), null, 2));
}
