"use client";

import { Badge } from "@/components/ui/badge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";
import { EditionAccentChip } from "@/components/ui/EditionAccent";
import { translateAttunementCondition } from "./attunement-condition";
import { MagicItemEffectsSection } from "./MagicItemEffectsSection";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { buildMediaImageUrl } from "@/lib/media-url";
import { isHomebrewItemEngName } from "@/lib/logic/homebrew-catalog";
import type { ReactNode } from "react";

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
  weaponBonus?: number | null;
  isMundane?: boolean;
  weaponProfile?: unknown;
  imageKey?: string | null;
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
  sheetStatus?: ReactNode;
  /// Лише на листі: кубики в описі стають кнопками кидка від героя.
  hasRollChips?: boolean;
}

const rarityLabel = (rarity: string) => itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
const typeLabel = (type: string) => magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;

export function MagicItemDetailPane({ item, isEmbedMode, sheetStatus, hasRollChips, className }: Props & { className?: string }) {
  const is2024 = item.ruleset === "RULES_2024";

  return (
    <div
      className={cn(
        "glass-card border border-white/10 p-4 backdrop-blur-xl sm:p-6 lg:max-w-3xl lg:mx-auto rounded-2xl",
        findAccentVariant(is2024, { prism: "bg-slate-950/60 shadow-[0_0_30px_rgba(192,74,224,0.08)] ring-1 ring-prism-500/20", arcane: "bg-slate-950/15 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10" }),
        isEmbedMode ? "h-full overflow-y-auto" : "",
        className || ""
      )}
    >
      <div className="flex items-center gap-3">
      {item.imageKey && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900 sm:h-24 sm:w-24">
          <ContentImage src={buildMediaImageUrl(item.imageKey, "full")} alt="" provenance="manual" fill sizes="96px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2
            className={cn(
              "font-sans text-xl font-semibold uppercase tracking-[0.16em] text-transparent bg-clip-text break-words whitespace-normal text-balance leading-tight",
              findAccentVariant(is2024, { prism: "bg-gradient-to-r from-prism-300 via-prism-100 to-prism-400", arcane: "bg-gradient-to-r from-arcane-400 to-violet-400" })
            )}
          >
            {item.name}
          </h2>
          {is2024 && (
            <EditionAccentChip edition="2024">2024</EditionAccentChip>
          )}
        </div>
        {item.engName && item.engName !== item.name && !isHomebrewItemEngName(item.engName) && (
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide">
            {item.engName}
          </p>
        )}
        {item.typeLineEng && (
          <p className="text-[11px] text-slate-500 italic mt-0.5">
            {item.typeLineEng}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-slate-300">{typeLabel(item.itemType)}</span>
          <span className="text-slate-500">•</span>
          <span className={cn("italic", ["RARE", "VERY_RARE", "LEGENDARY", "ARTIFACT"].includes(item.rarity) ? "text-amber-400 font-medium" : "text-slate-300")}>
            {item.isMundane ? "Звичайний предмет" : rarityLabel(item.rarity)}
          </span>
          {item.requiresAttunement && (
            <>
              <span className="text-slate-500">•</span>
              <span className={findAccentVariant(is2024, { prism: "text-prism-300/90", arcane: "text-arcane-300/80" })}>
                {item.attunementConditionEng
                  ? `Налаштування: ${translateAttunementCondition(item.attunementConditionEng) ?? `умова в оригіналі — ${item.attunementConditionEng}`}`
                  : "Потребує налаштування"}
              </span>
            </>
          )}
        </div>
      </div>
      </div>

      <MagicItemEffectsSection item={item} sheetStatus={sheetStatus} />

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
        <FormattedDescription content={item.description} rollsForItem={hasRollChips ? item.name : undefined} className="text-slate-300 text-xs sm:text-sm leading-relaxed" />
      </div>

    </div>
  );
}
