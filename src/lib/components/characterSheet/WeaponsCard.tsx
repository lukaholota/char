"use client";

import { describeRollState } from "@/lib/logic/state-labels";
import { useMemo } from "react";
import { Settings2, Sword } from "lucide-react";
import { D20Icon } from "@/lib/components/icons/D20Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PersWeaponWithWeapon, PersWithRelations } from "@/lib/actions/pers";
import {
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  calculateWeaponDamageDice,
  findWeaponDamageType,
  findWeaponRange,
} from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { formatDiceUkr } from "@/lib/logic/equipment-stats";
import { damageTypeTranslations, weaponTranslations } from "@/lib/refs/translation";
import { WeaponMasteryInfoButton } from "./WeaponMasteryInfoButton";
import { findAttacksPerAction } from "@/rules/attacks-per-action";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { buildWeaponRollContext } from "@/lib/components/dice/roll-contexts";
import { ExtraDiceMark } from "@/lib/components/dice/ExtraDiceMark";
import AddWeaponDialog from "./AddWeaponDialog";
import { CrimsonRiteDialog } from "./CrimsonRiteDialog";
import { findWeaponCrimsonRite } from "@/lib/logic/crimson-rite-sheet";
import { readStateEffects } from "@/lib/logic/bonus-calculator";

type Props = {
  pers: PersWithRelations;
  isReadOnly?: boolean;
  /// Кнопка налаштування зброї глухне, поки слайд чекає на іншу серверну дію, — так було до виносу.
  isPending?: boolean;
  onCustomize: (persWeapon: PersWeaponWithWeapon) => void;
};

/**
 * Список зброї з атаками. Винесено з `CombatSlide` разом із бонусами й групуванням однакових
 * рядків: слайд і без цього перевалює за межу декомпозиції, а сама секція самодостатня.
 */
