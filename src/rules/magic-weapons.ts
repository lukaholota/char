import { parseDiceNotation } from "./dice-roll";
import { readRuleset } from "./ruleset";
import type { DamageTypeKey, Ruleset } from "./types";
import { parseWeaponProfile, type WeaponProfile } from "./weapon-profile";

export type WeaponHitDamage = { count: number; sides: number; damageType: DamageTypeKey | null; customType?: string; condition: string | null };
export type MagicWeaponTraits = { bonus: number; hits: WeaponHitDamage[]; profile: WeaponProfile | null };
export type MagicWeaponSource = { engName?: string | null; ruleset?: string | null; description?: string | null; weaponBonus?: number | null; weaponProfile?: unknown };

type HitEntry = { dice: string; damageType?: DamageTypeKey; condition?: string };

const PLUS_PATTERN = /бонус \+([123]) до кидків атаки (?:і|й|та) (?:кидків )?(?:шкоди|ушкоджень)/iu;
const NOT_A_HELD_WEAPON = /^Ammunition\b/;
const PLUS_NOT_FOR_LINKED_WEAPON = new Set(["Bloodrage Greataxe", "Deck of Wonder", "Oil of Sharpness"]);

const byEdition = (rules2014: HitEntry, rules2024: HitEntry): Partial<Record<Ruleset, HitEntry[]>> => ({ RULES_2014: [rules2014], RULES_2024: [rules2024] });

const HIT_DAMAGE: Record<string, HitEntry[] | Partial<Record<Ruleset, HitEntry[]>>> = {
  "Frost Brand": [{ dice: "1d6", damageType: "COLD" }],
  "Fate Cutter Shears": [{ dice: "1d6", damageType: "FORCE" }],
  "Lash of Immolation": [{ dice: "1d6", damageType: "FIRE" }],
  "Vicious Weapon": { RULES_2024: [{ dice: "2d6" }] },
  "Flame Tongue": [{ dice: "2d6", damageType: "FIRE", condition: "поки зброя палає" }],
  "Oathbow": [{ dice: "3d6", damageType: "PIERCING", condition: "проти заклятого ворога" }],
  "Dragon Slayer": byEdition({ dice: "3d6", condition: "проти драконів" }, { dice: "3d6", condition: "проти Драконів" }),
  "Giant Slayer": byEdition({ dice: "2d6", condition: "проти велетнів" }, { dice: "2d6", condition: "проти Велетнів" }),
  "Executioner's Axe": byEdition({ dice: "2d6", damageType: "SLASHING", condition: "проти гуманоїдів" }, { dice: "2d6", damageType: "SLASHING", condition: "проти Гуманоїдів" }),
  "Mace of Disruption": byEdition(
    { dice: "2d6", damageType: "RADIANT", condition: "проти почвар і нежиті" },
    { dice: "2d6", damageType: "RADIANT", condition: "проти Почвар і Невмерлих" },
  ),
  "Holy Avenger": byEdition(
    { dice: "2d10", damageType: "RADIANT", condition: "проти почвар і нежиті" },
    { dice: "2d10", damageType: "RADIANT", condition: "проти Почвар і Невмерлих" },
  ),
  "Sun Blade": byEdition({ dice: "1d8", damageType: "RADIANT", condition: "проти нежиті" }, { dice: "1d8", damageType: "RADIANT", condition: "проти Невмерлих" }),
  "Dwarven Thrower": byEdition(
    { dice: "1d8", condition: "кидком (проти велетнів — 2к8)" },
    { dice: "1d8", damageType: "FORCE", condition: "кидком (проти Велетнів — 2к8)" },
  ),
};

/// Зброя, яку гравець привʼязує до рядка зброї листа: бонус +N з опису, кубики при влучанні й профіль хомбрю-зброї.
export function findMagicWeaponTraits(item: MagicWeaponSource): MagicWeaponTraits | null {
  const bonus = findMagicWeaponBonus(item);
  const profile = parseWeaponProfile(item.weaponProfile);
  const hits = [...findWeaponHitDamage(item), ...(profile?.extraDamage ?? []).map((extra) => ({ ...extra, condition: null }))];
  return bonus > 0 || hits.length > 0 || profile ? { bonus, hits, profile } : null;
}

function findMagicWeaponBonus(item: MagicWeaponSource): number {
  if (item.weaponBonus) return item.weaponBonus;
  const engName = item.engName ?? "";
  if (NOT_A_HELD_WEAPON.test(engName) || PLUS_NOT_FOR_LINKED_WEAPON.has(engName)) return 0;
  const match = item.description?.match(PLUS_PATTERN);
  return match ? Number(match[1]) : 0;
}

function findWeaponHitDamage(item: MagicWeaponSource): WeaponHitDamage[] {
  const entry = item.engName ? HIT_DAMAGE[item.engName] : undefined;
  const entries = !entry ? [] : Array.isArray(entry) ? entry : (entry[readRuleset(item.ruleset)] ?? []);
  return entries.map((hit) => ({ ...parseDiceNotation(hit.dice), damageType: hit.damageType ?? null, condition: hit.condition ?? null }));
}
