"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActiveBeastForm } from "@/server/db/wildshape";
import { leaveWildshapeForm } from "@/server/db/wildshape-actions";
import { usesSeparateBeastHitPoints } from "@/rules/wildshape";

/// Персонаж, який зараз у звіриній формі. Ані другого стосу хітів, ані окремих характеристик
/// звіра тут більше немає: усе це показує сам лист другим шаром, а блок хітів один
/// ([Р-6](docs/o24-wildshape-second-layer/README.md)) — саме на дублювання й була скарга.
/// Картка лишається точкою входу й виходу, поруч з атаками.

export function ActiveForm({
  active,
  persId,
  isReadOnly,
  isPending,
  onChanged,
}: {
  active: ActiveBeastForm;
  persId: number;
  isReadOnly?: boolean;
  isPending: boolean;
  onChanged: () => void;
}) {
  async function revert() {
    const result = await leaveWildshapeForm(persId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-emerald-300 truncate">
            {active.creature?.name ?? active.key}
          </div>
          {active.creature && (
            <div className="text-xs text-slate-400">
              КБ {active.creature.ac} · {active.creature.speed}
            </div>
          )}
        </div>
        {!isReadOnly && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={revert}>
            Вийти з форми
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        {usesSeparateBeastHitPoints(active.ruleset)
          ? "Характеристики, КБ, швидкість і хіти на листі — звірині. Шкода й зцілення форми — у блоці хітів на головній, повний статблок — у смузі над листом."
          : "Характеристики, КБ і швидкість на листі — звірині, хіти лишаються вашими з тимчасовими зверху. Шкоду записуйте у звичайний блок хітів, повний статблок — у смузі над листом."}
      </p>
    </div>
  );
}
