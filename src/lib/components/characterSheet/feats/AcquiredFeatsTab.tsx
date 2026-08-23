"use client";

import { Award, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { featCategoryTranslations, featTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

function translateFeatName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const normalized = raw
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return featTranslations[raw as keyof typeof featTranslations] ??
    featTranslations[raw.toUpperCase() as keyof typeof featTranslations] ??
    featTranslations[normalized as keyof typeof featTranslations] ??
    raw;
}

export type CharacterFeatItem = {
  persFeatId?: number;
  featId: number;
  feat?: {
    featId?: number;
    name: string;
    description: string;
    category?: string | null;
    source?: string;
  };
  name?: string;
  description?: string;
  choices?: Array<{
    choiceOption?: {
      name: string;
      description?: string;
    };
  }>;
};

type Props = {
  persFeats: CharacterFeatItem[];
  isReadOnly?: boolean;
  isSubmitting: number | null;
  onRemoveFeat: (featId: number, name: string) => void;
  onSwitchToCatalog: () => void;
};

export function AcquiredFeatsTab({
  persFeats,
  isReadOnly,
  isSubmitting,
  onRemoveFeat,
  onSwitchToCatalog,
}: Props) {
  if (persFeats.length === 0) {
    return (
      <div className="py-12 text-center">
        <Award className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-semibold text-slate-300">Немає набутих рис</p>
        <p className="text-xs text-slate-500 mt-1">Персонаж поки не має обраних рис.</p>
        {!isReadOnly && (
          <Button
            size="sm"
            onClick={onSwitchToCatalog}
            className="mt-4 gap-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
          >
            <Plus className="w-4 h-4" /> Додати першу рису
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {persFeats.map((pf, idx) => {
        const featId = pf.featId || pf.feat?.featId || idx;
        const rawName = pf.feat?.name || pf.name || "Риса";
        const translatedName = translateFeatName(rawName);
        const desc = pf.feat?.description || pf.description || "";
        const category = pf.feat?.category;
        const catLabel = category
          ? featCategoryTranslations[category as keyof typeof featCategoryTranslations] || category
          : null;

        return (
          <div
            key={pf.persFeatId || featId}
            className="glass-panel p-3.5 rounded-xl border border-white/10 hover:border-white/20 transition flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-100">{translatedName}</h4>
                  {catLabel && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {catLabel}
                    </span>
                  )}
                </div>
              </div>

              {!isReadOnly && pf.featId && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSubmitting === pf.featId}
                  onClick={() => onRemoveFeat(pf.featId, translatedName)}
                  className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 shrink-0"
                >
                  {isSubmitting === pf.featId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>

            {desc && (
              <div className="text-xs text-slate-300/90 line-clamp-3">
                <FormattedDescription content={desc} />
              </div>
            )}

            {pf.choices && pf.choices.length > 0 && (
              <div className="pt-1 border-t border-white/5 flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-slate-400">Обрано:</span>
                {pf.choices.map((c, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-white/5 text-amber-300 border border-white/10 font-medium"
                  >
                    {c.choiceOption?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
