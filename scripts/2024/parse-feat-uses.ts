/**
 * KR31.3 — переливає числа використань і тип дії рис персонажа у
 * `data/2024/normalized/feats.json`.
 *
 * Механіка лягає на **перевагу**, а не на рису: носієм у базі стає окрема фіча
 * `<Риса>: <Перевага> (2024)`, і її український текст сід бере з тієї ж переваги у `benefits[]`.
 *
 * Правити числа руками у файлі не можна: джерело — сторінки `data/2024/source/raw/feat/`, і гейт
 * `tests/content/feat-uses-2024.test.ts` червоніє, щойно файл розійдеться з ними
 * ([Р33](../../docs/DECISIONS.md#р33)).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFeatSources } from "./parse-feats";
import { extractFeatMechanics2024, type FeatMechanics2024 } from "./feat-uses";
import type { DisplayTypeName, FeatureUses2024 } from "./feature-uses-from-text";

export const FEATS_JSON = "data/2024/normalized/feats.json";

type FeatBenefitJson2024 = {
  name: string;
  displayType?: DisplayTypeName[];
  uses?: FeatureUses2024;
  [key: string]: unknown;
};

type FeatJson2024 = {
  engName: string;
  benefitsEng?: FeatBenefitJson2024[];
  [key: string]: unknown;
};

function buildBenefitKey(featEngName: string, benefitName: string): string {
  return `${featEngName}|${benefitName.replace(/[’ʼ‘]/g, "'")}`;
}

export function applyMechanicsToFeats(feats: FeatJson2024[], mechanics: FeatMechanics2024[]): FeatJson2024[] {
  const byKey = new Map(mechanics.map((row) => [buildBenefitKey(row.featEngName, row.benefitName), row]));
  const usedKeys = new Set<string>();

  const withMechanics = feats.map((feat) => ({
    ...feat,
    benefitsEng: (feat.benefitsEng ?? []).map((benefit) => {
      const { uses: _dropped, displayType: _also, ...withoutMechanics } = benefit;

      const key = buildBenefitKey(feat.engName, benefit.name);
      const row = byKey.get(key);
      if (!row) return withoutMechanics;

      usedKeys.add(key);
      return { ...withoutMechanics, displayType: row.displayType, uses: row.uses };
    }),
  }));

  for (const key of byKey.keys()) {
    if (!usedKeys.has(key)) throw new Error(`«${key}»: переваги з таким іменем немає у feats.json.`);
  }

  return withMechanics;
}

function main() {
  const featsPath = join(process.cwd(), FEATS_JSON);
  const feats: FeatJson2024[] = JSON.parse(readFileSync(featsPath, "utf-8"));
  const mechanics = extractFeatMechanics2024(readFeatSources());

  const withMechanics = applyMechanicsToFeats(feats, mechanics);
  writeFileSync(featsPath, `${JSON.stringify(withMechanics, null, 2)}\n`, "utf-8");

  console.log(`✅ ${mechanics.length} носіїв ресурсу серед ${feats.length} рис → ${FEATS_JSON}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
