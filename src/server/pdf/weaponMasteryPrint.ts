import type { WeaponMastery } from "@prisma/client";

import { weaponTranslations } from "@/lib/refs/translation";
import { formatWeaponMasteryLabel, weaponMasteryDescriptions } from "@/lib/refs/weapon-mastery";

export type PrintableWeaponMastery = {
  weaponName: string;
  masteryLabel: string;
  description: string;
};

type PersWithWeaponMastery = {
  pers_weapon_mastery?: Array<{ weapon: { name: string; mastery: WeaponMastery | null } }> | null;
};

export function collectPrintableWeaponMasteries(pers: PersWithWeaponMastery): PrintableWeaponMastery[] {
  return (pers.pers_weapon_mastery ?? []).flatMap((entry) => {
    const mastery = entry.weapon.mastery;
    const label = formatWeaponMasteryLabel(mastery);
    if (!mastery || !label) return [];

    return [
      {
        weaponName: (weaponTranslations as Record<string, string>)[entry.weapon.name] ?? entry.weapon.name,
        masteryLabel: label,
        description: weaponMasteryDescriptions[mastery],
      },
    ];
  });
}
