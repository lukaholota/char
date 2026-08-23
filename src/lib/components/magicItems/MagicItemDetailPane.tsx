"use client";

import { Badge } from "@/components/ui/badge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

export type MagicItemDetail = {
  magicItemId: number;
  name: string;
  engName: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  description: string;
  shortDescription?: string | null;
  typeLineEng?: string | null;
  attunementConditionEng?: string | null;
  isCursed?: boolean;
  isConsumable?: boolean;
  bonusToAC?: number | null;
  bonusToRangedDamage?: number | null;
  bonusToSavingThrows?: unknown;
  noArmorOrShieldForACBonus?: boolean | null;
  ruleset?: string;
  givesSpells?: {
    spellId: number;
    name: string;
    engName: string;
    level: number;
  }[];
};

interface Props {
  item: MagicItemDetail;
  isEmbedMode?: boolean;
}

const rarityLabel = (rarity: string) => itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
const typeLabel = (type: string) => magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;

export function MagicItemDetailPane({ item, isEmbedMode, className }: Props & { className?: string }) {
  const is2024 = item.ruleset === "RULES_2024";

  const savingThrowsBonus =
    typeof item.bonusToSavingThrows === "number"
      ? item.bonusToSavingThrows
      : typeof item.bonusToSavingThrows === "string" && item.bonusToSavingThrows.trim() !== "" && !Number.isNaN(Number(item.bonusToSavingThrows))
        ? Number(item.bonusToSavingThrows)
        : null;

  return (
    <div
      className={cn(
        "glass-card border border-white/10 p-4 backdrop-blur-xl sm:p-6 lg:max-w-3xl lg:mx-auto rounded-2xl",
        is2024
          ? "bg-slate-950/60 shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20"
          : "bg-slate-950/15 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10",
        isEmbedMode ? "h-full overflow-y-auto" : "",
        className || ""
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2
            className={cn(
              "font-sans text-xl font-semibold uppercase tracking-[0.16em] text-transparent bg-clip-text break-words whitespace-normal text-balance leading-tight",
              is2024
                ? "bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400"
                : "bg-gradient-to-r from-teal-400 to-violet-400"
            )}
          >
            {item.name}
          </h2>
          {is2024 && (
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              2024
            </span>
          )}
        </div>
        {item.engName && item.engName !== item.name && (
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide">
            {item.engName}
          </p>
        )}
        {item.typeLineEng && (
          <p className="text-[11px] text-slate-500 italic mt-0.5">
            {item.typeLineEng}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 p-3 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-slate-300">{typeLabel(item.itemType)}</span>
            <span className="text-slate-500">•</span>
            <span className={cn("italic", ["RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"].includes(item.rarity) ? "text-amber-400 font-medium" : "text-slate-300")}>
              {rarityLabel(item.rarity)}
            </span>
            {item.requiresAttunement && (
              <>
                <span className="text-slate-500">•</span>
                <span className={is2024 ? "text-amber-300/90" : "text-teal-300/80"}>
                  {item.attunementConditionEng ? `Налаштування (${item.attunementConditionEng})` : "Потребує налаштування"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid if any */}
      {(item.bonusToAC || item.bonusToRangedDamage || savingThrowsBonus !== null) && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {item.bonusToAC && (
            <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Бонус до КБ</div>
              <div className={cn("mt-1 text-lg font-bold", is2024 ? "text-amber-300" : "text-teal-300")}>+{item.bonusToAC}</div>
              {item.noArmorOrShieldForACBonus && <div className="text-[10px] text-slate-500 leading-tight mt-1">Тільки без броні/щита</div>}
            </div>
          )}
          {item.bonusToRangedDamage && (
            <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Рендж шкода</div>
              <div className={cn("mt-1 text-lg font-bold", is2024 ? "text-amber-300" : "text-teal-300")}>+{item.bonusToRangedDamage}</div>
            </div>
          )}
          {savingThrowsBonus !== null && (
            <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Рятівні кидки</div>
              <div className={cn("mt-1 text-lg font-bold", is2024 ? "text-amber-300" : "text-teal-300")}>+{savingThrowsBonus}</div>
            </div>
          )}
        </div>
      )}

      {/* Spells provided */}
      {item.givesSpells && item.givesSpells.length > 0 && (
        <div className="mt-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 p-3">
          <div className="text-xs text-violet-300 uppercase tracking-wider mb-2">Надає заклинання</div>
          <div className="flex flex-wrap gap-2">
            {item.givesSpells.map(spell => (
              <Badge key={spell.spellId} variant="secondary" className="bg-violet-500/20 text-violet-200 hover:bg-violet-500/30">
                {spell.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 glass-panel rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <FormattedDescription content={item.description} className="text-slate-300 text-xs sm:text-sm leading-relaxed" />
      </div>

    </div>
  );
}
