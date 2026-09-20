import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readSubclassFeatureSeedInputs } from "../prisma/seed/subclassFeatureSeed";

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/wild-magic-surge-table.json");
const WILD_MAGIC_SURGE_ENG_NAME = "Wild Magic Surge";
const TABLE_HEADING = "Таблиця сплесків дикої магії:";
const TABLE_ROW = /^(\d\d-\d\d): (.+)$/gm;

export type WildMagicSurgeTableRow = {
  roll: string;
  description: string;
};

/// Вступ — те, що в сіді стоїть перед заголовком таблиці: коли Майстер вимагає кидок к20 і що
/// буває з ефектом-закляттям. Довідник правил показує його над таблицею, а екран помилки — ні.
export type WildMagicSurge = {
  intro: string;
  rows: WildMagicSurgeTableRow[];
};

export function readWildMagicSurge(): WildMagicSurge {
  const feature = readSubclassFeatureSeedInputs().find((input) => input.engName === WILD_MAGIC_SURGE_ENG_NAME);
  if (!feature?.description) throw new Error("У сіді підкласів немає таблиці Wild Magic Surge");

  const intro = feature.description.split(TABLE_HEADING)[0].trim();
  if (!intro) throw new Error(`У рисі ${WILD_MAGIC_SURGE_ENG_NAME} немає тексту перед «${TABLE_HEADING}»`);

  const rows = Array.from(feature.description.matchAll(TABLE_ROW), ([, roll, description]) => ({ roll, description }));
  if (rows.length !== 50) throw new Error(`Таблиця Wild Magic Surge має ${rows.length} рядків замість 50`);

  return { intro, rows };
}

function main() {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(readWildMagicSurge(), null, 2)}\n`, "utf-8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
