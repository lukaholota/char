"use client";

import { useEffect, useMemo, useState } from "react";
import { Ruleset } from "@prisma/client";
import { Award, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { FeatData } from "@/lib/featsData";
import { addFeatToPers, removeFeatFromPers } from "@/lib/actions/feat-actions";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { AcquiredFeatsTab, CharacterFeatItem } from "@/lib/components/characterSheet/feats/AcquiredFeatsTab";
import { FeatCatalogTab } from "@/lib/components/characterSheet/feats/FeatCatalogTab";
import { cn } from "@/lib/utils";

async function loadFeatCatalog(ruleset: Ruleset): Promise<FeatData[]> {
  const { getAllFeats } = await import("@/lib/featsData");
  return getAllFeats(ruleset);
}

type CatalogState = { status: "loading" } | { status: "ready"; feats: FeatData[] } | { status: "failed" };

type Props = {
  persId: number;
  ruleset?: Ruleset;
  persFeats: CharacterFeatItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReadOnly?: boolean;
};

export function FeatsSheetManagerModal({
  persId,
  ruleset = "RULES_2014",
  persFeats,
  open,
  onOpenChange,
  isReadOnly,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"acquired" | "catalog">("acquired");
  const [selectedDetailFeat, setSelectedDetailFeat] = useState<FeatData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setCatalog({ status: "loading" });
    loadFeatCatalog(ruleset)
      .then((feats) => {
        if (!cancelled) setCatalog({ status: "ready", feats });
      })
      .catch(() => {
        if (!cancelled) setCatalog({ status: "failed" });
      });

    return () => {
      cancelled = true;
    };
  }, [open, ruleset]);

  const acquiredFeatIds = useMemo(() => {
    return new Set(persFeats.map((pf) => pf.featId || pf.feat?.featId).filter(Boolean) as number[]);
  }, [persFeats]);

  const handleAddFeat = async (feat: FeatData) => {
    if (isReadOnly) return;
    setIsSubmitting(feat.featId);
    try {
      const res = await addFeatToPers({ persId, featId: feat.featId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Рису «${feat.name}» додано!`);
      router.refresh();
    } catch {
      toast.error("Не вдалося додати рису");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleRemoveFeat = async (featId: number, featName: string) => {
    if (isReadOnly) return;
    setIsSubmitting(featId);
    try {
      const res = await removeFeatFromPers({ persId, featId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Рису «${featName}» видалено`);
      router.refresh();
    } catch {
      toast.error("Не вдалося видалити рису");
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-950/95 border-white/10 backdrop-blur-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <DialogTitle className="text-lg font-bold text-slate-100">
                Керування рисами персонажа
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mr-6">
              <button
                type="button"
                onClick={() => setActiveTab("acquired")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                  activeTab === "acquired"
                    ? "bg-amber-500/20 text-amber-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Набуті ({persFeats.length})
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
                    activeTab === "catalog"
                      ? "bg-amber-500/20 text-amber-300 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  + Додати рису
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "acquired" ? (
            <AcquiredFeatsTab
              persFeats={persFeats}
              isReadOnly={isReadOnly}
              isSubmitting={isSubmitting}
              onRemoveFeat={handleRemoveFeat}
              onSwitchToCatalog={() => setActiveTab("catalog")}
            />
          ) : catalog.status === "ready" ? (
            <FeatCatalogTab
              availableFeats={catalog.feats}
              acquiredFeatIds={acquiredFeatIds}
              isSubmitting={isSubmitting}
              onAddFeat={handleAddFeat}
              onOpenDetail={setSelectedDetailFeat}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-slate-400">
              {catalog.status === "loading" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                  <span>Завантажуємо каталог рис…</span>
                </>
              ) : (
                <span>Не вдалося завантажити каталог рис. Спробуйте закрити й відкрити вікно.</span>
              )}
            </div>
          )}
        </div>

        {/* Selected Feat Quick Detail View Dialog */}
        {selectedDetailFeat && (
          <Dialog
            open={!!selectedDetailFeat}
            onOpenChange={(openVal) => !openVal && setSelectedDetailFeat(null)}
          >
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-slate-100">
                  {selectedDetailFeat.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                {selectedDetailFeat.prerequisite && (
                  <div className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <span className="font-semibold text-slate-400">Вимога: </span>
                    {selectedDetailFeat.prerequisite}
                  </div>
                )}
                <div className="glass-panel rounded-xl border border-slate-800/70 p-4">
                  <FormattedDescription content={selectedDetailFeat.description} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