export function WeaponsCard({ pers, isReadOnly, isPending, onCustomize }: Props) {
  const openRoll = useDiceUIStore((state) => state.openRoll);

  // Додаткова атака з кількох класів не складається — правило рахує максимум по виданих фічах.
  const attacksPerAction = findAttacksPerAction(
    pers.ruleset,
    (pers.features ?? []).map((entry) => entry.feature.engName),
  );

  const getAttackBonus = (pw: PersWeaponWithWeapon) => calculateWeaponAttackBonus(pers, pw);

  const getDamageBonus = (pw: PersWeaponWithWeapon) => calculateWeaponDamageBonus(pers, pw);

  const attackState = describeRollState(pers, { kind: "attack" }, "ATTACK");

  const findWeaponName = (pw: PersWeaponWithWeapon) =>
    pw.overrideName ||
    (pw.weapon?.name === "UNARMED_STRIKE" && readStateEffects(pers)?.unarmedStrike ? "Хижі удари" : null) ||
    (weaponTranslations[pw.weapon?.name as keyof typeof weaponTranslations] || pw.weapon?.name) ||
    "Зброя";

  const triggerWeaponRollMode = (pw: PersWeaponWithWeapon) => {
    const weaponName = findWeaponName(pw);
    const rite = findWeaponCrimsonRite(pers, pw);
    const riteDie = rite ? [{ sides: Number(rite.dice.split("d")[1]), sign: 1 as const, label: rite.rite.name }] : [];

    openRoll(
      buildWeaponRollContext({
        weaponName,
        attackBonus: getAttackBonus(pw),
        damageBonus: getDamageBonus(pw),
        damageDice: String(calculateWeaponDamageDice(pers, pw) || "1d4"),
        attackState,
        damageExtraDice: [...describeRollState(pers, { kind: "attack" }, "WEAPON_DAMAGE").extraDice, ...riteDie],
      }),
    );
  };

  const masteryByWeaponId = useMemo(
    () => new Map((pers.pers_weapon_mastery ?? []).map((entry) => [entry.weapon_id, entry.weapon.mastery])),
    [pers.pers_weapon_mastery],
  );

  const weaponRows = useMemo(() => {
    const isPlain = (pw: PersWeaponWithWeapon) => {
      const hasOverrideName = !!pw.overrideName && pw.overrideName.trim() !== "";
      const hasCustomDice = !!pw.customDamageDice;
      const hasCustomAbility = !!pw.customDamageAbility;
      const hasCustomBonus = typeof pw.customDamageBonus === "number" ? pw.customDamageBonus !== 0 : !!pw.customDamageBonus;
      const hasAttackBonus = typeof (pw as any).attackBonus === "number" ? (pw as any).attackBonus !== 0 : false;
      const hasOverrides = pw.overrideDamageType !== null || pw.overrideNormalRange !== null || pw.overrideLongRange !== null;
      return !hasOverrideName && !hasCustomDice && !hasCustomAbility && !hasCustomBonus && !hasAttackBonus && !hasOverrides && !pw.isMagical && !pw.crimsonRiteFeatureId;
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
    <Card className="bg-slate-900/50 border-white/10 overflow-hidden">
      <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-white/5 bg-white/5">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-300 uppercase tracking-wider">
          <Sword className="w-5 h-5" />
          Зброя та атаки
          {attacksPerAction !== null && attacksPerAction > 1 && (
            <span className="text-[10px] font-bold normal-case tracking-normal px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
              {attacksPerAction} атаки за дію
            </span>
          )}
        </CardTitle>
        {!isReadOnly && <AddWeaponDialog persId={pers.persId} ruleset={pers.ruleset} />}
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
                  <span className="truncate">{findWeaponName(pw)}</span>
                  {qty > 1 && (
                    <span className="text-[10px] bg-white/5 text-slate-200 px-1.5 py-0.5 rounded border border-white/10 flex-shrink-0">
                      x{qty}
                    </span>
                  )}
                  {pw.isMagical && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex-shrink-0">MAG</span>}
                  {pw.weaponId && masteryByWeaponId.has(pw.weaponId) && (
                    <WeaponMasteryInfoButton
                      mastery={masteryByWeaponId.get(pw.weaponId)}
                      className="text-[10px] bg-amber-500/15 text-amber-200 px-1.5 py-0.5 rounded border border-amber-400/30 flex-shrink-0"
                    />
                  )}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="text-amber-400 font-bold text-sm">
                    {formatDiceUkr(calculateWeaponDamageDice(pers, pw))}{formatModifier(getDamageBonus(pw))}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="truncate">{formatWeaponDamageType(pw)}</span>
                  {findWeaponRange(pw) && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="whitespace-nowrap">{formatWeaponRange(pw)}</span>
                    </>
                  )}
                </div>
                <WeaponRiteLine pers={pers} pw={pw} />
              </div>

              <div className="flex items-center gap-3 sm:gap-4 ml-2">
                {!isReadOnly && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerWeaponRollMode(pw);
                      }}
                      title="Кинути кубики зброї"
                    >
                      <D20Icon className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-xl font-black text-slate-50 leading-none">
                    {formatModifier(getAttackBonus(pw))}
                    <ExtraDiceMark dice={attackState.extraDice} className="ml-1 text-xs" />
                  </div>
                  <div className="text-[9px] uppercase font-bold text-slate-500 mt-0.5">влучання</div>
                </div>
                {!isReadOnly && <CrimsonRiteDialog pers={pers} pw={pw} weaponName={findWeaponName(pw)} />}
                {!isReadOnly && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-500 hover:text-indigo-400 transition-colors"
                    disabled={isPending}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCustomize(pw);
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
  );
}

export default WeaponsCard;

/// Активний Багряний обряд: зброя магічна й бʼє ще кубиком гемокрафту обраного типу.
function WeaponRiteLine({ pers, pw }: { pers: PersWithRelations; pw: PersWeaponWithWeapon }) {
  const rite = findWeaponCrimsonRite(pers, pw);
  if (!rite) return null;
  const damageType = (damageTypeTranslations[rite.damageType] ?? rite.damageType).toLowerCase();
  return (
    <div className="text-xs text-rose-300 mt-0.5 truncate">
      +{formatDiceUkr(rite.dice)} {damageType} · {rite.rite.name}
    </div>
  );
}

function formatWeaponDamageType(pw: PersWeaponWithWeapon): string {
  const damageType = findWeaponDamageType(pw);
  return damageType ? damageTypeTranslations[damageType] ?? damageType : "";
}

function formatWeaponRange(pw: PersWeaponWithWeapon): string {
  const range = findWeaponRange(pw);
  if (!range) return "";
  return range.long ? `${range.normal}/${range.long} фт` : `${range.normal} фт`;
}
