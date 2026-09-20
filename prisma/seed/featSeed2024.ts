/**
 * KR6.3 Крок 3 — 2024 Feats seed
 */

import { PrismaClient, Source } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildShortDescription } from "../../src/lib/logic/short-description";
import { REMOVED_FEAT_NAME_2024 } from "./removeAbilityScoreImprovementFeat2024";

type Feat2024 = {
  ruleset: string;
  engName: string;
  name: string;
  category: string;
  isRepeatable: boolean;
  benefits?: Array<{ name: string; description: string }>;
  description?: string;
  source: string;
};

function toEnumName(engName: string): string {
  return engName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildFeat2024Description(feat: Feat2024): string {
  if (feat.description) return feat.description;
  if (feat.benefits && feat.benefits.length > 0) {
    return feat.benefits.map((b) => `**${b.name}**\n${b.description}`).join("\n\n");
  }
  return feat.engName;
}

export function readFeat2024SeedInputs(root = process.cwd()): Feat2024[] {
  const feats: Feat2024[] = JSON.parse(readFileSync(join(root, "data/2024/normalized/feats.json"), "utf-8"));
  return feats.filter((feat) => toEnumName(feat.engName) !== REMOVED_FEAT_NAME_2024);
}

export const seedFeats2024 = async (prisma: PrismaClient) => {
  const feats = readFeat2024SeedInputs();

  console.log(`🗡️ Seeding ${feats.length} 2024 feats…`);
  let upserted = 0;
  let errors = 0;

  for (const feat of feats) {
    const nameEnum = toEnumName(feat.engName);
    const description = buildFeat2024Description(feat);

    const payload = {
      name: nameEnum as any,
      engName: feat.engName,
      ruleset: "RULES_2024" as const,
      source: Source.PHB_2024,
      category: feat.category as any,
      isRepeatable: feat.isRepeatable,
      description,
      shortDescription: buildShortDescription(description),
    };

    try {
      await (prisma.feat as any).upsert({
        where: { name_ruleset: { name: nameEnum, ruleset: "RULES_2024" } },
        update: payload,
        create: payload,
      });
      upserted++;
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(`  ❌ ${feat.engName} (${nameEnum}): ${e?.code ?? "?"} — ${e?.message ?? err}`);
    }
  }

  console.log(`✅ 2024 Feats: ${upserted} upserted, ${errors} errors`);
};
