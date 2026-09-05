"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { magicItemTypeTranslations, itemRarityTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import type { MagicItemWithSpells } from "@/lib/magicItemsData";

/// Предмет приходить пропом уже знайденим на сервері: коли модалка шукала його сама,
/// у браузер їхав увесь `magicItems.json` — 2,1 МіБ (docs/STATE.md дефект №9).

function typeLabel(type: string) {
  return magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;
}

function rarityLabel(rarity: string) {
  return itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
}

function MagicItemModalCard({ item, onClose }: { item: MagicItemWithSpells; onClose: () => void }) {
  return (
    <div className="glass-card border border-white/10 bg-slate-950/60 p-3 shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20 backdrop-blur-xl sm:p-5 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex-1 min-w-0 font-sans text-base sm:text-lg font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 truncate">
          {item.name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="glass-panel inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-amber-300"
          aria-label="Закрити"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="text-slate-300">{typeLabel(item.itemType)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{rarityLabel(item.rarity)}</span>
          </div>

          <div className="min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs text-amber-300 truncate">
            {item.requiresAttunement ? "Потребує налаштування" : "Без налаштування"}
          </div>
        </div>
      </div>

      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 max-h-[35vh] overflow-y-auto max-w-full overflow-x-hidden">
        <FormattedDescription content={item.description} className="text-slate-300 text-xs sm:text-[13px] break-words" />
      </div>
    </div>
  );
}

export function MagicItemModal({ item }: { item: MagicItemWithSpells | null }) {
  const router = useRouter();

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    if (!item) router.back();
  }, [item, router]);

  if (!item) return null;

  return (
    <Dialog enableBackButtonClose={false} open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-h-[90vh] w-[92vw] max-w-xl overflow-y-auto overflow-x-hidden p-0 border-0 bg-transparent" 
        showClose={false}
      >
        <DialogTitle className="sr-only">{item.name}</DialogTitle>
        <MagicItemModalCard item={item} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}
