/**
 * KR6.3 Крок 3 — 2024 Classes seed
 */

import {
  Ability,
  ArmorType,
  FeatureDisplayType,
  Prisma,
  PrismaClient,
  RestType,
  SpellcastingType,
  ToolCategory,
  WeaponCategory,
  WeaponProperty,
  WeaponType,
} from "@prisma/client";
import classTools from "../../data/2024/normalized/class-tools.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type ClassFeature2024 = {
  level: number;
  name: string;
  description: string;
  skillProficiencies?: { choiceCount: number; options: string[] };
  skillExpertises?: {
    count: number;
    chooseFromCurrentProficiencies?: boolean;
    options?: string[];
  };
  repeatAtLevels?: number[];
};

type FeatureUses2024 = {
  limitedUsesPer: "SHORT_REST" | "LONG_REST";
  usesCount?: number;
  usesCountSpecial?: unknown;
  usesPoolKey?: string;
};

type ClassFeatureEng2024 = {
  level: number;
  name: string;
  displayOrder: number;
  skillProficiencies?: { choiceCount: number; options: string[] };
  skillExpertises?: ClassFeature2024["skillExpertises"];
  repeatAtLevels?: number[];
  displayType?: string[];
  uses?: FeatureUses2024;
};

type ClassJson2024 = {
  ruleset: string;
  engName: string;
  name: string;
  flavorTextEng: string;
  flavorText: string;
  subclassLevel: number;
  abilityScoreImprovementLevels: number[];
  epicBoonLevel: number;
  isPhbCore: boolean;
  note: string | null;
  source: string;
  weaponMasteryProgression?: number[];
  skillProficiencies: { choiceCount: number; options: string[] };
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
    /// SRD 5.2: «Simple weapons and Martial weapons that have the Finesse or Light property».
    /// Список конкретної зброї не пишеться руками — він розкривається з каталогу 2024.
    martialWeaponsWithProperty?: WeaponProperty[];
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
    armorProficiencies: [ArmorType.LIGHT, ArmorType.SHIELD],
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
    martialWeaponsWithProperty: [WeaponProperty.LIGHT],
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
    martialWeaponsWithProperty: [WeaponProperty.FINESSE, WeaponProperty.LIGHT],
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
  const martialWeaponsByProperty = collectMartialWeaponsByProperty();

  console.log(`🛡️ Seeding ${classesList.length} 2024 classes…`);
  let upserted = 0;
  let upsertedFeatures = 0;
  let errors = 0;

  for (const cls of classesList) {
    const enumName = `${cls.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
    const config = CLASS_CONFIGS[cls.engName];
    const toolConfig = classTools.classes.find((entry) => entry.className === enumName);

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
      skillProficiencies: cls.skillProficiencies,
      toolProficiencies: (toolConfig?.fixed ?? []).map(readToolCategory),
      toolToChooseCount: toolConfig?.choiceCount || null,
      armorProficiencies: config.armorProficiencies,
      weaponProficiencies: config.weaponProficiencies,
      weaponProficienciesSpecial: buildSpecialWeaponProficiencies(config, martialWeaponsByProperty),
      weapon_mastery_progression: readMasteryProgression(cls),
      sortOrder: config.sortOrder,
      description: cls.flavorText,
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

function readToolCategory(value: string): ToolCategory {
  if (!(value in ToolCategory)) throw new Error(`Невідома категорія інструмента 2024: ${value}`);
  return ToolCategory[value as keyof typeof ToolCategory];
}

/**
 * Ємність майстерності — рядок класової таблиці, а не константа в коді. Порожня прогресія у
 * джерелі означала б, що клас не дає майстерності, і мовчки прирівнялася б до Монаха, тому
 * відсутність двадцяти значень — помилка сіду, а не дефолт.
 */
function readMasteryProgression(cls: ClassJson2024): number[] {
  const progression = cls.weaponMasteryProgression ?? [];
  if (progression.length !== 20) {
    throw new Error(
      `${cls.engName}: weaponMasteryProgression має ${progression.length} значень замість 20 — дані класу неповні.`
    );
  }
  return progression;
}

type MartialWeaponsByProperty = Map<WeaponProperty, WeaponCategory[]>;

/**
 * «Martial weapons that have the Finesse or Light property» — предикат, а не список. Розкриваємо
 * його з каталогу зброї 2024, щоб нова зброя потрапляла у володіння сама.
 */
function collectMartialWeaponsByProperty(): MartialWeaponsByProperty {
  const weapons: Array<{ engName: string; properties: string; weaponCategory: string }> = JSON.parse(
    readFileSync(join(process.cwd(), "data/2024/normalized/weapons.json"), "utf-8")
  );
  const byProperty: MartialWeaponsByProperty = new Map();

  for (const weapon of weapons) {
    if (weapon.weaponCategory === "SIMPLE") continue;
    const category = weapon.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") as WeaponCategory;
    for (const property of [WeaponProperty.FINESSE, WeaponProperty.LIGHT]) {
      if (!weapon.properties.toLowerCase().includes(property.toLowerCase())) continue;
      byProperty.set(property, [...(byProperty.get(property) ?? []), category]);
    }
  }

  return byProperty;
}

function buildSpecialWeaponProficiencies(
  config: { martialWeaponsWithProperty?: WeaponProperty[] },
  martialWeaponsByProperty: MartialWeaponsByProperty
): { specific: WeaponCategory[] } | null {
  if (!config.martialWeaponsWithProperty?.length) return null;

  const specific = new Set<WeaponCategory>();
  for (const property of config.martialWeaponsWithProperty) {
    for (const weapon of martialWeaponsByProperty.get(property) ?? []) specific.add(weapon);
  }

  return { specific: [...specific] };
}

/**
 * Назва фічі не унікальна в межах класу — Варвар має "Improved Brutal Strike" на 13 і 17 рівнях.
 * engName є ключем upsert-а, тож повтори розводяться рівнем, інакше друга фіча затерла б першу.
 */
export function buildFeatureEngNames(featuresEng: ClassFeatureEng2024[], className: string): string[] {
  const names = featuresEng.map((feature) => feature.name);
  const repeated = new Set(names.filter((name, index) => names.indexOf(name) !== index));

  return featuresEng.map((feature) =>
    repeated.has(feature.name)
      ? `${className}: ${feature.name} L${feature.level} (2024)`
      : `${className}: ${feature.name} (2024)`
  );
}

/**
 * Тип дії й числа використань виводить із книги `scripts/2024/class-feature-uses.ts`, а сюди
 * вони приїжджають файлом ([Р33](../../docs/DECISIONS.md#р33)). Фіча без `displayType` у файлі —
 * це фіча класу поза корпусом SRD (Артифайсер), і вона лишається пасивною.
 */
function readDisplayTypes(feature: ClassFeatureEng2024): FeatureDisplayType[] {
  const names = feature.displayType ?? [FeatureDisplayType.PASSIVE];

  return names.map((name) => {
    if (!(name in FeatureDisplayType)) throw new Error(`Невідомий тип дії 2024: ${name}`);
    return FeatureDisplayType[name as keyof typeof FeatureDisplayType];
  });
}

/**
 * Порожні поля пишуться явними `null`, а не пропускаються: сід оновлює наявний рядок, і фіча,
 * яка втратила лічильник у книзі, мусить втратити його й у базі.
 *
 * `usesCountSpecial` лишається `null` без числа зумисне — `hasScaledMaximum` у `findPoolProvider`
 * читає саме цю колонку через `isFilledObject`, тож будь-який непорожній обʼєкт тут перемикає
 * суддю пулу (BUG-011).
 */
function readUses(feature: ClassFeatureEng2024) {
  const uses = feature.uses;
  return {
    limitedUsesPer: uses ? RestType[uses.limitedUsesPer] : null,
    usesCount: uses?.usesCount ?? null,
    usesCountSpecial: (uses?.usesCountSpecial as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
    usesPoolKey: uses?.usesPoolKey ?? null,
  };
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
    const sourceFeature = featuresEng[index];
    const featurePayload = {
      name: feature.name,
      description: feature.description,
      shortDescription: feature.name,
      ruleset: "RULES_2024" as const,
      displayType: readDisplayTypes(sourceFeature),
      skillProficiencies: sourceFeature.skillProficiencies ?? feature.skillProficiencies ?? undefined,
      skillExpertises: sourceFeature.skillExpertises ?? feature.skillExpertises ?? undefined,
      ...readUses(sourceFeature),
    };

    for (const levelGranted of [sourceFeature.level, ...(sourceFeature.repeatAtLevels ?? feature.repeatAtLevels ?? [])]) {
      const engName = levelGranted === sourceFeature.level
        ? engNames[index]
        : engNames[index].replace(/ \(2024\)$/, ` L${levelGranted} (2024)`);
      const featureRecord = await prisma.feature.upsert({
        where: { engName },
        update: featurePayload,
        create: { ...featurePayload, engName },
      });
      upserted++;

      const linkPayload = {
        levelGranted,
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
  }

  return upserted;
}
