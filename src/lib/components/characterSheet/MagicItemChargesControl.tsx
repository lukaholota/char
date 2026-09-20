"use client";

import { useEffect, useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMagicItemChargesMax, stepMagicItemCharges } from "@/lib/actions/magic-item-actions";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createOperationId } from "@/lib/offline/queue";
import { applyChargesMax, applyChargesStep, type MagicItemCharges } from "@/rules/magic-item-charges";

type Props = {
  persId: number;
  persMagicItemId: number;
  charges: MagicItemCharges;
  isReadOnly?: boolean;
  onChanged: () => void;
};

export function MagicItemChargesControl({ persId, persMagicItemId, charges, isReadOnly, onChanged }: Props) {
  const { commitOperation } = useOfflineQueue();
  const [shown, setShown] = useState(charges);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [maxInput, setMaxInput] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setShown(charges), [charges]);

  type ChargesSaveResult = { success: boolean; error?: string; queued?: boolean };

  const commit = (next: MagicItemCharges, save: () => Promise<ChargesSaveResult>) => {
    const previous = shown;
    setShown(next);
    startTransition(async () => {
      const result: ChargesSaveResult = await save().catch(() => ({ success: false, error: "Немає звʼязку з сервером — заряди не збережено" }));
      if (!result.success) {
        setShown(previous);
        toast.error(result.error ?? "Не вдалося змінити заряди");
        return;
      }
      if (!result.queued) onChanged();
    });
  };

  const step = (delta: number) =>
    commit(applyChargesStep(shown, delta), async () => {
      const outcome = await commitOperation(
        { kind: "magic-item-charges", persMagicItemId, step: delta, operationId: createOperationId(), persId, createdAt: new Date().toISOString() },
        () => stepMagicItemCharges(persMagicItemId, delta),
      );
      return outcome.queued ? { success: true, queued: true } : outcome.result;
    });

  const saveMax = () => {
    setIsEditingMax(false);
    const chargesMax = maxInput.trim() === "" ? null : Number(maxInput);
    commit(applyChargesMax(shown, chargesMax), () => setMagicItemChargesMax(persMagicItemId, chargesMax));
  };

  const startEditingMax = () => {
    if (isReadOnly) return;
    setMaxInput(shown.chargesMax?.toString() ?? "");
    setIsEditingMax(true);
  };

  if (isEditingMax) {
    return (
      <Input
        autoFocus
        aria-label="Максимум зарядів"
        inputMode="numeric"
        placeholder="макс."
        value={maxInput}
        onChange={(event) => /^\d*$/.test(event.target.value) && setMaxInput(event.target.value)}
        onBlur={saveMax}
        onKeyDown={(event) => event.key === "Enter" && saveMax()}
        className="h-8 w-16 bg-white/5 border-white/10 text-center text-xs"
      />
    );
  }

  if (shown.chargesMax === null) {
    if (isReadOnly) return null;
    return (
      <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-slate-500 hover:text-violet-300" onClick={startEditingMax}>
        + заряди
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {!isReadOnly && (
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Витратити заряд" disabled={isPending || shown.chargesCurrent === 0} onClick={() => step(-1)}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
      )}
      <button
        type="button"
        className="min-w-[2.75rem] rounded px-1 text-xs font-bold tabular-nums text-violet-200 hover:bg-white/5"
        title={isReadOnly ? "Заряди" : "Змінити максимум зарядів"}
        onClick={startEditingMax}
      >
        {shown.chargesCurrent}/{shown.chargesMax}
      </button>
      {!isReadOnly && (
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Повернути заряд" disabled={isPending || shown.chargesCurrent === shown.chargesMax} onClick={() => step(1)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
