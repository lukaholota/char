"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getMagicItemById, type MagicItemWithSpells } from "@/lib/magicItemsData";
import { magicItemTypeTranslations, itemRarityTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { Badge } from "@/components/ui/badge";

function typeLabel(type: string) {
    return magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;
}

function rarityLabel(rarity: string) {
    return itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
}

// Modal content component
function MagicItemModalCard({ item, onClose }: { item: MagicItemWithSpells; onClose: () => void }) {
  return (
    <div className="glass-card border border-white/10 bg-slate-950/30 p-3 shadow-[0_0_30px_rgba(45,212,191,0.08)] ring-1 ring-white/10 backdrop-blur-xl sm:p-5 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
            <h2 className="font-sans text-base sm:text-lg font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400 truncate max-w-[95%]">
            {item.name}
            </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="glass-panel inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-teal-300"
          aria-label="Закрити"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
         <div className="flex items-center justify-between gap-2">
           <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
             <span className="text-slate-300">{typeLabel(item.itemType)}</span>
             <span className="text-slate-500">•</span>
             <span className={`italic ${["RARE", "VERY_RARE", "LEGENDARY"].includes(item.rarity) ? "text-amber-400" : "text-slate-300"}`}>
                 {rarityLabel(item.rarity)}
             </span>
           </div>
           {item.requiresAttunement && (
             <div className="min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs text-teal-300/80 truncate">
               Потребує налаштування
             </div>
           )}
         </div>
      </div>

      {/* Stats Grid */}
      {(item.bonusToAC || item.bonusToRangedDamage) && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2">
            {item.bonusToAC && (
            <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Бонус до КБ</div>
                <div className="mt-0.5 text-sm sm:text-base font-bold text-teal-300">+{item.bonusToAC}</div>
            </div>
            )}
            {item.bonusToRangedDamage && (
            <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 glass-panel">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Рендж шкода</div>
                <div className="mt-0.5 text-sm sm:text-base font-bold text-teal-300">+{item.bonusToRangedDamage}</div>
            </div>
            )}
        </div>
      )}

      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 max-h-[40vh] overflow-y-auto max-w-full overflow-x-hidden">
        <FormattedDescription content={item.description} className="text-slate-300 text-xs sm:text-[13px] break-words" />
      </div>
    </div>
  );
}

// Render the modal
function MagicItemModalRenderer({ magicItemId }: { magicItemId: string }) {
  const router = useRouter();
  const item = getMagicItemById(Number(magicItemId));

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

  if (!item) {
    router.back();
    return null;
  }

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

// Page component
export default function MagicItemModalPage({
  params,
}: {
  params: Promise<{ magicItemId: string }>;
}) {
  const resolvedParams = use(params);
  return <MagicItemModalRenderer magicItemId={resolvedParams.magicItemId} />;
}
