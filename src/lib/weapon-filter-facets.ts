import type { WeaponData } from "@/lib/weaponsData";

export const WEAPON_REACH_LABELS = {
  MELEE: "Ближній бій",
  RANGED: "Далекобійна",
} as const;

export type WeaponReach = keyof typeof WEAPON_REACH_LABELS;

export function findWeaponReach(weapon: Pick<WeaponData, "isRanged">): WeaponReach {
  return weapon.isRanged ? "RANGED" : "MELEE";
}
