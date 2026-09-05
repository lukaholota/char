/**
 * KR16.5 — 13 категорій обладунку PHB 2024 у таблицю `armor`.
 *
 * Читає `data/2024/normalized/armor.json` і накладає його за складеним ключем
 * `(name, ruleset)`, який завів
 * `db/changes/2026-08-24-kr16.5-armor-ruleset-unique.sql`. До нього обидві редакції не
 * могли співіснувати під однією назвою — і саме через це 2014-рядок `PADDED` виявився
 * перекинутим у `RULES_2024`. Сід повертає такі рядки назад, перш ніж заводити свої.
 */

import {
  Ability,
  AbilityBonusType,
  ArmorCategory,
  ArmorType,
  PrismaClient,
  Prisma,
  Ruleset,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CATALOG_PATH = join(process.cwd(), "data/2024/normalized/armor.json");

/// Тринадцять стандартних категорій книги. Решта значень `ArmorCategory` — це джерела КБ
/// (беззбройний захист, природний обладунок) і `HOMEBREW`; у книзі 2024 їх немає, і сід
/// їх не заводить.
const STANDARD_CATEGORIES: ArmorCategory[] = [
  ArmorCategory.PADDED,
  ArmorCategory.LEATHER,
  ArmorCategory.STUDDED_LEATHER,
  ArmorCategory.HIDE,
  ArmorCategory.CHAIN_SHIRT,
  ArmorCategory.SCALE_MAIL,
  ArmorCategory.BREASTPLATE,
  ArmorCategory.HALF_PLATE,
  ArmorCategory.RING_MAIL,
  ArmorCategory.CHAIN_MAIL,
  ArmorCategory.SPLINT,
  ArmorCategory.PLATE,
  ArmorCategory.SHIELD,
];

type Armor2024 = {
  code: string;
  engName: string;
  armorType: string;
  baseAC: number;
  abilityBonusType: string;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  ruleset: string;
};

/// KR27.8 — альтернативні формули базового КЗ. У книзі це фічі класу, а не обладунок, але в цій
/// схемі кожен спосіб рахувати базовий КЗ — рядок `armor`, який гравець вдягає; «одна за раз» із
/// SRD 2024 (Multiclassing → Armor Class) тоді тримається прапорцем `equipped`. Джерела файлу
/// не мають — числа з data/2024/srd/classes.md, тому список стоїть кодом, як і рядки 2014
/// в prisma/seed/armorSeed.ts.
const ALTERNATIVE_ARMOR_CLASS_FORMULAS: Prisma.ArmorUncheckedCreateInput[] = [
  {
    name: ArmorCategory.UNARMORED_DEFENSE_MONK,
    armorType: ArmorType.LIGHT,
    baseAC: 10,
    abilityBonuses: [Ability.DEX, Ability.WIS],
    abilityBonusType: AbilityBonusType.FULL,
    strengthReq: null,
    stealthDisadvantage: false,
    ruleset: Ruleset.RULES_2024,
  },
  {
    name: ArmorCategory.UNARMORED_DEFENSE_BARBARIAN,
    armorType: ArmorType.LIGHT,
    baseAC: 10,
    abilityBonuses: [Ability.DEX, Ability.CON],
    abilityBonusType: AbilityBonusType.FULL,
    strengthReq: null,
    stealthDisadvantage: false,
    ruleset: Ruleset.RULES_2024,
  },
  {
    name: ArmorCategory.DRACONIC_RESILIENCE,
    armorType: ArmorType.LIGHT,
    baseAC: 10,
    abilityBonuses: [Ability.DEX, Ability.CHA],
    abilityBonusType: AbilityBonusType.FULL,
    strengthReq: null,
    stealthDisadvantage: false,
    ruleset: Ruleset.RULES_2024,
  },
];

export const seedArmor2024 = async (prisma: PrismaClient) => {
  const restored = await restoreMisfiled2014Armor(prisma);
  if (restored.length > 0) {
    console.log(`🩹 Повернуто в RULES_2014: ${restored.join(", ")}`);
  }

  const armors = readCatalog();
  console.log(`🛡️ Обладунок 2024: ${armors.length} категорій…`);

  for (const armor of armors) {
    const payload = buildArmor(armor);
    await prisma.armor.upsert({
      where: { name_ruleset: { name: payload.name, ruleset: Ruleset.RULES_2024 } },
      update: payload,
      create: payload,
    });
  }

  for (const payload of ALTERNATIVE_ARMOR_CLASS_FORMULAS) {
    await prisma.armor.upsert({
      where: { name_ruleset: { name: payload.name, ruleset: Ruleset.RULES_2024 } },
      update: payload,
      create: payload,
    });
  }

  console.log(
    `✅ Обладунок 2024: ${armors.length} рядків накладено, формул базового КЗ — ${ALTERNATIVE_ARMOR_CLASS_FORMULAS.length}`
  );
};

/// Рядок вважається перекинутим, коли категорія стоїть у RULES_2024, а в RULES_2014 її
/// немає — тобто каталог 2014 неповний. Умова «каталог 2014 узагалі існує» обовʼязкова:
/// без неї сід на чистій базі, засіяній спершу 2024, забрав би власні ж рядки в 2014.
async function restoreMisfiled2014Armor(prisma: PrismaClient): Promise<ArmorCategory[]> {
  const standard = await prisma.armor.findMany({
    where: { name: { in: STANDARD_CATEGORIES } },
    select: { armorId: true, name: true, ruleset: true },
  });

  const present2014 = new Set(
    standard.filter((row) => row.ruleset === Ruleset.RULES_2014).map((row) => row.name)
  );
  if (present2014.size === 0) return [];

  const misfiled = standard.filter(
    (row) => row.ruleset === Ruleset.RULES_2024 && !present2014.has(row.name)
  );

  for (const row of misfiled) {
    await prisma.armor.update({
      where: { armorId: row.armorId },
      data: { ruleset: Ruleset.RULES_2014 },
    });
  }

  return misfiled.map((row) => row.name);
}

function readCatalog(): Armor2024[] {
  const armors = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as Armor2024[];

  const foreign = armors.filter((armor) => armor.ruleset !== Ruleset.RULES_2024);
  if (foreign.length > 0) {
    throw new Error(
      `${CATALOG_PATH}: не редакція 2024 — ${foreign.map((armor) => armor.engName).join(", ")}`
    );
  }

  const missing = STANDARD_CATEGORIES.filter(
    (category) => !armors.some((armor) => armor.code === category)
  );
  if (missing.length > 0) {
    throw new Error(`${CATALOG_PATH}: немає категорій ${missing.join(", ")}`);
  }

  return armors;
}

/// `abilityBonuses` у нормалізованому файлі немає, бо в книзі його теж немає — це наша
/// колонка. Виводимо з типу бонуса тим самим правилом, за яким живуть рядки 2014:
/// повний і обмежений бонус беруть Спритність, «жодного» не бере нічого.
function buildArmor(armor: Armor2024): Prisma.ArmorUncheckedCreateInput {
  const abilityBonusType = armor.abilityBonusType as AbilityBonusType;

  return {
    name: armor.code as ArmorCategory,
    armorType: armor.armorType as ArmorType,
    baseAC: armor.baseAC,
    strengthReq: armor.strengthReq,
    stealthDisadvantage: armor.stealthDisadvantage,
    abilityBonuses: abilityBonusType === AbilityBonusType.NONE ? [] : [Ability.DEX],
    abilityBonusType,
    ruleset: Ruleset.RULES_2024,
  };
}
