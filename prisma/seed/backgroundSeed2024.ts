/**
 * KR6.3 Крок 3 — 2024 Backgrounds seed (NEW backgrounds only, e.g. Acolyte)
 *
 * The 15 existing *_2024 backgrounds are handled by update15ExistingBackgrounds2024.ts.
 */

import { BackgroundCategory, PrismaClient, Source } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type BgSkill = { enum: string; nameUa: string };
type BgToolProficiency = {
  engText: string;
  toolCategory: string | null;
  isChoice: boolean;
  nameUa: string;
  note: string | null;
};
type BgOriginFeat = { engName: string; nameUa: string };
type BgStartingItem = { name: string; quantity: number };
type Background2024 = {
  ruleset: string;
  engName: string;
  name: string;
  shortDescription: string;
  description: string;
  abilityOptions: string[];
  skillProficiencies: BgSkill[];
  toolProficiency: BgToolProficiency;
  originFeat: BgOriginFeat;
  equipmentEngText: string;
  equipmentPackage: BgStartingItem[];
  grantsGoldInstead: number;
  source: string;
};

const EXISTING_15_NAMES = new Set([
  "Artisan", "Charlatan", "Criminal", "Entertainer", "Farmer",
  "Guard", "Guide", "Hermit", "Merchant", "Noble",
  "Sage", "Sailor", "Scribe", "Soldier", "Wayfarer",
]);

async function resolveOriginFeatId(prisma: PrismaClient, featEngName: string): Promise<number | null> {
  // Normalize "Magic Initiate (Cleric)" -> "Magic Initiate"
  const normalized = featEngName.replace(/\s*\([^)]*\)/, "").trim();
  const feat = await (prisma.feat as any).findFirst({
    where: {
      OR: [
        { engName: featEngName, ruleset: "RULES_2024" },
        { engName: normalized, ruleset: "RULES_2024" },
      ],
    },
    select: { featId: true },
  });
  return feat?.featId ?? null;
}

export const seedBackgrounds2024 = async (prisma: PrismaClient) => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/backgrounds.json"),
    "utf-8"
  );
  const backgrounds: Background2024[] = JSON.parse(raw);

  // Filter ONLY truly new backgrounds (not in the 15 existing)
  const newBackgrounds = backgrounds.filter((b) => !EXISTING_15_NAMES.has(b.engName));

  console.log(`📜 Seeding ${newBackgrounds.length} NEW 2024 backgrounds…`);
  let upserted = 0;
  let errors = 0;

  for (const bg of newBackgrounds) {
    const nameEnum = bg.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_") as BackgroundCategory;
    const originFeatId = bg.originFeat?.engName
      ? await resolveOriginFeatId(prisma, bg.originFeat.engName)
      : null;

    const toolProficiencies = bg.toolProficiency?.toolCategory ? [bg.toolProficiency.toolCategory] : [];

    const payload = {
      name: nameEnum,
      ruleset: "RULES_2024" as const,
      source: Source.PHB_2024,
      description: bg.description,
      skillProficiencies: bg.skillProficiencies.map((s) => s.enum),
      toolProficiencies: toolProficiencies as any,
      abilityOptions: bg.abilityOptions as any,
      originFeatId,
      grantsGoldInstead: bg.grantsGoldInstead,
      languagesToChooseCount: 0,
      items: bg.equipmentPackage,
      specialAbilityName: null,
    };

    try {
      await (prisma.background as any).upsert({
        where: { name_ruleset: { name: nameEnum, ruleset: "RULES_2024" } },
        update: payload,
        create: payload,
      });
      upserted++;
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(
        `  ❌ ${bg.engName} (${nameEnum}): ${e?.code ?? "?"} — ${e?.message ?? err}`
      );
    }
  }

  console.log(`✅ NEW 2024 Backgrounds: ${upserted} upserted, ${errors} errors`);
};
