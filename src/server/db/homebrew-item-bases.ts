import { prisma } from "@/lib/prisma";
import { armorTranslations, weaponTranslations } from "@/lib/refs/translation";

export type HomebrewItemBase = { id: number; label: string; ruleset: string };
export type HomebrewItemBases = { weapons: HomebrewItemBase[]; armors: HomebrewItemBase[] };

/// Зброя й обладунки каталогу, на яких будується хоумбрю-предмет: від основи беруться властивості, а лист отримує рядок.
export async function listHomebrewItemBases(): Promise<HomebrewItemBases> {
  const [weapons, armors] = await Promise.all([
    prisma.weapon.findMany({ select: { weaponId: true, name: true, ruleset: true }, orderBy: { weaponId: "asc" } }),
    prisma.armor.findMany({ select: { armorId: true, name: true, ruleset: true }, orderBy: { armorId: "asc" } }),
  ]);
  return {
    weapons: weapons.map((weapon) => ({ id: weapon.weaponId, label: weaponTranslations[weapon.name as keyof typeof weaponTranslations] ?? weapon.name, ruleset: weapon.ruleset })),
    armors: armors.map((armor) => ({ id: armor.armorId, label: armorTranslations[armor.name as keyof typeof armorTranslations] ?? armor.name, ruleset: armor.ruleset })),
  };
}
