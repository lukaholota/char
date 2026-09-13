/**
 * KR6.3 / KR7.1 — 2024 Species/Races seed with traits & features
 */

import { PrismaClient, Prisma, Source, Size, FeatureDisplayType, RestType } from "@prisma/client";
import { LINEAGE_OPTION_FEATURE_ENG_NAMES } from "./speciesChoices2024";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type TraitUses2024 = {
  limitedUsesPer?: keyof typeof RestType;
  usesCount?: number;
  usesCountSpecial?: unknown;
  usesCountDependsOnProficiencyBonus?: true;
};

type Trait2024 = {
  engName: string;
  name: string;
  descriptionEng: string;
  description?: string;
  displayType?: string[];
  uses?: TraitUses2024;
};

type Species2024 = {
  ruleset: string;
  engName: string;
  name: string;
  shortDescription: string;
  description: string;
  creatureType: string;
  size: string[];
  speed: number;
  ASI: Record<string, unknown>;
  traits: Trait2024[];
  source: string;
};

function speciesNameToEnum(engName: string): string {
  return `${engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
}

function readDisplayTypes(trait: Trait2024): FeatureDisplayType[] {
  const names = trait.displayType ?? [FeatureDisplayType.PASSIVE];

  return names.map((name) => {
    if (!(name in FeatureDisplayType)) throw new Error(`Невідомий тип дії 2024: ${name}`);
    return FeatureDisplayType[name as keyof typeof FeatureDisplayType];
  });
}

/**
 * Порожні поля пишуться явними `null`, а не пропускаються: сід оновлює наявний рядок, і риса,
 * яка втратила лічильник у джерелі, мусить втратити його й у базі.
 *
 * `usesCountSpecial` лишається `null` без числа зумисне — `hasScaledMaximum` у `findPoolProvider`
 * читає саме цю колонку через `isFilledObject`, тож будь-який непорожній обʼєкт тут перемикає
 * суддю пулу (BUG-011). Риси видів масштабованих максимумів не мають узагалі: книга дає їм або
 * одне використання, або бонус майстерності — а він живе окремою булевою колонкою.
 */
function readUses(trait: Trait2024) {
  const uses = trait.uses;
  return {
    limitedUsesPer: uses?.limitedUsesPer ? RestType[uses.limitedUsesPer] : null,
    usesCount: uses?.usesCount ?? null,
    usesCountSpecial: (uses?.usesCountSpecial as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
    usesCountDependsOnProficiencyBonus: uses?.usesCountDependsOnProficiencyBonus ?? false,
  };
}

export const seedRaces2024 = async (prisma: PrismaClient) => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/species.json"),
    "utf-8"
  );
  const species: Species2024[] = JSON.parse(raw);

  console.log(`🐾 Seeding ${species.length} 2024 species and their traits…`);
  let upsertedRaces = 0;
  let upsertedFeatures = 0;
  let errors = 0;

  for (const sp of species) {
    const nameEnum = speciesNameToEnum(sp.engName);

    const payload = {
      name: nameEnum as any,
      ruleset: "RULES_2024" as const,
      source: Source.PHB_2024,
      size: sp.size as Size[],
      speed: sp.speed,
      ASI: {},
      languagesToChooseCount: 0,
      description: sp.description,
    };

    try {
      const raceRecord = await (prisma.race as any).upsert({
        where: { name_ruleset: { name: nameEnum, ruleset: "RULES_2024" } },
        update: payload,
        create: payload,
      });
      upsertedRaces++;

      // Seed species traits as Features & connect via RaceTrait
      for (const trait of sp.traits) {
        const featureEngName = `${sp.engName}: ${trait.engName} (2024)`;
        const traitDescription = trait.description || trait.descriptionEng;

        const featurePayload = {
          name: trait.name,
          description: traitDescription,
          shortDescription: trait.name,
          ruleset: "RULES_2024" as const,
          displayType: readDisplayTypes(trait),
          ...readUses(trait),
        };

        const feature = await prisma.feature.upsert({
          where: { engName: featureEngName },
          update: featurePayload,
          create: { ...featurePayload, engName: featureEngName },
        });
        upsertedFeatures++;

        // Родовід — це вибір, а не безумовна риса: фіча потрібна, звʼязок із видом — ні.
        if (LINEAGE_OPTION_FEATURE_ENG_NAMES.includes(featureEngName)) continue;

        const existingTrait = await prisma.raceTrait.findFirst({
          where: {
            raceId: raceRecord.raceId,
            featureId: feature.featureId,
          },
        });

        if (!existingTrait) {
          await prisma.raceTrait.create({
            data: {
              raceId: raceRecord.raceId,
              featureId: feature.featureId,
              ruleset: "RULES_2024",
            },
          });
        }
      }
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(
        `  ❌ ${sp.engName} (${nameEnum}): ${e?.code ?? "?"} — ${e?.message ?? err}`
      );
    }
  }

  console.log(
    `✅ 2024 Species/Races: ${upsertedRaces} races upserted, ${upsertedFeatures} features upserted, ${errors} errors`
  );
};
