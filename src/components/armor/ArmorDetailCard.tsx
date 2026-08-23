"use client";

import { ArmorData } from "@/lib/armorData";
import {
  armorTypeTranslations,
  sourceTranslations,
} from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldCheck, Weight, Coins, Clock, Footprints } from "lucide-react";
import { getArmorVisual } from "@/components/catalogs/catalog-visuals";

function formatAC(armor: ArmorData): string {
  if (armor.armorType === "SHIELD") {
    return "+2";
  }
  if (armor.abilityBonusType === "FULL") {
    return `${armor.baseAC} + Мод. СПР`;
  }
  if (armor.abilityBonusType === "MAX2") {
    return `${armor.baseAC} + Мод. СПР (макс. +2)`;
  }
  return `${armor.baseAC}`;
}

export function ArmorDetailCard({
  armor,
  is2024 = false,
}: {
  armor: ArmorData;
  is2024?: boolean;
}) {
  const visual = getArmorVisual(armor.armorType);
  const Icon = visual.icon;
  const armorTypeLabel = armorTypeTranslations[armor.armorType] || armor.armorType;
  const sourceLabel = sourceTranslations[armor.source as keyof typeof sourceTranslations] || armor.source;

  return (
    <div
      className={cn(
        "glass-card border border-white/10 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl break-words max-w-full overflow-hidden rounded-2xl",
        is2024
          ? "shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-transparent bg-clip-text",
                is2024
                  ? "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-500"
                  : "bg-gradient-to-r from-teal-300 via-teal-100 to-violet-300"
              )}
            >
              {armor.nameUa}
            </h1>
            {is2024 && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                2024
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">[{armor.engName}]</div>
        </div>

        {/* Source */}
        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium border",
            is2024
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-teal-500/30 bg-teal-500/10 text-teal-300"
          )}
        >
          {sourceLabel}
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Клас Броні (КБ)</div>
          <div className={cn("text-lg font-bold mt-0.5", is2024 ? "text-amber-300" : "text-teal-300")}>
            {formatAC(armor)}
          </div>
          <div className="text-[11px] text-slate-400 truncate">Базовий КБ: {armor.baseAC}</div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Тип обладунку</div>
          <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
            {armorTypeLabel}
          </div>
          <div className="text-[11px] text-slate-400">
            {armor.armorType === "SHIELD" ? "Щит" : "Обладунок"}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Вимога до Сили</div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            {armor.strengthReq ? `Сила ${armor.strengthReq}` : "Немає"}
          </div>
          <div className="text-[11px] text-slate-400">
            {armor.strengthReq ? "Швидкість -10 фт якщо нижче" : "Без обмежень"}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Непомітність</div>
          <div className={cn("text-sm font-semibold mt-1", armor.stealthDisadvantage ? "text-rose-400" : "text-emerald-400")}>
            {armor.stealthDisadvantage ? "Перешкода" : "Нормально"}
          </div>
          <div className="text-[11px] text-slate-400">
            {armor.stealthDisadvantage ? "Перешкода на Непомітність" : "Без перешкоди"}
          </div>
        </div>
      </div>

      {/* Secondary properties */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">Вага:</span>
          </div>
          <span className="text-xs font-semibold text-slate-100">{armor.weight}</span>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-medium text-slate-300">Вартість:</span>
          </div>
          <span className="text-xs font-semibold text-amber-300">{armor.cost}</span>
        </div>

        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3.5 flex items-center justify-between sm:col-span-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">Час надягання / зняття:</span>
          </div>
          <span className="text-xs font-semibold text-slate-200">{armor.donDoffTime}</span>
        </div>
      </div>

      {/* Rules description section */}
      <div className="mt-4 rounded-xl border border-white/5 bg-slate-900/30 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Правила носіння:
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {armor.armorType === "SHIELD"
            ? "Щит надає бонус +2 до КБ. Ви можете отримувати бонус лише від одного щита одночасно. Щоб ефективно використовувати щит, персонаж повинен мати відповідне володіння щитами."
            : armor.armorType === "HEAVY"
            ? "Важкі обладунки забезпечують найкращий захист, але обмежують рухливість. Вони не додають модифікатор Спритності до КБ. Якщо ваша Сила нижча за зазначену вимогу, ваша швидкість зменшується на 10 футів."
            : armor.armorType === "MEDIUM"
            ? "Середні обладунки забезпечують баланс між захистом і рухливістю. До базового КБ додається ваш модифікатор Спритності, але не більше ніж +2."
            : "Легкі обладунки забезпечують захист, не сковуючи рухів спритного бійця. До базового КБ додається повний модифікатор вашої Спритності."}
        </p>
      </div>
    </div>
  );
}
