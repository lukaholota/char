/**
 * KR6.3 Крок 3 — UPDATE 15 існуючих *_2024 походжень (НЕ DELETE, НЕ INSERT)
 */

import { PrismaClient, Source } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type ExistingBg2024 = {
  ruleset: string;
  engName: string;
  name: string;
  shortDescription: string;
  description: string;
  abilityOptions: string[];
  skillProficiencies: Array<{ enum: string; nameUa: string }>;
  toolProficiency: {
    engText: string;
    toolCategory: string | null;
    isChoice: boolean;
    nameUa: string;
    note: string | null;
  };
  originFeat: { engName: string; nameUa: string };
  equipmentPackage: Array<{ name: string; quantity: number }>;
  grantsGoldInstead: number;
  source: string;
  existingBackgroundId: number;
  existingBackgroundCategoryEnum: string;
};

async function resolveOriginFeatId(prisma: PrismaClient, featEngName: string): Promise<number | null> {
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

export const update15ExistingBackgrounds2024 = async (prisma: PrismaClient) => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/existing-2024-backgrounds-update-data.json"),
    "utf-8"
  );
  const records: ExistingBg2024[] = JSON.parse(raw);

  console.log(`🔄 Updating ${records.length} existing *_2024 backgrounds in-place…`);

  let updated = 0;
  let errors = 0;

  for (const bg of records) {
    const existing = await (prisma.background as any).findUnique({
      where: { backgroundId: bg.existingBackgroundId },
      select: { backgroundId: true, name: true, ruleset: true },
    });

    if (!existing) {
      console.error(`  ❌ Background ID ${bg.existingBackgroundId} (${bg.existingBackgroundCategoryEnum}) NOT FOUND`);
      errors++;
      continue;
    }

    const originFeatId = bg.originFeat?.engName
      ? await resolveOriginFeatId(prisma, bg.originFeat.engName)
      : null;

    const toolProficiencies = bg.toolProficiency?.toolCategory ? [bg.toolProficiency.toolCategory] : [];

    try {
      await (prisma.background as any).update({
        where: { backgroundId: bg.existingBackgroundId },
        data: {
          ruleset: "RULES_2024",
          source: Source.PHB_2024,
          description: bg.description,
          specialAbilityName: null,
          skillProficiencies: bg.skillProficiencies.map((s) => s.enum),
          toolProficiencies: toolProficiencies as any,
          abilityOptions: bg.abilityOptions as any,
          originFeatId,
          grantsGoldInstead: bg.grantsGoldInstead,
          items: bg.equipmentPackage,
        },
      });
      updated++;
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(
        `  ❌ bg#${bg.existingBackgroundId} ${bg.existingBackgroundCategoryEnum}: ${e?.code ?? "?"} — ${e?.message ?? err}`
      );
    }
  }

  console.log(`✅ 15 existing *_2024 backgrounds: ${updated} updated, ${errors} errors`);
};
