/**
 * KR31.3 — переливає числа використань і тип дії рис видів у
 * `data/2024/normalized/species.json`.
 *
 * Правити числа руками у файлі не можна: джерело — сторінки `data/2024/source/raw/species/`, і
 * гейт `tests/content/species-trait-uses-2024.test.ts` червоніє, щойно файл розійдеться з ними
 * ([Р33](../../docs/DECISIONS.md#р33) — механіка живе в джерелі, не в проході по базі).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSpeciesSources } from "./parse-species";
import {
  extractSpeciesTraitMechanics2024,
  SOURCE_BLOCKS_THAT_ARE_NOT_TRAITS,
  type SpeciesTraitMechanics2024,
} from "./species-trait-uses";
import type { DisplayTypeName, FeatureUses2024 } from "./feature-uses-from-text";

export const SPECIES_JSON = "data/2024/normalized/species.json";

type SpeciesTraitJson2024 = {
  engName: string;
  displayType?: DisplayTypeName[];
  uses?: FeatureUses2024;
  [key: string]: unknown;
};

type SpeciesJson2024 = {
  engName: string;
  traits?: SpeciesTraitJson2024[];
  [key: string]: unknown;
};

/// Назва риси як ключ звірки; апостроф корпусів різний, а перейменувати рису у файлі не можна —
/// її назва вже стоїть у `feature.eng_name` бази.
function buildTraitKey(speciesEngName: string, traitName: string): string {
  return `${speciesEngName}|${traitName.replace(/[’ʼ‘]/g, "'")}`;
}

export function applyMechanicsToSpecies(
  species: SpeciesJson2024[],
  mechanics: SpeciesTraitMechanics2024[],
): SpeciesJson2024[] {
  const byKey = new Map(mechanics.map((row) => [buildTraitKey(row.speciesEngName, row.traitName), row]));
  const usedKeys = new Set<string>();

  const withMechanics = species.map((one) => ({
    ...one,
    traits: (one.traits ?? []).map((trait) => {
      const { uses: _dropped, displayType: _also, ...withoutMechanics } = trait;

      const key = buildTraitKey(one.engName, trait.engName);
      const row = byKey.get(key);
      if (!row) throw new Error(`${one.engName} «${trait.engName}»: риси немає в сирих сторінках.`);
      usedKeys.add(key);

      return { ...withoutMechanics, displayType: row.displayType, ...(row.uses ? { uses: row.uses } : {}) };
    }),
  }));

  for (const key of byKey.keys()) {
    if (usedKeys.has(key) || key in SOURCE_BLOCKS_THAT_ARE_NOT_TRAITS) continue;
    throw new Error(
      `«${key}»: блок джерела не є рисою у species.json — впиши його в SOURCE_BLOCKS_THAT_ARE_NOT_TRAITS з причиною.`,
    );
  }

  return withMechanics;
}

function main() {
  const speciesPath = join(process.cwd(), SPECIES_JSON);
  const species: SpeciesJson2024[] = JSON.parse(readFileSync(speciesPath, "utf-8"));
  const mechanics = extractSpeciesTraitMechanics2024(readSpeciesSources());

  const withMechanics = applyMechanicsToSpecies(species, mechanics);
  writeFileSync(speciesPath, `${JSON.stringify(withMechanics, null, 2)}\n`, "utf-8");

  const counted = withMechanics.flatMap((one) => (one.traits ?? []).filter((trait) => trait.uses));
  console.log(`✅ ${mechanics.length} блоків джерела, ${counted.length} рис із лічильником → ${SPECIES_JSON}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
