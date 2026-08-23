/**
 * KR6.3 Крок 3 — 2024 Classes seed
 */

import {
  Ability,
  ArmorType,
  FeatureDisplayType,
  PrismaClient,
  SpellcastingType,
  WeaponType,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type ClassFeature2024 = {
  level: number;
  name: string;
  description: string;
};

type ClassFeatureEng2024 = {
  level: number;
  name: string;
  displayOrder: number;
};

type ClassJson2024 = {
  ruleset: string;
  engName: string;
  name: string;
  flavorTextEng: string;
  subclassLevel: number;
  abilityScoreImprovementLevels: number[];
  epicBoonLevel: number;
  isPhbCore: boolean;
  note: string | null;
  source: string;
  features?: ClassFeature2024[];
  featuresEng?: ClassFeatureEng2024[];
};

const CLASS_CONFIGS: Record<
  string,
  {
    hitDie: number;
    spellcastingType: SpellcastingType;
    primaryCastingStat?: Ability;
    multiclassReqs: Record<string, unknown>;
    savingThrows: Ability[];
    armorProficiencies: ArmorType[];
    weaponProficiencies: Record<string, unknown>;
    sortOrder: number;
  }
> = {
  Barbarian: {
    hitDie: 12,
    spellcastingType: SpellcastingType.NONE,
    multiclassReqs: { choice: ["STR"], score: 13 },
    savingThrows: [Ability.STR, Ability.CON],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON] },
    sortOrder: 1,
  },
  Bard: {
    hitDie: 8,
    spellcastingType: SpellcastingType.FULL,
    primaryCastingStat: Ability.CHA,
    multiclassReqs: { choice: ["CHA"], score: 13 },
    savingThrows: [Ability.DEX, Ability.CHA],
    armorProficiencies: [ArmorType.LIGHT],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 2,
  },
  Cleric: {
    hitDie: 8,
    spellcastingType: SpellcastingType.FULL,
    primaryCastingStat: Ability.WIS,
    multiclassReqs: { choice: ["WIS"], score: 13 },
    savingThrows: [Ability.WIS, Ability.CHA],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 3,
  },
  Druid: {
    hitDie: 8,
    spellcastingType: SpellcastingType.FULL,
    primaryCastingStat: Ability.WIS,
    multiclassReqs: { choice: ["WIS"], score: 13 },
    savingThrows: [Ability.INT, Ability.WIS],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 4,
  },
  Fighter: {
    hitDie: 10,
    spellcastingType: SpellcastingType.NONE,
    multiclassReqs: { choice: ["STR", "DEX"], score: 13 },
    savingThrows: [Ability.STR, Ability.CON],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.HEAVY, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON] },
    sortOrder: 5,
  },
  Monk: {
    hitDie: 8,
    spellcastingType: SpellcastingType.NONE,
    multiclassReqs: { and: ["DEX", "WIS"], score: 13 },
    savingThrows: [Ability.STR, Ability.DEX],
    armorProficiencies: [],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 6,
  },
  Paladin: {
    hitDie: 10,
    spellcastingType: SpellcastingType.HALF,
    primaryCastingStat: Ability.CHA,
    multiclassReqs: { and: ["STR", "CHA"], score: 13 },
    savingThrows: [Ability.WIS, Ability.CHA],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.HEAVY, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON] },
    sortOrder: 7,
  },
  Ranger: {
    hitDie: 10,
    spellcastingType: SpellcastingType.HALF,
    primaryCastingStat: Ability.WIS,
    multiclassReqs: { and: ["DEX", "WIS"], score: 13 },
    savingThrows: [Ability.STR, Ability.DEX],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON, WeaponType.MARTIAL_WEAPON] },
    sortOrder: 8,
  },
  Rogue: {
    hitDie: 8,
    spellcastingType: SpellcastingType.NONE,
    multiclassReqs: { choice: ["DEX"], score: 13 },
    savingThrows: [Ability.DEX, Ability.INT],
    armorProficiencies: [ArmorType.LIGHT],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 9,
  },
  Sorcerer: {
    hitDie: 6,
    spellcastingType: SpellcastingType.FULL,
    primaryCastingStat: Ability.CHA,
    multiclassReqs: { choice: ["CHA"], score: 13 },
    savingThrows: [Ability.CON, Ability.CHA],
    armorProficiencies: [],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 10,
  },
  Warlock: {
    hitDie: 8,
    spellcastingType: SpellcastingType.PACT,
    primaryCastingStat: Ability.CHA,
    multiclassReqs: { choice: ["CHA"], score: 13 },
    savingThrows: [Ability.WIS, Ability.CHA],
    armorProficiencies: [ArmorType.LIGHT],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 11,
  },
  Wizard: {
    hitDie: 6,
    spellcastingType: SpellcastingType.FULL,
    primaryCastingStat: Ability.INT,
    multiclassReqs: { choice: ["INT"], score: 13 },
    savingThrows: [Ability.INT, Ability.WIS],
    armorProficiencies: [],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 12,
  },
  Artificer: {
    hitDie: 8,
    spellcastingType: SpellcastingType.HALF,
    primaryCastingStat: Ability.INT,
    multiclassReqs: { choice: ["INT"], score: 13 },
    savingThrows: [Ability.CON, Ability.INT],
    armorProficiencies: [ArmorType.LIGHT, ArmorType.MEDIUM, ArmorType.SHIELD],
    weaponProficiencies: { type: [WeaponType.SIMPLE_WEAPON] },
    sortOrder: 13,
  },
};

