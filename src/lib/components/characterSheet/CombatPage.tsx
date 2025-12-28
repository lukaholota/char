"use client";

import { useState } from "react";
import { PersWithRelations, PersWeaponWithWeapon, PersArmorWithArmor } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAbilityMod, formatModifier, getProficiencyBonus } from "@/lib/logic/utils";
// bonus-calculator imports removed if only used for removed stats
import { 
  weaponTranslations, 
  damageTypeTranslations, 
  armorTypeTranslations, 
  armorTranslations 
} from "@/lib/refs/translation";
import { Sword, Shield, Settings2 } from "lucide-react";
import AddWeaponDialog from "./AddWeaponDialog";
import AddArmorDialog from "./AddArmorDialog";
import WeaponCustomizeModal from "./WeaponCustomizeModal";
import ArmorCustomizeModal from "./ArmorCustomizeModal";
import { Button } from "@/components/ui/button";
import { updateShieldStatus } from "@/lib/actions/equipment-actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CombatPage({ pers, isReadOnly }: { pers: PersWithRelations, isReadOnly?: boolean }) {
// Redundant stats removed

  const [selectedWeapon, setSelectedWeapon] = useState<PersWeaponWithWeapon | null>(null);
  const [selectedArmor, setSelectedArmor] = useState<PersArmorWithArmor | null>(null);

  const handleShieldToggle = async (val: boolean) => {
    const res = await updateShieldStatus(pers.persId, { wearsShield: val });
    if (res.success) {
      toast.success(val ? "Щит екіпіровано" : "Щит знято");
    } else {
      toast.error(res.error);
    }
  };

  const getAttackBonus = (pw: PersWeaponWithWeapon) => {
    const ability = (pw.customDamageAbility?.toLowerCase() || (pw.weapon?.isRanged ? "dex" : "str")) as any;
    const mod = getAbilityMod(pers[ability as keyof typeof pers] as number);
    const attackBonus = (pw.isProficient ? getProficiencyBonus(pers.level) : 0) + mod + (pw.attackBonus || 0);
    return attackBonus;
  };

  const getDamageBonus = (pw: PersWeaponWithWeapon) => {
    const ability = (pw.customDamageAbility?.toLowerCase() || (pw.weapon?.isRanged ? "dex" : "str")) as any;
    const mod = getAbilityMod(pers[ability as keyof typeof pers] as number);
    const damageBonus = mod + ((pw.customDamageBonus as number) || 0);
    return damageBonus;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Redundant stats grid removed - they are already visible in global stats and header */}

      {/* Weapons Section */}
      <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-300 uppercase tracking-wider">
            <Sword className="w-5 h-5" />
            Зброя та атаки
          </CardTitle>
          {!isReadOnly && <AddWeaponDialog persId={pers.persId} />}
        </CardHeader>
        <CardContent className="p-2 space-y-2">
          {pers.weapons.length > 0 ? (
            pers.weapons.map((pw) => (
              <div 
                key={pw.persWeaponId}
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-slate-800/40 hover:bg-slate-800/60 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-50 flex items-center gap-2">
                    <span className="truncate">{pw.overrideName || (weaponTranslations[pw.weapon?.name as keyof typeof weaponTranslations] || pw.weapon?.name)}</span>
                    {pw.isMagical && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex-shrink-0">MAG</span>}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="text-amber-400 font-bold text-sm">
                      {pw.customDamageDice || pw.weapon?.damage}{formatModifier(getDamageBonus(pw))}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="truncate">
                      {damageTypeTranslations[pw.weapon?.damageType as keyof typeof damageTypeTranslations] || pw.weapon?.damageType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 ml-2">
                  <div className="text-center">
                    <div className="text-xl font-black text-slate-50 leading-none">{formatModifier(getAttackBonus(pw))}</div>
                    <div className="text-[9px] uppercase font-bold text-slate-500 mt-0.5">влучання</div>
                  </div>
                  {!isReadOnly && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-indigo-400 transition-colors"
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWeapon(pw as PersWeaponWithWeapon);
                      }}
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">Зброя не додана</div>
          )}
        </CardContent>
      </Card>

      {/* Armor Section */}
      <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-300 uppercase tracking-wider">
            <Shield className="w-5 h-5" />
            Обладунок та захист
          </CardTitle>
          {!isReadOnly && <AddArmorDialog persId={pers.persId} />}
        </CardHeader>
        <CardContent className="p-2 space-y-4">
          <div className="space-y-2">
            {pers.armors.length > 0 ? (
              pers.armors.map((pa) => (
                <div 
                  key={pa.persArmorId}
                  className={`flex items-center justify-between p-3 rounded-lg border transition ${
                    pa.equipped 
                      ? 'bg-indigo-500/10 border-indigo-500/30' 
                      : 'bg-slate-800/40 border-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-50 flex items-center gap-2">
                      {armorTranslations[pa.armor?.name as keyof typeof armorTranslations] || pa.armor?.name || "Кастомний обладунок"}
                      {pa.equipped && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">Активний</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {armorTypeTranslations[pa.armor?.armorType as keyof typeof armorTypeTranslations] || pa.armor?.armorType}
                      {pa.miscACBonus && pa.miscACBonus !== 0 && ` • ${formatModifier(pa.miscACBonus)} бонус`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 ml-2">
                    <div className="text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-500 line-height-none mb-0.5">баз. КБ</div>
                      <div className="text-xl font-black text-slate-50 leading-none">
                        {pa.overrideBaseAC ?? pa.armor?.baseAC}
                      </div>
                    </div>
                  {!isReadOnly && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-indigo-400 transition-colors"
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArmor(pa as PersArmorWithArmor);
                      }}
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">Обладунки не додані</div>
            )}
          </div>

          {/* Shield Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${pers.wearsShield ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <Label className="font-bold text-slate-50">Використовувати щит</Label>
                <p className="text-xs text-slate-400">Додає +2 до КБ (та бонуси)</p>
              </div>
            </div>
            <Switch 
              checked={pers.wearsShield} 
              onCheckedChange={!isReadOnly ? handleShieldToggle : undefined}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedWeapon && (
        <WeaponCustomizeModal 
          persWeapon={selectedWeapon as any} 
          open={!!selectedWeapon} 
          onOpenChange={(open) => !open && setSelectedWeapon(null)} 
        />
      )}
      {selectedArmor && (
        <ArmorCustomizeModal 
          persArmor={selectedArmor as any} 
          open={!!selectedArmor} 
          onOpenChange={(open) => !open && setSelectedArmor(null)} 
        />
      )}
    </div>
  );
}

