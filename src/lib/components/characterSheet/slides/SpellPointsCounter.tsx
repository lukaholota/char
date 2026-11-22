"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import type { PersWithRelations } from "@/lib/actions/pers";
import { changeSpellPoints } from "@/lib/actions/spell-slots";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useLatestMutation } from "@/hooks/useLatestMutation";
import { createOperationId } from "@/lib/offline/queue";
import { findPersHouseRules } from "@/lib/logic/pers-house-rules";
import { findCastingSpellPoints, findMaxSpellPoints, findSpellPointCost, listSpellPointLevels } from "@/rules/spell-points";
import { Button } from "@/components/ui/button";

const SPELL_POINTS_MUTATION = "spell-points";

export type SpellPoints = { isActive: boolean; current: number; max: number; levels: number[]; change: (amount: number) => void };

export function useSpellPoints(pers: PersWithRelations, maxSlots: readonly number[]): SpellPoints {
  const router = useRouter();
  const { commitOperation } = useOfflineQueue();
  const { startMutation, finishMutation, hasPendingMutation } = useLatestMutation();
  const [spent, setSpent] = useState(pers.spellPointsSpent ?? 0);
  const max = findMaxSpellPoints(maxSlots);

  useEffect(() => {
    if (!hasPendingMutation(SPELL_POINTS_MUTATION)) setSpent(pers.spellPointsSpent ?? 0);
  }, [pers.spellPointsSpent, hasPendingMutation]);

  const change = (amount: number) => {
    setSpent((value) => Math.max(0, Math.min(max, value + amount)));
    const version = startMutation(SPELL_POINTS_MUTATION);
    const operation = { kind: "spell-points" as const, amount, operationId: createOperationId(), persId: pers.persId, createdAt: new Date().toISOString() };
    void commitOperation(operation, (operationId) => changeSpellPoints(pers.persId, amount, operationId)).then((outcome) => {
      if (!finishMutation(SPELL_POINTS_MUTATION, version) || outcome.queued) return;
      if (outcome.result.success) setSpent(outcome.result.spellPointsSpent);
      router.refresh();
    });
  };

  const current = findCastingSpellPoints(findPersHouseRules(pers).magicSystem, maxSlots, spent);
  return { isActive: current !== null, current: current ?? 0, max, levels: listSpellPointLevels(maxSlots), change };
}

export function SpellPointsCounter({ points, isReadOnly }: { points: SpellPoints; isReadOnly?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <div>
          <div className="text-xs text-slate-400">Очки чар</div>
          <div className="text-lg font-semibold tabular-nums text-slate-50">
            {points.current}/{points.max}
          </div>
        </div>
        {isReadOnly ? null : (
          <div className="flex gap-2">
            <Button type="button" size="icon" variant="secondary" aria-label="Витратити очко чар" disabled={points.current <= 0} onClick={() => points.change(1)} className="h-11 w-11">
              <Minus className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="button" size="icon" variant="secondary" aria-label="Повернути очко чар" disabled={points.current >= points.max} onClick={() => points.change(-1)} className="h-11 w-11">
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Накладання саме знімає ціну: {points.levels.map((level) => `${level} коло — ${findSpellPointCost(level)}`).join(", ")}. Довгий відпочинок повертає все.
      </p>
    </div>
  );
}
