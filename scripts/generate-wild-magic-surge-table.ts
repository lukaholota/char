import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readSubclassFeatureSeedInputs } from "../prisma/seed/subclassFeatureSeed";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/wild-magic-surge-table.json");
const WILD_MAGIC_SURGE_ENG_NAME = "Wild Magic Surge";
const TABLE_ROW = /^(\d\d-\d\d): (.+)$/gm;

export type WildMagicSurgeTableRow = {
  roll: string;
  description: string;
};

export function readWildMagicSurgeTable(): WildMagicSurgeTableRow[] {
  const feature = readSubclassFeatureSeedInputs().find((input) => input.engName === WILD_MAGIC_SURGE_ENG_NAME);
  if (!feature?.description) throw new Error("У сіді підкласів немає таблиці Wild Magic Surge");

  const rows = Array.from(feature.description.matchAll(TABLE_ROW), ([, roll, description]) => ({ roll, description }));
  if (rows.length !== 50) throw new Error(`Таблиця Wild Magic Surge має ${rows.length} рядків замість 50`);
  return rows;
}

function main() {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(readWildMagicSurgeTable(), null, 2)}\n`, "utf-8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
