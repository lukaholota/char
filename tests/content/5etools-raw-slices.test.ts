import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

/// Сирий корпус у .gitignore, тож тести читають ці зрізи, а дзеркало лише звіряє їх, коли воно є.
const SLICE_DIR = "tests/fixtures/5etools/raw-slices";
const MIRROR_DIR = "data/5etools/raw";

const sliceFiles = readdirSync(SLICE_DIR, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".json"));

it.skipIf(!existsSync(MIRROR_DIR)).each(sliceFiles)("зріз %s дорівнює записам дзеркала", (file) => {
  const slice: Record<string, unknown[]> = JSON.parse(readFileSync(join(SLICE_DIR, file), "utf8"));
  const mirror: Record<string, unknown[]> = JSON.parse(readFileSync(join(MIRROR_DIR, file), "utf8"));
  for (const [group, entries] of Object.entries(slice)) {
    expect(entries.length, `${file}: ${group}`).toBeGreaterThan(0);
    for (const entry of entries) expect(mirror[group], `${file}: ${group}`).toContainEqual(entry);
  }
});
