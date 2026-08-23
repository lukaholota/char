/**
 * KR6.3 Крок 3 — 2024 Subclasses seed
 */

import { PrismaClient, FeatureDisplayType } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type SubclassFeature2024 = {
  level: number;
  name: string;
  description?: string;
};

type SubclassFeatureEng2024 = {
  level: number;
  name: string;
};

type SubclassJson2024 = {
  ruleset: string;
  className: string;
  engName: string;
  name: string;
  taglineEng?: string;
  flavorTextEng?: string;
  tagline?: string;
  flavorText?: string;
  features?: SubclassFeature2024[];
  featuresEng?: SubclassFeatureEng2024[];
  source: string;
};

function toSubclassEnum(engName: string): string {
  return engName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const seedSubclasses2024 = async (prisma: PrismaClient) => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/subclasses.json"),
    "utf-8"
  );
  const subclasses: SubclassJson2024[] = JSON.parse(raw);

  console.log(`✨ Seeding ${subclasses.length} 2024 subclasses…`);
  let upserted = 0;
  let upsertedFeatures = 0;
  let errors = 0;

  for (const sc of subclasses) {
    const classEnum = `${sc.className.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
    const classRecord = await (prisma.class as any).findFirst({
      where: { name: classEnum, ruleset: "RULES_2024" },
      select: { classId: true },
    });

    if (!classRecord) {
      console.error(`  ❌ Parent class not found for ${sc.engName}: ${classEnum}`);
      errors++;
      continue;
    }

    const scEnum = toSubclassEnum(sc.engName);
    const description = sc.flavorText || sc.flavorTextEng || sc.name;

    const payload = {
      classId: classRecord.classId,
      name: scEnum as any,
      ruleset: "RULES_2024" as const,
      description,
      grantsSpells: false,
      languagesToChooseCount: 0,
      toolProficiencies: [],
      armorProficiencies: [],
    };

    try {
      const subclassRecord = await (prisma.subclass as any).upsert({
        where: {
          classId_name: {
            classId: classRecord.classId,
            name: scEnum as any,
          },
        },
        update: payload,
        create: payload,
      });
      upserted++;

      upsertedFeatures += await seedSubclassFeatures(prisma, sc, subclassRecord.subclassId);
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(
        `  ❌ ${sc.engName} (${scEnum}): ${e?.code ?? "?"} — ${e?.message ?? err}`
      );
    }
  }

  console.log(
    `✅ 2024 Subclasses: ${upserted} upserted, ${upsertedFeatures} features upserted, ${errors} errors`
  );
};

async function seedSubclassFeatures(
  prisma: PrismaClient,
  sc: SubclassJson2024,
  subclassId: number
) {
  let upserted = 0;

  for (const [index, feature] of (sc.features ?? []).entries()) {
    const engName = sc.featuresEng?.[index]?.name ?? feature.name;
    const featureEngName = `${sc.engName}: ${engName} (2024)`;
    const description = feature.description ?? feature.name;

    const featureRecord = await prisma.feature.upsert({
      where: { engName: featureEngName },
      update: {
        name: feature.name,
        description,
        shortDescription: feature.name,
        ruleset: "RULES_2024",
        displayType: [FeatureDisplayType.PASSIVE],
      },
      create: {
        name: feature.name,
        engName: featureEngName,
        description,
        shortDescription: feature.name,
        ruleset: "RULES_2024",
        displayType: [FeatureDisplayType.PASSIVE],
      },
    });
    upserted++;

    await prisma.subclassFeature.upsert({
      where: {
        subclassId_featureId: { subclassId, featureId: featureRecord.featureId },
      },
      update: { levelGranted: feature.level, ruleset: "RULES_2024" },
      create: {
        subclassId,
        featureId: featureRecord.featureId,
        levelGranted: feature.level,
        ruleset: "RULES_2024",
      },
    });
  }

  return upserted;
}
