import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import { readStateEffects } from "@/lib/logic/bonus-calculator";
import { weaponTranslations } from "@/lib/refs/translation";

export function findPersWeaponName(pers: PersWithRelations, pw: PersWeaponWithWeapon): string {
  return (
    pw.overrideName ||
    (pw.weapon?.name === "UNARMED_STRIKE" && readStateEffects(pers)?.unarmedStrike ? "Хижі удари" : null) ||
    (weaponTranslations[pw.weapon?.name as keyof typeof weaponTranslations] || pw.weapon?.name) ||
    "Зброя"
  );
}
