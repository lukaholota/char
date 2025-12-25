"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  armorTranslations,
  armorTypeTranslations,
  damageTypeTranslations,
  weaponTranslations,
  weaponTypeTranslations,
} from "@/lib/refs/translation";
import { Sword } from "lucide-react";

interface CombatSlideProps {
  pers: PersWithRelations;
}

export default function CombatSlide({ pers }: CombatSlideProps) {
  return (
    <div className="h-full p-4 space-y-4">
      <Card className="glass-card bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-50">
            <Sword className="w-5 h-5" />
            <span className="uppercase tracking-wide text-indigo-300">Атаки та Зброя</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pers.weapons.map((pw) => (
            <div
              key={pw.persWeaponId}
              className="flex justify-between items-center border border-white/10 bg-slate-900/30 p-3 rounded-lg hover:bg-slate-900/45 transition"
            >
              <div>
                <div className="font-bold text-slate-50">
                  {weaponTranslations[pw.weapon.name as keyof typeof weaponTranslations] || pw.weapon.name}
                </div>
                <div className="text-xs text-slate-300">
                  {(weaponTypeTranslations[pw.weapon.weaponType as keyof typeof weaponTypeTranslations] || pw.weapon.weaponType) + " • "}
                  {pw.weapon.damage} {damageTypeTranslations[pw.weapon.damageType as keyof typeof damageTypeTranslations] || pw.weapon.damageType}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-slate-200">+{Math.floor(Math.random() * 5) + 3}</div>
                <div className="text-xs text-slate-400">атака</div>
              </div>
            </div>
          ))}
          {pers.weapons.length === 0 && (
            <div className="text-slate-300/60 text-sm text-center py-8">Зброя не екіпірована</div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg uppercase tracking-wide text-indigo-300">Броня</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pers.armors.map((pa) => (
            <div
              key={pa.persArmorId}
              className="flex justify-between items-center border border-white/10 bg-slate-900/30 p-3 rounded-lg"
            >
              <div>
                <div className="font-semibold text-slate-50">
                  {armorTranslations[pa.armor.name as keyof typeof armorTranslations] || pa.armor.name}
                </div>
                <div className="text-xs text-slate-300">
                  {armorTypeTranslations[pa.armor.armorType as keyof typeof armorTypeTranslations] || pa.armor.armorType}
                </div>
              </div>
              <div className="text-sm text-slate-300">КЗ {pa.armor.baseAC}</div>
            </div>
          ))}
          {pers.armors.length === 0 && (
            <div className="text-slate-300/60 text-sm text-center py-8">Броня не екіпірована</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
