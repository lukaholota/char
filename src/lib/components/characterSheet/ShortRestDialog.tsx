"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { shortRest, HitDiceToUse } from "@/lib/actions/rest-actions";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createOperationId } from "@/lib/offline/queue";
import { rollHitPointsFromHitDice } from "@/rules/hit-dice";
import { restTranslations } from "@/lib/refs/translation";
import { PersWithRelations } from "@/lib/actions/pers";
import { getAbilityMod } from "@/lib/logic/utils";
import { Input } from "@/components/ui/input";
import { collectPersHitDicePools, type PersHitDicePool } from "@/lib/logic/pers-hit-dice";
import { Minus, Plus, Dice6 } from "lucide-react";
import { endAllFeatureStates } from "@/lib/logic/feature-state-rows";
import { endEffectsAfterRest } from "@/lib/logic/pers-effect-rows";

interface ShortRestDialogProps {
  pers: PersWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersUpdate?: (next: PersWithRelations) => void;
  onGroupedFeaturesRefresh?: () => void;
  onRestQueued?: () => void;
}

export default function ShortRestDialog({ pers, open, onOpenChange, onPersUpdate, onGroupedFeaturesRefresh, onRestQueued }: ShortRestDialogProps) {
  const router = useRouter();
  const { commitOperation } = useOfflineQueue();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hitDice, setHitDice] = useState<PersHitDicePool[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [rollsHitDiceInApp, setRollsHitDiceInApp] = useState(true);
  const [rolledHitPointsInput, setRolledHitPointsInput] = useState("");

  const conMod = getAbilityMod(pers.con);

  const derivedHitDice = useMemo(() => collectPersHitDicePools(pers), [pers]);

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
      setRolledHitPointsInput("");
    }
  }, [open, derivedHitDice]);

  const totalDiceSelected = Object.values(selected).reduce((sum, count) => sum + count, 0);

  // Calculate estimated HP restoration
  const estimatedHp = hitDice.reduce((sum, hd) => {
    const count = selected[hd.classId] ?? 0;
    if (count === 0) return sum;
    const avgRoll = Math.ceil(hd.hitDie / 2);
    return sum + count * Math.max(1, avgRoll + conMod);
  }, 0);

  const handleShortRest = () => {
    const hitDiceToUse: HitDiceToUse[] = Object.entries(selected)
      .filter(([, count]) => count > 0)
      .map(([classId, count]) => ({
        classId: Number(classId),
        count,
      }));

    const rolledHitPoints = rollsHitDiceInApp ? undefined : Math.max(0, Math.trunc(Number(rolledHitPointsInput) || 0));

    if (isSubmitting) return;
    setIsSubmitting(true);
    (async () => {
      try {
        const restoredHitPoints = rolledHitPoints ?? rollHitPointsFromHitDice(derivedHitDice, hitDiceToUse, conMod);
        const outcome = await commitOperation(
          {
            kind: "short-rest",
            hitDiceSpent: hitDiceToUse,
            restoredHitPoints,
            operationId: createOperationId(),
            persId: pers.persId,
            createdAt: new Date().toISOString(),
          },
          () => shortRest(pers.persId, hitDiceToUse, rolledHitPoints),
        );
        if (outcome.queued) {
          onRestQueued?.();
          toast.success(restTranslations.shortRestComplete, {
            description: `${restTranslations.hpRestored}: ${restoredHitPoints}. ${restTranslations.savedOffline}`,
          });
          onOpenChange(false);
          return;
        }

        const res = outcome.result;
        if (!res.success) {
          toast.error(res.error);
          return;
        }

        // Apply immediate local update (so UI doesn't wait for router.refresh)
        // Note: short rest doesn't change maxHp; just currentHp + hit dice.
        const nextPers: PersWithRelations = {
          ...endEffectsAfterRest(endAllFeatureStates(pers), "SHORT"),
          currentHp: res.newCurrentHp,
          currentHitDice: res.currentHitDice as any,
          currentPactSlots: (res as any).currentPactSlots ?? (pers as any).currentPactSlots,
        };

        onPersUpdate?.(nextPers);
        onGroupedFeaturesRefresh?.();

        toast.success(restTranslations.shortRestComplete, {
          description: `${restTranslations.hpRestored}: ${res.hpRestored}, ${restTranslations.featuresRestored}: ${res.featuresRestored}`,
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
      <DialogContent className="max-w-md">
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
              </div>
            )}
          </div>

          {totalDiceSelected > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={rollsHitDiceInApp ? "default" : "secondary"}
                  disabled={isSubmitting}
                  onClick={() => setRollsHitDiceInApp(true)}
                  className="text-xs"
                >
                  Кидає застосунок
                </Button>
                <Button
                  type="button"
                  variant={rollsHitDiceInApp ? "secondary" : "default"}
                  disabled={isSubmitting}
                  onClick={() => setRollsHitDiceInApp(false)}
                  className="text-xs"
                >
                  Кидаю сам
                </Button>
              </div>

              {rollsHitDiceInApp ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="text-xs text-emerald-300">
                    ≈ {restTranslations.restoreHp}:{" "}
                    <span className="font-bold text-emerald-200">+{estimatedHp}</span>
                    <span className="text-emerald-400 ml-1">(середнє)</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-1">
                    d + {conMod >= 0 ? "+" : ""}{conMod} (CON) {restTranslations.perDie}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3 space-y-2">
                  <div className="text-xs text-slate-300">{restTranslations.restoreHp}, разом із Статурою</div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={rolledHitPointsInput}
                    onChange={(event) => setRolledHitPointsInput(event.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="text-[10px] text-slate-400">
                    Нуль теж можна: кубик спишеться, а хіти лишаться як були.
                  </div>
                </div>
              )}
            </div>
          )}
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
