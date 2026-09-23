"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeatData, FeatCategory } from "@/lib/featsData";
import { featCategoryTranslations } from "@/lib/refs/translation";
import { cn } from "@/lib/utils";

const CATEGORY_CHIPS: Array<{ key: FeatCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "Всі" },
  { key: "GENERAL", label: "Загальні" },
  { key: "ORIGIN", label: "Походження" },
  { key: "EPIC_BOON", label: "Епічні" },
  { key: "FIGHTING_STYLE", label: "Бойові стилі" },
];

type Props = {
  availableFeats: FeatData[];
  acquiredFeatIds: Set<number>;
  isSubmitting: number | null;
  onAddFeat: (feat: FeatData) => void;
  onOpenDetail: (feat: FeatData) => void;
};

export function FeatCatalogTab({
  availableFeats,
  acquiredFeatIds,
  isSubmitting,
  onAddFeat,
  onOpenDetail,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FeatCategory | "ALL">("ALL");
  const categoryChips = CATEGORY_CHIPS.filter((tab) => tab.key === "ALL" || availableFeats.some((feat) => feat.category === tab.key));
  const activeCategory = categoryChips.some((tab) => tab.key === selectedCategory) ? selectedCategory : "ALL";

  const filteredFeats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return availableFeats.filter((f) => {
      if (activeCategory !== "ALL" && f.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const nameLower = f.name.toLowerCase();
      const engLower = f.engName.toLowerCase();
      const descLower = f.description.toLowerCase();
      return nameLower.includes(q) || engLower.includes(q) || descLower.includes(q);
    });
  }, [availableFeats, searchQuery, activeCategory]);

  return (
    <div className="space-y-3">
      {/* Search & Categories */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук у каталозі рис…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {categoryChips.length > 1 && <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {categoryChips.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                activeCategory === tab.key
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>}
      </div>

      {/* Catalog Feats List */}
      <div className="space-y-2 h-[50vh] overflow-y-auto pr-1">
        {filteredFeats.map((feat) => {
          const isAcquired = acquiredFeatIds.has(feat.featId);
          const catLabel = feat.category
            ? featCategoryTranslations[feat.category as keyof typeof featCategoryTranslations] || feat.category
            : null;

          return (
            <div
              key={feat.featId}
              className={cn(
                "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
                isAcquired
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onOpenDetail(feat)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-100">
                    {feat.name}
                  </span>
                  {feat.engName && (
                    <span className="text-xs text-slate-400 italic truncate">
                      ({feat.engName})
                    </span>
                  )}
                  {catLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-amber-300/90 border border-white/10">
                      {catLabel}
                    </span>
                  )}
                </div>
                {feat.prerequisite && (
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Вимога: {feat.prerequisite}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpenDetail(feat)}
                  className="h-8 px-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Опис
                </Button>

                {isAcquired && !feat.isRepeatable ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" /> Набуто
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={isSubmitting === feat.featId}
                    onClick={() => onAddFeat(feat)}
                    className="h-8 px-3 gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold"
                  >
                    {isSubmitting === feat.featId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Додати
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
