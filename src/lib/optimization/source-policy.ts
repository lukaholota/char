import { readFile } from "node:fs/promises";
import { z } from "zod";
import { idSchema } from "./schema";

const manifestSchema = z.object({ entries: z.array(z.object({
  sourceId: idSchema, disposition: z.enum(["included", "excluded", "review"]),
  rulesets: z.array(z.enum(["2014", "2024"])),
})) });

export async function readSourceManifest(path: string) {
  return manifestSchema.parse(JSON.parse(await readFile(path, "utf8"))).entries;
}

export async function readExcludedSourceIds(path: string) {
  return new Set((await readSourceManifest(path)).filter((entry) => entry.disposition === "excluded").map((entry) => entry.sourceId));
}