export const seedClasses2024 = async (prisma: PrismaClient) => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/classes.json"),
    "utf-8"
  );
  const classesList: ClassJson2024[] = JSON.parse(raw);

  console.log(`🛡️ Seeding ${classesList.length} 2024 classes…`);
  let upserted = 0;
  let upsertedFeatures = 0;
  let errors = 0;

  for (const cls of classesList) {
    const enumName = `${cls.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
    const config = CLASS_CONFIGS[cls.engName];

    const payload = {
      name: enumName as any,
      ruleset: "RULES_2024" as const,
      hitDie: config.hitDie,
      spellcastingType: config.spellcastingType,
      primaryCastingStat: config.primaryCastingStat ?? null,
      subclassLevel: cls.subclassLevel,
      abilityScoreUpLevels: cls.abilityScoreImprovementLevels,
      epicBoonLevel: cls.epicBoonLevel,
      multiclassReqs: config.multiclassReqs,
      savingThrows: config.savingThrows,
      armorProficiencies: config.armorProficiencies,
      weaponProficiencies: config.weaponProficiencies,
      sortOrder: config.sortOrder,
    };

    try {
      const classRecord = await (prisma.class as any).upsert({
        where: { name_ruleset: { name: enumName, ruleset: "RULES_2024" } },
        update: payload,
        create: payload,
      });
      upserted++;
      upsertedFeatures += await seedClassFeatures(prisma, cls, classRecord.classId);
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(
        `  ❌ ${cls.engName} (${enumName}): ${e?.code ?? "?"} — ${e?.message ?? err}`
      );
    }
  }

  console.log(
    `✅ 2024 Classes: ${upserted} upserted, ${upsertedFeatures} features upserted, ${errors} errors`
  );
};

/**
 * Назва фічі не унікальна в межах класу — Варвар має "Improved Brutal Strike" на 13 і 17 рівнях.
 * engName є ключем upsert-а, тож повтори розводяться рівнем, інакше друга фіча затерла б першу.
 */
function buildFeatureEngNames(featuresEng: ClassFeatureEng2024[], className: string): string[] {
  const names = featuresEng.map((feature) => feature.name);
  const repeated = new Set(names.filter((name, index) => names.indexOf(name) !== index));

  return featuresEng.map((feature) =>
    repeated.has(feature.name)
      ? `${className}: ${feature.name} L${feature.level} (2024)`
      : `${className}: ${feature.name} (2024)`
  );
}

async function seedClassFeatures(
  prisma: PrismaClient,
  cls: ClassJson2024,
  classId: number
) {
  const featuresEng = cls.featuresEng ?? [];
  const features = cls.features ?? [];
  if (featuresEng.length !== features.length) {
    throw new Error(
      `${cls.engName}: ${featuresEng.length} фіч у featuresEng проти ${features.length} у features — переклад не вирівняний.`
    );
  }

  const engNames = buildFeatureEngNames(featuresEng, cls.engName);
  let upserted = 0;

  for (const [index, feature] of features.entries()) {
    const featurePayload = {
      name: feature.name,
      description: feature.description,
      shortDescription: feature.name,
      ruleset: "RULES_2024" as const,
      displayType: [FeatureDisplayType.PASSIVE],
    };

    const featureRecord = await prisma.feature.upsert({
      where: { engName: engNames[index] },
      update: featurePayload,
      create: { ...featurePayload, engName: engNames[index] },
    });
    upserted++;

    const linkPayload = {
      levelGranted: feature.level,
      displayOrder: featuresEng[index].displayOrder,
      ruleset: "RULES_2024" as const,
    };

    await prisma.classFeature.upsert({
      where: {
        classId_featureId: { classId, featureId: featureRecord.featureId },
      },
      update: linkPayload,
      create: { ...linkPayload, classId, featureId: featureRecord.featureId },
    });
  }

  return upserted;
}
