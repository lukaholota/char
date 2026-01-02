"use client";

import { Badge } from "@/components/ui/badge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";

export type MagicItemDetail = {
  magicItemId: number;
  name: string;
  engName: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  description: string;
  shortDescription?: string | null;
  bonusToAC?: number | null;
  bonusToRangedDamage?: number | null;
  bonusToSavingThrows?: unknown;
  noArmorOrShieldForACBonus?: boolean | null;
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
  const savingThrowsBonus =
    typeof item.bonusToSavingThrows === "number"
      ? item.bonusToSavingThrows
      : typeof item.bonusToSavingThrows === "string" && item.bonusToSavingThrows.trim() !== "" && !Number.isNaN(Number(item.bonusToSavingThrows))
        ? Number(item.bonusToSavingThrows)
        : null;

  return (
    <div className={`glass-card border border-white/10 bg-slate-950/15 p-4 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10 backdrop-blur-xl sm:p-6 lg:max-w-3xl lg:mx-auto ${isEmbedMode ? "h-full overflow-y-auto" : ""} ${className || ""}`}>
      <div className="min-w-0">
        <h2 className="font-sans text-xl font-semibold uppercase tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400 break-words whitespace-normal text-balance leading-tight">
          {item.name}
        </h2>
        {item.engName && item.engName !== item.name && (
            <p className="mt-1 text-xs text-slate-500 font-medium tracking-wide">
                {item.engName}
            </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 p-3 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-slate-300">{typeLabel(item.itemType)}</span>
            <span className="text-slate-500">•</span>
            <span className={`italic ${["RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"].includes(item.rarity) ? "text-amber-400" : "text-slate-300"}`}>
              {rarityLabel(item.rarity)}
            </span>
            {item.requiresAttunement && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-teal-300/80">Потребує налаштування</span>
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
              <div className="mt-1 text-lg font-bold text-teal-300">+{item.bonusToAC}</div>
              {item.noArmorOrShieldForACBonus && <div className="text-[10px] text-slate-500 leading-tight mt-1">Тільки без броні/щита</div>}
            </div>
          )}
          {item.bonusToRangedDamage && (
            <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Рендж шкода</div>
              <div className="mt-1 text-lg font-bold text-teal-300">+{item.bonusToRangedDamage}</div>
            </div>
          )}
          {savingThrowsBonus !== null && (
            <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-3 glass-panel">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Рятівні кидки</div>
              <div className="mt-1 text-lg font-bold text-teal-300">+{savingThrowsBonus}</div>
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
        <FormattedDescription content={item.description} className="text-slate-300" />
      </div>

    </div>
  );
}
