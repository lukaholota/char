"use client";

import { useEffect, useMemo, useState } from "react";
import { Ruleset } from "@/lib/prisma-enums";
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
import { addFeatToPers, getSheetFeatAcquisitionContent, removeFeatFromPers, type SheetFeatAcquisitionContent } from "@/lib/actions/feat-actions";
import { FeatAcquisitionDialog } from "@/lib/components/characterSheet/feats/FeatAcquisitionDialog";
import { FeatRemovalDialog } from "@/lib/components/characterSheet/feats/FeatRemovalDialog";
import type { SheetFeatExistingState } from "@/lib/components/characterSheet/feats/sheet-feat-existing-state";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { AcquiredFeatsTab, type AcquiredFeatDetail, type CharacterFeatItem } from "@/lib/components/characterSheet/feats/AcquiredFeatsTab";
import { FeatCatalogTab } from "@/lib/components/characterSheet/feats/FeatCatalogTab";
import { cn } from "@/lib/utils";

async function loadFeatCatalog(ruleset: Ruleset): Promise<FeatData[]> {
  const { getAllFeats } = await import("@/lib/featsData");
  return getAllFeats(ruleset);
}

type CatalogState = { status: "loading" } | { status: "ready"; feats: FeatData[] } | { status: "failed" };

type Props = {
  persId: number;
  existing: SheetFeatExistingState;
  ruleset?: Ruleset;
  persFeats: CharacterFeatItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReadOnly?: boolean;
};

export function FeatsSheetManagerModal({
  persId,
  existing,
  ruleset = "RULES_2014",
  persFeats,
  open,
  onOpenChange,
  isReadOnly,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"acquired" | "catalog">("acquired");
  const [selectedDetailFeat, setSelectedDetailFeat] = useState<(AcquiredFeatDetail & { prerequisite?: string | null }) | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
  const [acquiring, setAcquiring] = useState<{ feat: FeatData; content: SheetFeatAcquisitionContent } | null>(null);
  const [removing, setRemoving] = useState<{ featId: number; name: string } | null>(null);

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
    const acquiredEngNames = new Set(persFeats.map((pf) => pf.feat?.engName).filter(Boolean));
    return new Set(catalog.status === "ready" ? catalog.feats.filter((feat) => acquiredEngNames.has(feat.engName)).map((feat) => feat.featId) : []);
  }, [persFeats, catalog]);

  const acquireFeat = async (feat: FeatData, databaseFeatId: number, selection: { choiceOptionIds: number[]; featSpellIds: number[] }) => {
    setIsSubmitting(feat.featId);
    try {
      const res = await addFeatToPers({ persId, featId: databaseFeatId, ...selection });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setAcquiring(null);
      toast.success(`Рису «${feat.name}» додано!`);
      router.refresh();
    } catch {
      toast.error("Не вдалося додати рису");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleAddFeat = async (feat: FeatData) => {
    if (isReadOnly) return;
    setIsSubmitting(feat.featId);
    const content = await getSheetFeatAcquisitionContent(persId, feat.engName).catch(() => null);
    setIsSubmitting(null);
    if (!content) {
      toast.error("Не вдалося завантажити рису");
      return;
    }
    if (content.feat.featChoiceOptions.length === 0 && !content.hasSpellChoice) {
      await acquireFeat(feat, content.feat.featId, { choiceOptionIds: [], featSpellIds: [] });
      return;
    }
    setAcquiring({ feat, content });
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
      setRemoving(null);
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
              onRemoveFeat={(featId, name) => setRemoving({ featId, name })}
              onOpenDetail={setSelectedDetailFeat}
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

        <FeatRemovalDialog
          persId={persId}
          feat={removing}
          isRemoving={removing !== null && isSubmitting === removing.featId}
          onCancel={() => setRemoving(null)}
          onConfirm={handleRemoveFeat}
        />

        {acquiring && (
          <FeatAcquisitionDialog
            persId={persId}
            existing={existing}
            featLabel={acquiring.feat.name}
            content={acquiring.content}
            isSubmitting={isSubmitting === acquiring.feat.featId}
            onClose={() => setAcquiring(null)}
            onAcquire={(selection) => acquireFeat(acquiring.feat, acquiring.content.feat.featId, selection)}
          />
        )}

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
