"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { PersWithRelations } from "@/lib/actions/pers";
import { applyHpChange } from "@/lib/actions/combat-actions";
import { spendPactSlot, spendSpellSlot } from "@/lib/actions/spell-slots";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createOperationId } from "@/lib/offline/queue";
import type { OfflineOperation } from "@/lib/offline/operations";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { getPactMagicSlots, getStandardSpellSlots } from "@/rules/spellcasting";
import { buildCastingOptionKey, listCastingSlotOptions, type CastingSlotOption } from "@/rules/spell-casting-slots";
import { countDivineSmiteDice, findLayOnHandsDefault } from "@/rules/paladin-actions";
import { describeSlot } from "@/lib/components/characterSheet/shared/CastSpellMenu";
import { openRoomRoll } from "@/lib/components/game/open-room-roll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PersUpdate = (next: PersWithRelations) => void;
type SlotSpendResult = { success: true } | { success: false; error: string };
type SlotOption = Exclude<CastingSlotOption, { kind: "FREE_USE" }>;

export function DivineSmiteActions({ pers, onPersUpdate, isReadOnly }: { pers: PersWithRelations; onPersUpdate?: PersUpdate; isReadOnly?: boolean }) {
  const commitSlotSpend = useSlotSpend(pers);
  const [isUndeadOrFiend, setIsUndeadOrFiend] = useState(false);
  const options = useMemo(() => listSmiteSlotOptions(pers), [pers]);
  if (isReadOnly || options.length === 0) return null;

  const smite = (option: SlotOption) => {
    if (option.remaining <= 0) return;
    onPersUpdate?.(spendSlotLocally(pers, option));
    commitSlotSpend(option);
    openRoomRoll(buildSmiteRoll(option, isUndeadOrFiend));
  };

  const hasSlots = options.some((option) => option.remaining > 0);
  return (
    <ActionFooter>
      <p className="text-xs text-slate-400">Після влучання рукопашною зброєю: слот спишеться, кубики кинуться в ту саму ціль.</p>
      <button
        type="button"
        aria-pressed={isUndeadOrFiend}
        onClick={() => setIsUndeadOrFiend((value) => !value)}
        className={clsx(
          "min-h-11 rounded-lg border px-3 text-sm transition",
          isUndeadOrFiend ? "border-amber-400/60 bg-amber-500/15 text-amber-100" : "border-white/10 bg-slate-900/40 text-slate-300",
        )}
      >
        Нежить чи нечисть · +1к8
      </button>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <Button
            key={buildCastingOptionKey(option)}
            type="button"
            variant="secondary"
            disabled={option.remaining <= 0}
            onClick={() => smite(option)}
            className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <Swords className="h-4 w-4" aria-hidden />
              Кара · {countDivineSmiteDice(option.slotLevel, isUndeadOrFiend)}к8
            </span>
            <span className="text-xs text-slate-400">{describeSlot(option)} · лишилось {option.remaining}</span>
          </Button>
        ))}
      </div>
      {!hasSlots && <p className="text-xs text-amber-200/80">Слотів не лишилось — відновіть їх відпочинком.</p>}
    </ActionFooter>
  );
}

export function LayOnHandsAction({
  pers,
  onPersUpdate,
  isReadOnly,
  remaining,
  onSpendPoints,
}: {
  pers: PersWithRelations;
  onPersUpdate?: PersUpdate;
  isReadOnly?: boolean;
  remaining: number;
  onSpendPoints: (amount: number) => void;
}) {
  const commitHeal = useSelfHeal(pers);
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const missingHp = Math.max(0, pers.maxHp - pers.currentHp);
  if (isReadOnly) return null;

  const open = () => {
    setAmount(findLayOnHandsDefault(remaining, missingHp));
    setIsOpen(true);
  };
  const points = Math.max(0, Math.min(remaining, Math.trunc(amount) || 0));

  const healSelf = () => {
    setIsOpen(false);
    onSpendPoints(points);
    onPersUpdate?.({ ...pers, currentHp: Math.min(pers.maxHp, pers.currentHp + points) });
    commitHeal(points);
  };
  const spendForAlly = () => {
    setIsOpen(false);
    onSpendPoints(points);
  };

  return (
    <ActionFooter>
      <Button type="button" variant="secondary" disabled={remaining <= 0} onClick={open} className="min-h-11 w-full">
        <Heart className="mr-2 h-4 w-4" aria-hidden />
        Зцілити
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Цілющі руки</DialogTitle>
            <DialogDescription>
              Резерв: {remaining} · ваші хіти: {pers.currentHp} / {pers.maxHp}
            </DialogDescription>
          </DialogHeader>
          <PointsStepper value={points} max={remaining} onChange={setAmount} />
          <div className="grid gap-2">
            <Button
              type="button"
              disabled={points <= 0 || missingHp <= 0}
              onClick={healSelf}
              className="min-h-11 border border-emerald-400/40 bg-emerald-500/25 text-slate-100 hover:bg-emerald-500/45"
            >
              {missingHp <= 0 ? "Ваші хіти повні" : `Зцілити себе: +${points}`}
            </Button>
            <Button type="button" variant="secondary" disabled={points <= 0} onClick={spendForAlly} className="min-h-11">
              Союзнику: витратити {points}
            </Button>
            <p className="text-xs text-slate-400">Союзник додає ці хіти на своєму листі.</p>
          </div>
        </DialogContent>
      </Dialog>
    </ActionFooter>
  );
}

