"use client";

import { useMemo } from "react";
import { Sword } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PersWithRelations } from "@/lib/actions/pers";
import { weaponTranslations } from "@/lib/refs/translation";
import { findMainClassLevel } from "@/rules/hit-dice";
import { findWeaponMasteryCapacity } from "@/rules/weapon-mastery";
import WeaponMasteryDialog from "./WeaponMasteryDialog";
import { WeaponMasteryInfoButton } from "./WeaponMasteryInfoButton";

type Props = {
  pers: PersWithRelations;
  isReadOnly?: boolean;
};

/**
 * Ємність береться з прогресії класів персонажа, а не з кількості збережених рядків: клас без
 * майстерності не має бачити картки взагалі, а клас із нею — бачить її й порожньою.
 */
export function WeaponMasteryCard({ pers, isReadOnly }: Props) {
  const capacity = useMemo(() => findWeaponMasteryCapacity(toClassLevels(pers)), [pers]);
  const mastered = pers.pers_weapon_mastery ?? [];

  if (capacity === 0) return null;

  return (
    <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
      <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-300 uppercase tracking-wider">
          <Sword className="w-5 h-5" />
          Майстерність зброї
        </CardTitle>
        {!isReadOnly && (
          <WeaponMasteryDialog
            persId={pers.persId}
            trigger={
              <Button variant="ghost" size="sm" className="text-amber-300 hover:bg-amber-500/15">
                Змінити
              </Button>
            }
          />
        )}
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        <div className="px-2 pt-1 text-xs text-slate-400">
          Обрано {mastered.length} з {capacity}. Набір можна міняти будь-коли.
        </div>
        {mastered.length > 0 ? (
          mastered.map((entry) => (
            <div
              key={entry.pers_weapon_mastery_id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-800/40 p-3"
            >
              <span className="truncate font-bold text-slate-50">
                {weaponTranslations[entry.weapon.name as keyof typeof weaponTranslations] || entry.weapon.name}
              </span>
              <WeaponMasteryInfoButton
                mastery={entry.weapon.mastery}
                className="ml-2 flex-shrink-0 text-xs font-semibold text-amber-300"
              />
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-sm text-slate-500">Види зброї ще не обрані</div>
        )}
      </CardContent>
    </Card>
  );
}

function toClassLevels(pers: PersWithRelations) {
  return [
    {
      className: pers.class?.name ?? "",
      classLevel: findMainClassLevel(pers.level, pers.multiclasses ?? []),
      masteryProgression: pers.class?.weapon_mastery_progression ?? [],
    },
    ...(pers.multiclasses ?? []).map((entry) => ({
      className: entry.class.name,
      classLevel: entry.classLevel,
      masteryProgression: entry.class.weapon_mastery_progression ?? [],
    })),
  ];
}

export default WeaponMasteryCard;
