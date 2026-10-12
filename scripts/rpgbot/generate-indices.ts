import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { loadCorpus } from "./load-corpus";
import { generateIndices } from "../../src/lib/optimization/indices";

const { values } = parseArgs({ options: {
  input: { type: "string", default: "data/rpgbot" },
  output: { type: "string", default: "src/lib/generated" }, apply: { type: "boolean", default: false },
} });
const { corpus, catalog } = await loadCorpus(resolve(values.input!));
const indices = generateIndices(corpus, catalog);
const changes: { path: string; records: number; changed: boolean; previousBytes: number | null; nextBytes: number }[] = [];
for (const [kind, entries] of Object.entries(indices)) {
  const path = join(resolve(values.output!), `optimization-${kind}.json`);
  const next = `${JSON.stringify(entries, null, 2)}\n`;
  let previous: string | undefined;
  try { previous = await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  changes.push({ path, records: entries.length, changed: previous !== next,
    previousBytes: previous === undefined ? null : Buffer.byteLength(previous), nextBytes: Buffer.byteLength(next) });
  if (values.apply && previous !== next) {
    await mkdir(resolve(values.output!), { recursive: true });
    await writeFile(path, next);
  }
}
console.log(JSON.stringify({ mode: values.apply ? "apply" : "preview", changes }, null, 2));
