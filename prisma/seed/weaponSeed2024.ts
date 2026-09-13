/**
 * KR6.3 Крок 3 — 2024 Weapons seed (38 PHB 2024 weapons)
 *
 * Reads data/2024/normalized/weapons.json and upserts all weapons
 * with ruleset = RULES_2024 into the Weapon table.
 *
 * Unique composite key: @@unique([name, ruleset])
 */

import {
  DamageType,
  PrismaClient,
  WeaponCategory,
  WeaponMastery,
  WeaponProperty,
  WeaponType,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Weapon2024 = {
  ruleset: string;
  engName: string;
  damage: string;
  damageType: string;
  properties: string;
  mastery: string | null;
  masteryNameUa: string | null;
  weight: string;
  cost: string;
  weaponCategory: string;
  isRanged: boolean;
  source: string;
};

function toWeaponCategory(engName: string): WeaponCategory {
  const norm = engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return norm as WeaponCategory;
}

function parseProperties(raw: string): {
  props: WeaponProperty[];
  normalRange?: number;
  longRange?: number;
} {
  const props: WeaponProperty[] = [];
  let normalRange: number | undefined;
  let longRange: number | undefined;

  const lower = raw.toLowerCase();
  if (lower.includes("finesse")) props.push(WeaponProperty.FINESSE);
  if (lower.includes("versatile")) props.push(WeaponProperty.VERSATILE);
  if (lower.includes("light")) props.push(WeaponProperty.LIGHT);
  if (lower.includes("heavy")) props.push(WeaponProperty.HEAVY);
  if (lower.includes("reach")) props.push(WeaponProperty.REACH);
  if (lower.includes("two-handed")) props.push(WeaponProperty.TWO_HANDED);
  if (lower.includes("thrown")) props.push(WeaponProperty.THROWN);
  if (lower.includes("ammunition")) props.push(WeaponProperty.AMMUNITION);
  if (lower.includes("loading")) props.push(WeaponProperty.LOADING);
  if (lower.includes("special")) props.push(WeaponProperty.SPECIAL);

  const rangeMatch = raw.match(/Range\s+(\d+)\/(\d+)/i);
  if (rangeMatch) {
    normalRange = parseInt(rangeMatch[1], 10);
    longRange = parseInt(rangeMatch[2], 10);
  }

  return { props, normalRange, longRange };
}

export const seedWeapons2024 = async (prisma: PrismaClient) => {
  const raw = readFileSync(
    join(process.cwd(), "data/2024/normalized/weapons.json"),
    "utf-8"
  );
  const weapons: Weapon2024[] = JSON.parse(raw);

  console.log(`⚔️ Seeding ${weapons.length} 2024 weapons…`);
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < weapons.length; i++) {
    const weapon = weapons[i];
    const categoryEnum = toWeaponCategory(weapon.engName);
    const { props, normalRange, longRange } = parseProperties(weapon.properties || "");

    const weaponType =
      weapon.weaponCategory === "SIMPLE"
        ? WeaponType.SIMPLE_WEAPON
        : WeaponType.MARTIAL_WEAPON;

    const payload = {
      name: categoryEnum,
      ruleset: "RULES_2024" as const,
      damage: weapon.damage,
      damageType: weapon.damageType as DamageType,
      weaponType,
      properties: props,
      normalRange: normalRange ?? null,
      longRange: longRange ?? null,
      isRanged: weapon.isRanged,
      mastery: (weapon.mastery as WeaponMastery) ?? null,
      sortOrder: i + 1,
    };

    try {
      await prisma.weapon.upsert({
        where: {
          name_ruleset: {
            name: categoryEnum,
            ruleset: "RULES_2024",
          },
        },
        update: payload,
        create: payload,
      });
      upserted++;
    } catch (err: unknown) {
      errors++;
      const e = err as { code?: string; message?: string };
      console.error(
        `  ❌ ${weapon.engName} (${categoryEnum}): ${e?.code ?? "?"} — ${e?.message ?? err}`
      );
    }

    await new Promise((r) => setTimeout(r, 20));
  }

  await seedUnarmedStrike2024(prisma, weapons.length + 1);

  console.log(`✅ 2024 Weapons: ${upserted} upserted, ${errors} errors`);
};

// Правило, а не предмет, тому в `weapons.json` книги його немає — рядок потрібен, щоб беззбройний
// удар стояв у списку атак. SRD 2024, Rules Glossary: «Bludgeoning damage equal to 1 plus your Strength modifier».
async function seedUnarmedStrike2024(prisma: PrismaClient, sortOrder: number) {
  const payload = {
    name: WeaponCategory.UNARMED_STRIKE,
    ruleset: "RULES_2024" as const,
    damage: "1",
    damageType: DamageType.BLUDGEONING,
    weaponType: WeaponType.SIMPLE_WEAPON,
    properties: [],
    isRanged: false,
    mastery: null,
    sortOrder,
  };

  await prisma.weapon.upsert({
    where: { name_ruleset: { name: WeaponCategory.UNARMED_STRIKE, ruleset: "RULES_2024" } },
    update: payload,
    create: payload,
  });
}