function PointsStepper({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" size="icon" aria-label="Менше очок" disabled={value <= 1} onClick={() => onChange(value - 1)} className="h-11 w-11 shrink-0">
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        aria-label="Скільки очок витратити"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 text-center text-lg"
      />
      <Button type="button" variant="secondary" size="icon" aria-label="Більше очок" disabled={value >= max} onClick={() => onChange(value + 1)} className="h-11 w-11 shrink-0">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ActionFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 space-y-2 border-t border-white/10 pt-3" onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  );
}

function listSmiteSlotOptions(pers: PersWithRelations): SlotOption[] {
  const caster = calculateCasterLevel(pers);
  const pact = getPactMagicSlots(caster.pactLevel, SPELL_SLOT_PROGRESSION.PACT);
  return listCastingSlotOptions({
    spellLevel: 1,
    currentSpellSlots: pers.currentSpellSlots ?? [],
    maxSpellSlots: getStandardSpellSlots(caster.casterLevel, SPELL_SLOT_PROGRESSION.FULL),
    pact: pact && pact.slots > 0 ? { current: pers.currentPactSlots ?? 0, max: pact.slots, slotLevel: pact.level } : null,
  }).filter((option): option is SlotOption => option.kind !== "FREE_USE");
}

function spendSlotLocally(pers: PersWithRelations, option: SlotOption): PersWithRelations {
  if (option.kind === "PACT_SLOT") return { ...pers, currentPactSlots: Math.max(0, (pers.currentPactSlots ?? 0) - 1) };
  const slots = Array.from({ length: 9 }, (_, index) => pers.currentSpellSlots?.[index] ?? 0);
  slots[option.slotLevel - 1] = Math.max(0, slots[option.slotLevel - 1] - 1);
  return { ...pers, currentSpellSlots: slots };
}

function buildSmiteRoll(option: SlotOption, isUndeadOrFiend: boolean) {
  const subtitle = [describeSlot(option), "променева", isUndeadOrFiend ? "нежить чи нечисть" : null].filter(Boolean).join(" · ");
  return {
    title: "Божественна кара",
    subtitle,
    actions: [{ key: "divine-smite", label: "Шкода", count: countDivineSmiteDice(option.slotLevel, isUndeadOrFiend), sides: 8, bonus: 0, isD20: false }],
    autoRollKey: "divine-smite",
  };
}

function useSlotSpend(pers: PersWithRelations) {
  const router = useRouter();
  const { commitOperation } = useOfflineQueue();
  return (option: SlotOption) => {
    const isPact = option.kind === "PACT_SLOT";
    const operation = buildOperation(pers.persId, isPact ? { kind: "spend-pact-slot" } : { kind: "spend-spell-slot", slotLevel: option.slotLevel });
    const sendToServer = (operationId: string): Promise<SlotSpendResult> =>
      isPact ? spendPactSlot(pers.persId, operationId) : spendSpellSlot(pers.persId, option.slotLevel, operationId);
    void commitOperation(operation, sendToServer).then((outcome) => reportOutcome(outcome, router.refresh));
  };
}

function useSelfHeal(pers: PersWithRelations) {
  const router = useRouter();
  const { commitOperation } = useOfflineQueue();
  return (amount: number) => {
    const operation = buildOperation(pers.persId, { kind: "hp", mode: "heal", amount });
    void commitOperation(operation, (operationId) => applyHpChange({ persId: pers.persId, mode: "heal", amount, operationId })).then((outcome) =>
      reportOutcome(outcome, router.refresh),
    );
  };
}

function reportOutcome(outcome: { queued: true } | { queued: false; result: SlotSpendResult }, refresh: () => void) {
  if (outcome.queued) return;
  if (!outcome.result.success) toast.error(outcome.result.error);
  refresh();
}

type OperationBody =
  | { kind: "spend-spell-slot"; slotLevel: number }
  | { kind: "spend-pact-slot" }
  | { kind: "hp"; mode: "heal"; amount: number };

function buildOperation(persId: number, body: OperationBody): OfflineOperation {
  return { ...body, operationId: createOperationId(), persId, createdAt: new Date().toISOString() };
}
