"use client";

import { useState, useEffect, useMemo } from "react";
import { PersWithRelations, PersWeaponWithWeapon, PersArmorWithArmor } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatModifier } from "@/lib/logic/utils";
// bonus-calculator imports removed if only used for removed stats
import { 
  weaponTranslations, 
  damageTypeTranslations, 
  armorTypeTranslations, 
  armorTranslations 
} from "@/lib/refs/translation";
import { Sword, Shield, Settings2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTransition } from "react";
import AddWeaponDialog from "./AddWeaponDialog";
import AddArmorDialog from "./AddArmorDialog";
import WeaponCustomizeModal from "./WeaponCustomizeModal";
import ArmorCustomizeModal from "./ArmorCustomizeModal";
import { Button } from "@/components/ui/button";
import { updateShieldStatus, updateArmor, deleteArmor, updateRaceStaticAcBonus } from "@/lib/actions/equipment-actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { calculateWeaponAttackBonus, calculateWeaponDamageBonus } from "@/lib/logic/bonus-calculator";
import { Trash2, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import AddMagicItemDialog from "./AddMagicItemDialog";
import { updateMagicItem, deleteMagicItem } from "@/lib/actions/magic-item-actions";
import { MagicItemInfoModal } from "@/lib/components/levelUp/MagicItemInfoModal";
import { magicItemTypeTranslations, itemRarityTranslations } from "@/lib/refs/translation";
import { Ability, AbilityBonusType, ArmorCategory, ArmorType } from "@prisma/client";
import { calculateFinalModifier } from "@/lib/logic/bonus-calculator";


function MagicItemRow({ 
    pmi, 
    isReadOnly, 
    onDelete, 
    onUpdate,
    onSelect,
    isRemoving
}: { 
    pmi: PersWithRelations['magicItems'][number] & { magicItem: NonNullable<PersWithRelations['magicItems'][number]['magicItem']> };
    isReadOnly?: boolean; 
    onDelete: () => void;
    onUpdate: (updates: { isEquipped?: boolean; isAttuned?: boolean }) => void;
    onSelect: () => void;
    isRemoving: boolean;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    
    const typeLabel = (magicItemTypeTranslations as any)[pmi.magicItem?.itemType] || pmi.magicItem?.itemType;
    const rarityLabel = (itemRarityTranslations as any)[pmi.magicItem?.rarity] || pmi.magicItem?.rarity;

    // Logic for items that don't need "Equipped" toggle
    const isConsumable = pmi.magicItem?.itemType === "POTION" || pmi.magicItem?.itemType === "SCROLL";

    return (
        <div className={`w-full overflow-hidden transition-all duration-300 ${isRemoving ? "opacity-0 translate-x-2 max-h-0 py-0" : "opacity-100 translate-x-0 max-h-32 mb-2"}`}>
            <div 
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-slate-800/40 hover:bg-slate-800/60 transition group cursor-pointer"
                onClick={onSelect}
            >
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-50 flex items-center gap-2">
                        <span className="truncate text-violet-200">{pmi.magicItem?.name}</span>
                        {pmi.isEquipped && <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">ЕКІП</span>}
                        {pmi.isAttuned && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">НАЛАШТ</span>}
                    </div>
                     <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {typeLabel} • {rarityLabel}
                     </div>
                </div>

                <div className="flex items-center gap-2 ml-2" onClick={e => e.stopPropagation()}>
                    {!isReadOnly && (
                        <>
                            {/* Toggle Attunement if required */}
                            {pmi.magicItem?.requiresAttunement && (
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 w-8 p-0 ${pmi.isAttuned ? "text-amber-400 bg-amber-400/10" : "text-slate-600 hover:text-amber-400"}`}
                                    onClick={() => onUpdate({ isAttuned: !pmi.isAttuned })}
                                    title={pmi.isAttuned ? "Скасувати налаштування" : "Налаштуватися"}
                                 >
                                    <Zap className="w-4 h-4" />
                                 </Button>
                            )}

                            {/* Toggle Equipped */}
                            {!isConsumable && (
                                <Switch
                                    checked={pmi.isEquipped}
                                    onCheckedChange={(val) => onUpdate({ isEquipped: val })}
                                    className="scale-75"
                                />
                            )}

                             <Button 
                                variant="ghost" 
                                size="icon"
                                className={`h-8 w-8 transition-all duration-300 ${
                                confirmDelete 
                                    ? "text-red-500 bg-red-500/20 border border-red-500/30" 
                                    : "text-slate-500 hover:text-red-400"
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmDelete) {
                                        onDelete();
                                    } else {
                                        setConfirmDelete(true);
                                        setTimeout(() => setConfirmDelete(false), 3000);
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

type CombatPageProps = {
  pers: PersWithRelations;
  onPersUpdate?: (next: PersWithRelations) => void;
  isReadOnly?: boolean;
};

export default function CombatPage({ pers, onPersUpdate, isReadOnly }: CombatPageProps) {
// Redundant stats removed

  const [selectedWeapon, setSelectedWeapon] = useState<PersWeaponWithWeapon | null>(null);
  const [selectedArmor, setSelectedArmor] = useState<PersArmorWithArmor | null>(null);
  const [selectedMagicItem, setSelectedMagicItem] = useState<any | null>(null);

  const [confirmDeleteArmorId, setConfirmDeleteArmorId] = useState<number | null>(null);
  const [removingArmorIds, setRemovingArmorIds] = useState<Set<number>>(() => new Set());
  const [removingMagicItemIds, setRemovingMagicItemIds] = useState<Set<number>>(() => new Set());
  const [isPending, startTransition] = useTransition();

  const magicItems = pers.magicItems ?? [];

  const router = useRouter();

  useEffect(() => {
    // Reset confirmation when any click happens outside
    const handleGlobalClick = () => setConfirmDeleteArmorId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const [wearsShield, setWearsShield] = useState(pers.wearsShield);
  const [raceStaticAcBonus, setRaceStaticAcBonus] = useState<number>((pers as any).raceStaticAcBonus ?? 0);

  const configuredRaceStaticBonus = useMemo(() => {
    const ac = (pers as any).race?.ac;
    if (ac && typeof ac === "object" && typeof (ac as any).consistentBonus === "number") {
      return Math.trunc((ac as any).consistentBonus);
    }
    return 0;
  }, [pers]);

  const showRaceStaticAcBonusToggle = useMemo(() => {
    if (configuredRaceStaticBonus !== 0) return true;
    return typeof raceStaticAcBonus === "number" && Number.isFinite(raceStaticAcBonus) && raceStaticAcBonus !== 0;
  }, [configuredRaceStaticBonus, raceStaticAcBonus]);

  // Sync state if prop changes (e.g. from other updates)
  useEffect(() => {
    setWearsShield(pers.wearsShield);
  }, [pers.wearsShield]);

  useEffect(() => {
    setRaceStaticAcBonus((pers as any).raceStaticAcBonus ?? 0);
  }, [(pers as any).raceStaticAcBonus]);

  const handleShieldToggle = async (val: boolean) => {
    setWearsShield(val); // Optimistic update
    const res = await updateShieldStatus(pers.persId, { wearsShield: val });
    if (res.success) {
      toast.success(val ? "Щит екіпіровано" : "Щит знято");
      router.refresh();
    } else {
      setWearsShield(!val); // Revert on failure
      toast.error(res.error);
    }
  };

  const handleRaceStaticAcBonusToggle = async (val: boolean) => {
    const next = val ? configuredRaceStaticBonus : 0;
    setRaceStaticAcBonus(next);
    const res = await updateRaceStaticAcBonus(pers.persId, next);
    if (res.success) {
      toast.success(val ? "Бонус раси до КБ увімкнено" : "Бонус раси до КБ вимкнено");
      router.refresh();
    } else {
      setRaceStaticAcBonus((pers as any).raceStaticAcBonus ?? 0);
      toast.error(res.error);
    }
  };

  const hasShieldProficiency = useMemo(() => {
    const profs = new Set<string>();
    // Base class
    if (pers.class?.armorProficiencies) {
      (pers.class.armorProficiencies as string[]).forEach(p => profs.add(p));
    }
    // Subclass (e.g., Hexblade)
    if ((pers as any).subclass?.armorProficiencies) {
      (((pers as any).subclass.armorProficiencies as string[]) || []).forEach((p: string) => profs.add(p));
    }
    // Race
    if (pers.race?.armorProficiencies) {
      (pers.race.armorProficiencies as string[]).forEach(p => profs.add(p));
    }
    // Multiclasses
    if (pers.multiclasses) {
      pers.multiclasses.forEach((mc: any) => {
        if (mc.class?.armorProficiencies) {
          (mc.class.armorProficiencies as string[]).forEach((p: string) => profs.add(p));
        }
        if (mc.subclass?.armorProficiencies) {
          (mc.subclass.armorProficiencies as string[]).forEach((p: string) => profs.add(p));
        }
      });
    }

    // Feats
    if (pers.feats) {
      pers.feats.forEach((pf: any) => {
        if (pf.feat?.grantedArmorProficiencies) {
          (pf.feat.grantedArmorProficiencies as string[]).forEach((p: string) => profs.add(p));
        }
      });
    }

    return profs.has("SHIELD");
  }, [pers]);

  const getAttackBonus = (pw: PersWeaponWithWeapon) => calculateWeaponAttackBonus(pers, pw);

  const getDamageBonus = (pw: PersWeaponWithWeapon) => calculateWeaponDamageBonus(pers, pw);

  const getDisplayedArmorBaseAC = (pa: PersArmorWithArmor): number => {
    const armorBase = pa.overrideBaseAC ?? pa.armor?.baseAC ?? 10;
    const misc = pa.miscACBonus ?? 0;

    const persAbilities: Ability[] = Array.isArray((pa as any).abilityBonuses) ? (((pa as any).abilityBonuses as Ability[]) ?? []) : [];
    const armorAbilities: Ability[] = Array.isArray((pa.armor as any)?.abilityBonuses)
      ? ((((pa.armor as any).abilityBonuses as Ability[]) ?? []) as Ability[])
      : [];

    const persType = (pa as any).abilityBonusType as AbilityBonusType | undefined;
    const armorType = (pa.armor as any)?.abilityBonusType as AbilityBonusType | undefined;
    let type = persType ?? armorType ?? AbilityBonusType.FULL;
    if (armorType && persType === AbilityBonusType.FULL && persAbilities.length === 0) {
      type = armorType;
    }

    const abilities: Ability[] =
      type === AbilityBonusType.NONE ? persAbilities : (persAbilities.length > 0 ? persAbilities : armorAbilities);

    const unique = Array.from(new Set(abilities));
    let bonus = 0;
    for (const ability of unique) {
      let mod = calculateFinalModifier(pers, ability);
      if (type === AbilityBonusType.MAX2 && ability === Ability.DEX) {
        mod = Math.min(mod, 2);
      }
      bonus += mod;
    }

    return armorBase + bonus + misc;
  };

  const weaponRows = useMemo(() => {
    const isPlain = (pw: PersWeaponWithWeapon) => {
      const hasOverrideName = !!pw.overrideName && pw.overrideName.trim() !== "";
      const hasCustomDice = !!pw.customDamageDice;
      const hasCustomAbility = !!pw.customDamageAbility;
      const hasCustomBonus = typeof pw.customDamageBonus === "number" ? pw.customDamageBonus !== 0 : !!pw.customDamageBonus;
      const hasAttackBonus = typeof (pw as any).attackBonus === "number" ? (pw as any).attackBonus !== 0 : false;
      return !hasOverrideName && !hasCustomDice && !hasCustomAbility && !hasCustomBonus && !hasAttackBonus && !pw.isMagical;
    };

    const byWeaponId = new Map<number, PersWeaponWithWeapon[]>();
    for (const pw of pers.weapons) {
      if (!pw.weaponId || !isPlain(pw)) continue;
      const list = byWeaponId.get(pw.weaponId) ?? [];
      list.push(pw);
      byWeaponId.set(pw.weaponId, list);
    }

    const used = new Set<number>();
    const out: Array<
      | { kind: "single"; pw: PersWeaponWithWeapon }
      | { kind: "group"; pw: PersWeaponWithWeapon; count: number }
    > = [];

    for (const pw of pers.weapons) {
      if (used.has(pw.persWeaponId)) continue;

      const group = pw.weaponId ? byWeaponId.get(pw.weaponId) : null;
      if (group && group.length > 3) {
        for (const g of group) used.add(g.persWeaponId);
        out.push({ kind: "group", pw: group[0], count: group.length });
        continue;
      }

      used.add(pw.persWeaponId);
      out.push({ kind: "single", pw });
    }

    return out;
  }, [pers.weapons]);

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
            weaponRows.map((row) => {
              const pw = row.pw;
              const qty = row.kind === "group" ? row.count : 1;
              return (
              <div 
                key={row.kind === "group" ? `group-${pw.weaponId}` : pw.persWeaponId}
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-slate-800/40 hover:bg-slate-800/60 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-50 flex items-center gap-2">
                    <span className="truncate">{pw.overrideName || (weaponTranslations[pw.weapon?.name as keyof typeof weaponTranslations] || pw.weapon?.name)}</span>
                    {qty > 1 && (
                      <span className="text-[10px] bg-white/5 text-slate-200 px-1.5 py-0.5 rounded border border-white/10 flex-shrink-0">
                        x{qty}
                      </span>
                    )}
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
                      disabled={isPending}
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
            );
            })
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
            {pers.armors.filter(pa => pa.armor?.armorType !== 'SHIELD').length > 0 ? (
              pers.armors.filter(pa => pa.armor?.armorType !== 'SHIELD')
                .sort((a, b) => (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0))
                .map((pa) => (
                <div 
                  key={pa.persArmorId}
                  onClick={async () => {
                    if (pa.equipped || isReadOnly) return;
                    const res = await updateArmor(pa.persArmorId, { equipped: true });
                    if (res.success) {
                      toast.success(`Екіпіровано: ${pa.overrideName || pa.armor?.name || "Обладунок"}`);
                      router.refresh();
                    } else {
                      toast.error(res.error);
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition overflow-hidden ${
                    !isReadOnly && !pa.equipped ? 'cursor-pointer hover:bg-slate-800/80 hover:scale-[1.01]' : ''
                  } ${
                    pa.equipped 
                      ? 'bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                      : 'bg-slate-800/40 border-white/5 opacity-70 hover:opacity-100'
                  } ${
                    removingArmorIds.has(pa.persArmorId) ? "opacity-0 translate-x-4 max-h-0 py-0 border-transparent" : "opacity-100 translate-x-0"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-50 flex items-center gap-2">
                      {pa.overrideName || armorTranslations[pa.armor?.name as keyof typeof armorTranslations] || pa.armor?.name || "Кастомний обладунок"}
                      {pa.equipped && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">Активний</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {armorTypeTranslations[pa.armor?.armorType as keyof typeof armorTypeTranslations] || pa.armor?.armorType}
                      {!!pa.miscACBonus && pa.miscACBonus !== 0 && ` • ${formatModifier(pa.miscACBonus)} бонус`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 ml-2">
                    <div className="text-center mr-2">
                      <div className="text-[10px] uppercase font-bold text-slate-500 line-height-none mb-0.5">баз. КБ</div>
                      <div className="text-xl font-black text-slate-50 leading-none">
                        {getDisplayedArmorBaseAC(pa as PersArmorWithArmor)}
                      </div>
                    </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-indigo-400 transition-colors"
                        disabled={isPending}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedArmor(pa as PersArmorWithArmor);
                        }}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>

                      <Button 
                        variant="ghost" 
                        size={confirmDeleteArmorId === pa.persArmorId ? "default" : "icon"} 
                        className={`h-8 transition-all duration-300 ${
                          confirmDeleteArmorId === pa.persArmorId 
                            ? "text-red-500 bg-red-500/10 px-2 w-auto gap-1 border border-red-500/30" 
                            : "text-slate-500 hover:text-red-400 w-8"
                        }`}
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirmDeleteArmorId === pa.persArmorId) {
                            startTransition(async () => {
                              const res = await deleteArmor(pa.persArmorId);
                              if (res.success) {
                                setRemovingArmorIds((prev) => new Set([...prev, pa.persArmorId]));
                                setTimeout(() => {
                                  toast.success("Обладунок видалено");
                                  router.refresh();
                                }, 300);
                              } else {
                                toast.error(res.error);
                              }
                            });
                          } else {
                            setConfirmDeleteArmorId(pa.persArmorId);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        {confirmDeleteArmorId === pa.persArmorId && (
                          <span className="text-[10px] font-bold uppercase">Впевнені?</span>
                        )}
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 text-sm">Обладунки не додані</div>
            )}
          </div>

            {/* Proficiency Status & Shield Toggle */ }
          <div className="space-y-2">
            {wearsShield && (
              <div className="flex justify-end px-1">
                 {hasShieldProficiency ? (
                    <span className="text-[11px] flex items-center gap-1.5 text-emerald-400 font-medium tracking-wide uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                       Є володіння щитами
                    </span>
                  ) : (
                    <span className="text-[11px] flex items-center gap-1.5 text-amber-400 font-medium tracking-wide uppercase bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                       Немає володіння щитами
                    </span>
                  )}
              </div>
            )}
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${wearsShield ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <Label className="font-bold text-slate-50 flex items-center gap-2">
                    Використовувати щит
                  </Label>
                  <p className="text-xs text-slate-400">
                    Додає +2 до КБ (та бонуси)
                  </p>
                </div>
              </div>
              <Switch 
                checked={wearsShield} 
                onCheckedChange={!isReadOnly ? handleShieldToggle : undefined}
                disabled={isReadOnly}
              />
            </div>

            {showRaceStaticAcBonusToggle && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${raceStaticAcBonus ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="font-bold text-slate-50 flex items-center gap-2">
                      Бонус раси до КБ
                    </Label>
                    <p className="text-xs text-slate-400">
                      Додає {configuredRaceStaticBonus >= 0 ? "+" : ""}{configuredRaceStaticBonus} до КБ
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!raceStaticAcBonus}
                  onCheckedChange={!isReadOnly ? handleRaceStaticAcBonusToggle : undefined}
                  disabled={isReadOnly}
                />
              </div>
            )}
          </div>
        </CardContent>

      </Card>

      {/* Magic Items Section */}
      <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-violet-300 uppercase tracking-wider">
            <Sparkles className="w-5 h-5" />
            Магічні предмети
          </CardTitle>
          <div className="flex items-center gap-1">
            {!isReadOnly && <AddMagicItemDialog persId={pers.persId} persName={pers.name} />}
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-0">
           {magicItems.length > 0 ? (
             magicItems.map(pmi => (
               <MagicItemRow 
                 key={pmi.persMagicItemId} 
                 pmi={pmi} 
                 isReadOnly={isReadOnly} 
                 isRemoving={removingMagicItemIds.has(pmi.persMagicItemId)}
                 onSelect={() => setSelectedMagicItem(pmi.magicItem)}
                 onDelete={async () => {
                   setRemovingMagicItemIds(prev => new Set(prev).add(pmi.persMagicItemId));
                   setTimeout(async () => {
                       const res = await deleteMagicItem(pmi.persMagicItemId);
                       if (res.success) {
                         toast.success("Предмет видалено");
                         router.refresh();
                       } else {
                         setRemovingMagicItemIds(prev => {
                             const n = new Set(prev);
                             n.delete(pmi.persMagicItemId);
                             return n;
                         });
                         toast.error(res.error);
                       }
                   }, 300);
                 }}
                 onUpdate={async (updates) => {
                    const res = await updateMagicItem(pmi.persMagicItemId, updates);
                    if (res.success) {
                       toast.success(updates.isEquipped !== undefined ? (updates.isEquipped ? "Екіпіровано" : "Знято") : (updates.isAttuned ? "Налаштовано" : "Налаштування скасовано"));
                       router.refresh();
                    } else {
                       toast.error(res.error);
                    }
                 }}
               />
             ))
           ) : (
             <div className="text-center py-6 text-slate-500 text-sm">Магічні предмети не додані</div>
           )}
        </CardContent>
      </Card>

      {/* Modals */}
      <MagicItemInfoModal 
          item={selectedMagicItem} 
          open={!!selectedMagicItem} 
          onOpenChange={(val) => !val && setSelectedMagicItem(null)} 
      />
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

