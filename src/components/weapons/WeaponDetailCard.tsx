"use client";

import type { WeaponData } from "@/lib/weaponsData";
import {
  weaponTypeTranslations,
  damageTypeTranslations,
  weaponPropertyTranslations,
  sourceTranslations,
} from "@/lib/refs/translation";
import { findWeaponMasteryDescription, formatWeaponMasteryLabel } from "@/lib/refs/weapon-mastery";
import { cn } from "@/lib/utils";
import { Sword, Crosshair, Target, ShieldAlert, Sparkles, Weight, Coins } from "lucide-react";
import { getWeaponVisual } from "@/components/catalogs/catalog-visuals";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";

const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  FINESSE: "При здійсненні атаки ви можете використовувати модифікатор Сили або Спритності для кидків атаки та шкоди.",
  LIGHT: "Легка зброя зручна для використання у другій руці під час бою двома зброями.",
  HEAVY: "Маленькі істоти мають перешкоду на кидки атак важкою зброєю.",
  REACH: "Ця зброя додає 5 футів до вашої досяжності при здійсненні атак.",
  THROWN: "Якщо зброя має властивість кидання, її можна метати для дальної атаки.",
  TWO_HANDED: "Ця зброя потребує двох рук для здійснення атаки.",
  VERSATILE: "Цю зброю можна використовувати однією або двома руками. При атаці двома руками вона завдає підвищеної шкоди.",
  AMMUNITION: "Ви можете використовувати цю зброю для дальної атаки лише за наявності відповідних боєприпасів.",
  LOADING: "Через час, необхідний для заряджання, ви можете зробити лише один постріл цією зброєю за дію, бонусну дію чи реакцію.",
  SPECIAL: "Зброя зі спеціальними правилами використання.",
};

export function WeaponDetailCard({
  weapon,
  is2024 = false,
}: {
  weapon: WeaponData;
  is2024?: boolean;
}) {
  const visual = getWeaponVisual(weapon.weaponType, weapon.isRanged);
  const Icon = visual.icon;
  const weaponTypeLabel = weaponTypeTranslations[weapon.weaponType] || weapon.weaponType;
  const damageTypeLabel = damageTypeTranslations[weapon.damageType] || weapon.damageType;
  const sourceLabel = sourceTranslations[weapon.source as keyof typeof sourceTranslations] || weapon.source;

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl",
        findAccentVariant(is2024, { prism: "shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10" })
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 via-prism-200 to-prism-500", arcane: "bg-gradient-to-r from-arcane-300 via-arcane-100 to-violet-300" })
              )}
            >
              {weapon.nameUa}
            </h1>
            {is2024 && (
              <EditionAccentChip edition="2024">2024</EditionAccentChip>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{weapon.engName}]</div>
        </div>

        {/* Source */}
        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border",
            findAccentVariant(is2024, { prism: "border-prism-500/30 bg-prism-500/10 text-prism-300", arcane: "border-arcane-500/30 bg-arcane-500/10 text-arcane-300" })
          )}
        >
          {sourceLabel}
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Шкода</div>
          <div className={cn("text-lg font-bold mt-0.5", findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" }))}>
            {weapon.damage || "-"}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{damageTypeLabel}</div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Категорія</div>
          <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
            {weaponTypeLabel}
          </div>
          <div className="text-[11px] text-slate-400">
            {weapon.isRanged ? "Дальня зброя" : "Ближня зброя"}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Дальність</div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            {weapon.normalRange ? `${weapon.normalRange}/${weapon.longRange || weapon.normalRange} фт` : "Ближній бій (5 фт)"}
          </div>
          <div className="text-[11px] text-slate-400">
            {weapon.versatileDamage ? `2-руч: ${weapon.versatileDamage}` : "Стандарт"}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Вага / Ціна</div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            {weapon.weight || "-"}
          </div>
          <div className="text-[11px] text-slate-400">
            {weapon.cost || "-"}
          </div>
        </div>
      </div>

      {/* 2024 Weapon Mastery Callout */}
      {is2024 && weapon.mastery && (
        <div className="mt-4 rounded-xl border border-prism-500/30 bg-prism-500/10 p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-prism-300">
              Майстерність зброї (Weapon Mastery): {formatWeaponMasteryLabel(weapon.mastery) ?? weapon.masteryNameUa ?? weapon.mastery}
            </span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
            {findWeaponMasteryDescription(weapon.mastery) ?? "Особлива тактична властивість майстерності зброї з правил 2024 року."}
          </p>
        </div>
      )}

      {/* Properties List */}
      <div className="mt-4 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Властивості зброї:
        </div>

        {weapon.properties.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-slate-900/30 p-3 text-xs text-slate-400">
            Зброя не має особливих властивостей.
          </div>
        ) : (
          <div className="grid gap-2">
            {weapon.properties.map((prop) => {
              const propKey = String(prop).toUpperCase();
              const label = weaponPropertyTranslations[propKey] || prop;
              const desc = PROPERTY_DESCRIPTIONS[propKey];

              return (
                <div key={propKey} className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                  <div className={cn("text-xs font-semibold", findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" }))}>
                    {label} [{propKey}]
                  </div>
                  {desc && (
                    <div className="mt-1 text-xs text-slate-300 leading-relaxed">
                      {desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
