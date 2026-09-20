"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dice6, Minus, Plus } from "lucide-react";
import { PersWithRelations } from "@/lib/actions/pers";
import { setHitDice } from "@/lib/actions/rest-actions";
import { restTranslations } from "@/lib/refs/translation";
import { collectPersHitDicePools } from "@/lib/logic/pers-hit-dice";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createOperationId } from "@/lib/offline/queue";

interface HitDiceDialogProps {
  pers: PersWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersUpdate?: (next: PersWithRelations) => void;
}

export default function HitDiceDialog({ pers, open, onOpenChange, onPersUpdate }: HitDiceDialogProps) {
  const router = useRouter();
  const { commitOperation } = useOfflineQueue();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<Record<number, number>>({});

  const pools = useMemo(() => collectPersHitDicePools(pers), [pers]);

  useEffect(() => {
    if (!open) return;
    const initial: Record<number, number> = {};
    for (const pool of pools) initial[pool.classId] = pool.current;
    setRemaining(initial);
  }, [open, pools]);

  const changeRemaining = (classId: number, delta: number) => {
    const pool = pools.find((candidate) => candidate.classId === classId);
    if (!pool) return;
    setRemaining((prev) => ({
      ...prev,
      [classId]: Math.max(0, Math.min(pool.max, (prev[classId] ?? pool.current) + delta)),
    }));
  };

  const restoreAll = () => {
    const full: Record<number, number> = {};
    for (const pool of pools) full[pool.classId] = pool.max;
    setRemaining(full);
  };

  const save = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const outcome = await commitOperation(
        { kind: "hit-dice", remainingByClass: remaining, operationId: createOperationId(), persId: pers.persId, createdAt: new Date().toISOString() },
        () => setHitDice(pers.persId, remaining),
      );
      let currentHitDice: Record<number, number> = remaining;
      if (!outcome.queued) {
        if (!outcome.result.success) {
          toast.error(outcome.result.error);
          return;
        }
        currentHitDice = outcome.result.currentHitDice;
      }

      onPersUpdate?.({ ...pers, currentHitDice } as PersWithRelations);
      onOpenChange(false);
      if (!outcome.queued) router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{restTranslations.hitDice}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-xs text-slate-400">
            Скільки кубиків лишилось. Правка не лікує й не шкодить — хіти рахуй окремо.
          </div>

          {pools.map((pool) => (
            <div
              key={pool.classId}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-3"
            >
              <div className="flex items-center gap-2">
                <Dice6 className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">{pool.className}</div>
                  <div className="text-xs text-slate-400">d{pool.hitDie}, максимум {pool.max}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => changeRemaining(pool.classId, -1)}
                  disabled={isSubmitting || (remaining[pool.classId] ?? pool.current) <= 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center text-sm font-medium text-slate-100">
                  {remaining[pool.classId] ?? pool.current}/{pool.max}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => changeRemaining(pool.classId, 1)}
                  disabled={isSubmitting || (remaining[pool.classId] ?? pool.current) >= pool.max}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="secondary" className="w-full" onClick={restoreAll} disabled={isSubmitting}>
            Відновити всі
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {restTranslations.cancel}
          </Button>
          <Button onClick={save} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
            {restTranslations.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
