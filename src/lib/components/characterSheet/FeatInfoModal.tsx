"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { featCategoryTranslations, featTranslations } from "@/lib/refs/translation";

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

type FeatInfoData = {
  name: string;
  engName?: string;
  description: string;
  category?: string | null;
  prerequisite?: string | null;
  source?: string;
  isRepeatable?: boolean;
};

type Props = {
  feat: FeatInfoData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeatInfoModal({ feat, open, onOpenChange }: Props) {
  if (!feat) return null;

  const translatedName = translateFeatName(feat.name);
  const categoryLabel = feat.category
    ? featCategoryTranslations[feat.category as keyof typeof featCategoryTranslations] || feat.category
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 mr-6">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-100">
                {translatedName}
              </DialogTitle>
              {feat.engName && (
                <div className="text-xs text-slate-400 italic mt-0.5">
                  {feat.engName}
                </div>
              )}
            </div>
            {categoryLabel && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {categoryLabel}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {feat.prerequisite && (
            <div className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg p-2.5">
              <span className="font-semibold text-slate-400">Вимога: </span>
              {feat.prerequisite}
            </div>
          )}

          {feat.isRepeatable && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
              ✓ Рису можна обирати повторно
            </div>
          )}

          {feat.description ? (
            <div className="glass-panel rounded-xl border border-slate-800/70 p-4">
              <FormattedDescription content={feat.description} className="text-slate-200/90" />
            </div>
          ) : null}

          {feat.source && (
            <div className="text-[11px] text-slate-500 text-right">
              Джерело: {feat.source}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
