"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { shortRest, HitDiceToUse } from "@/lib/actions/rest-actions";
import { restTranslations, classTranslations } from "@/lib/refs/translation";
import { PersWithRelations, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { getAbilityMod } from "@/lib/logic/utils";
import { Classes } from "@prisma/client";
import { Minus, Plus, Dice6 } from "lucide-react";

interface ShortRestDialogProps {
  pers: PersWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersUpdate?: (next: PersWithRelations) => void;
  onFeaturesUpdate?: (next: CharacterFeaturesGroupedResult) => void;
}

interface HitDieInfo {
  classId: number;
  className: string;
  hitDie: number;
  current: number;
  max: number;
}

export default function ShortRestDialog({ pers, open, onOpenChange, onPersUpdate, onFeaturesUpdate }: ShortRestDialogProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hitDice, setHitDice] = useState<HitDieInfo[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});

  const conMod = getAbilityMod(pers.con);

  const derivedHitDice = useMemo<HitDieInfo[]>(() => {
    const multiclassLevelSum = pers.multiclasses?.reduce((acc, mc) => acc + mc.classLevel, 0) ?? 0;
    const mainClassLevel = pers.level - multiclassLevelSum;

    const stored = (pers as unknown as { currentHitDice?: Record<string, number> }).currentHitDice ?? {};

    const mainClassName = classTranslations[pers.class.name as Classes] ?? pers.class.name;
    const mainCurrentRaw = stored[String(pers.class.classId)];
    const mainCurrent = typeof mainCurrentRaw === "number" ? mainCurrentRaw : mainClassLevel;

    const result: HitDieInfo[] = [
      {
        classId: pers.class.classId,
        className: mainClassName,
        hitDie: pers.class.hitDie,
        current: Math.max(0, Math.min(mainCurrent, mainClassLevel)),
        max: Math.max(0, mainClassLevel),
      },
    ];

    for (const mc of pers.multiclasses ?? []) {
      const mcClassName = classTranslations[mc.class.name as unknown as Classes] ?? mc.class.name;
      const mcCurrentRaw = stored[String(mc.classId)];
      const mcCurrent = typeof mcCurrentRaw === "number" ? mcCurrentRaw : mc.classLevel;
      result.push({
        classId: mc.classId,
        className: mcClassName,
        hitDie: mc.class.hitDie,
        current: Math.max(0, Math.min(mcCurrent, mc.classLevel)),
        max: Math.max(0, mc.classLevel),
      });
    }

    return result;
  }, [pers]);

  const refreshInBackground = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  useEffect(() => {
    if (open) {
      setHitDice(derivedHitDice);
      const initialSelection: Record<number, number> = {};
      derivedHitDice.forEach((hd) => {
        initialSelection[hd.classId] = 0;
      });
      setSelected(initialSelection);
    }
  }, [open, derivedHitDice]);

  const handleShortRest = () => {
    const hitDiceToUse: HitDiceToUse[] = Object.entries(selected)
      .filter(([, count]) => count > 0)
      .map(([classId, count]) => ({
        classId: Number(classId),
        count,
      }));

    if (isSubmitting) return;
    setIsSubmitting(true);
    (async () => {
      try {
        const res = await shortRest(pers.persId, hitDiceToUse);
        if (!res.success) {
          toast.error(res.error);
          return;
        }

        // Apply immediate local update (so UI doesn't wait for router.refresh)
        // Note: short rest doesn't change maxHp; just currentHp + hit dice.
        const nextPers: PersWithRelations = {
          ...pers,
          currentHp: res.newCurrentHp,
          currentHitDice: res.currentHitDice as any,
          currentPactSlots: (res as any).currentPactSlots ?? (pers as any).currentPactSlots,
        };

        onPersUpdate?.(nextPers);

        if (res.groupedFeatures) {
          onFeaturesUpdate?.(res.groupedFeatures);
        }

        toast.success(restTranslations.shortRestComplete, {
          description: `${restTranslations.featuresRestored}: ${res.featuresRestored}`,
        });
        onOpenChange(false);
        refreshInBackground();
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const increment = (classId: number) => {
    const hd = hitDice.find((h) => h.classId === classId);
    if (!hd) return;
    const current = selected[classId] ?? 0;
    if (current < hd.current) {
      setSelected((prev) => ({ ...prev, [classId]: current + 1 }));
    }
  };

  const decrement = (classId: number) => {
    const current = selected[classId] ?? 0;
    if (current > 0) {
      setSelected((prev) => ({ ...prev, [classId]: current - 1 }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{restTranslations.shortRest}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current HP display */}
          <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <div className="text-xs text-slate-300">
              {restTranslations.currentHp}:{" "}
              <span className="font-semibold text-slate-50">{pers.currentHp}</span> / {pers.maxHp}
            </div>
          </div>

          {/* Hit dice selection */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">{restTranslations.selectHitDice}</div>
            <div className="text-xs text-slate-400 mb-2">
              Оберіть кількість хіт дайсів для витрати. Ви самостійно кидаєте кубики і додаєте відновлене HP.
            </div>
            
            {hitDice.length === 0 ? (
              <div className="text-sm text-slate-400">{restTranslations.noHitDiceAvailable}</div>
            ) : (
              <div className="space-y-2">
                {hitDice.map((hd) => (
                  <div
                    key={hd.classId}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Dice6 className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-100">{hd.className}</div>
                        <div className="text-xs text-slate-400">
                          {hd.current}/{hd.max} d{hd.hitDie}
                          <span className="text-slate-500 ml-1">({conMod >= 0 ? `+${conMod}` : conMod} СТА)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => decrement(hd.classId)}
                        disabled={isSubmitting || (selected[hd.classId] ?? 0) <= 0}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium text-slate-100">
                        {selected[hd.classId] ?? 0}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => increment(hd.classId)}
                        disabled={isSubmitting || (selected[hd.classId] ?? 0) >= hd.current}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="pt-1 px-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Бонус статури (до кожного кубика):</span>
                    <span className="font-semibold text-slate-200">{conMod >= 0 ? `+${conMod}` : conMod}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {restTranslations.cancel}
          </Button>
          <Button
            onClick={handleShortRest}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting || isRefreshing ? restTranslations.takingShortRest : restTranslations.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
