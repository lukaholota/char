"use client";

import { useState } from "react";
import { Minus, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PersCustomFeature } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { PersWithRelations } from "@/lib/actions/pers";
import { stepCustomFeatureUseAction } from "@/lib/actions/pers-custom-content-actions";
import { buildCustomFormulaRollContext } from "@/lib/components/dice/roll-contexts";
import { findCustomRollStats } from "@/lib/logic/bonus-calculator";
import { createOperationId } from "@/lib/offline/queue";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { calculateCustomRollBonus, parseCustomRollFormulas } from "@/rules/custom-roll-formula";
import { MAX_CUSTOM_FEATURES } from "@/rules/pers-custom-content";
import { CustomFeatureDialog, type CustomFeatureTarget } from "./CustomFeatureDialog";
import { formatCustomRoll } from "./custom-roll-view";

const REST_LABELS: Record<string, string> = { SHORT_REST: "короткий відпочинок", LONG_REST: "довгий відпочинок" };
const LONG_DESCRIPTION_LENGTH = 180;
const FAILED_STEP_ERROR = "Немає звʼязку із сервером. Зміну не збережено.";

export function CustomFeaturesSection({ pers, onPersUpdate, isReadOnly }: { pers: PersWithRelations; onPersUpdate?: (next: PersWithRelations) => void; isReadOnly?: boolean }) {
  const [target, setTarget] = useState<CustomFeatureTarget>(null);
  const features = pers.persCustomFeatures ?? [];
  if (isReadOnly && !features.length) return null;

  const showSavedFeatures = (persCustomFeatures: PersCustomFeature[]) => {
    onPersUpdate?.({ ...pers, persCustomFeatures });
    setTarget(null);
  };

  return (
    <section aria-label="Власні здібності й ресурси" className="space-y-2">
      {features.length ? <h3 className="text-sm font-semibold text-slate-200">Власні здібності й ресурси</h3> : null}
      {features.length ? (
        <ul className="space-y-2">
          {features.map((feature) => (
            <CustomFeatureCard key={feature.id} pers={pers} feature={feature} isReadOnly={isReadOnly} onPersUpdate={onPersUpdate} onEdit={() => setTarget(feature)} />
          ))}
        </ul>
      ) : null}
      {!isReadOnly && features.length < MAX_CUSTOM_FEATURES ? (
        <button type="button" onClick={() => setTarget("new")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 text-sm text-slate-300 hover:bg-white/5">
          <Plus className="h-4 w-4" aria-hidden />
          Додати власну здібність або ресурс
        </button>
      ) : null}
      <CustomFeatureDialog pers={pers} target={target} onClose={() => setTarget(null)} onSaved={showSavedFeatures} />
    </section>
  );
}

function CustomFeatureCard({ pers, feature, isReadOnly, onPersUpdate, onEdit }: { pers: PersWithRelations; feature: PersCustomFeature; isReadOnly?: boolean; onPersUpdate?: (next: PersWithRelations) => void; onEdit: () => void }) {
  return (
    <li className="rounded-lg border border-white/10 bg-slate-900/40 p-2">
      <div className="flex items-start gap-1">
        <h4 className="min-w-0 flex-1 break-words py-2 pl-1 text-sm font-semibold text-slate-100">{feature.name}</h4>
        {isReadOnly ? null : (
          <button type="button" aria-label={`Редагувати: ${feature.name}`} onClick={onEdit} className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/5 hover:text-slate-100">
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {feature.description ? <CustomFeatureDescription text={feature.description} /> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CustomFeatureRolls pers={pers} feature={feature} />
        {feature.usesMax !== null && feature.usesRemaining !== null ? <CustomFeatureUses pers={pers} feature={feature} usesMax={feature.usesMax} usesRemaining={feature.usesRemaining} isReadOnly={isReadOnly} onPersUpdate={onPersUpdate} /> : null}
      </div>
    </li>
  );
}

function CustomFeatureDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > LONG_DESCRIPTION_LENGTH;
  return (
    <div className="px-1 pb-1">
      <p className={`whitespace-pre-line break-words text-sm text-slate-300 ${isLong && !isExpanded ? "line-clamp-3" : ""}`}>{text}</p>
      {isLong ? <button type="button" aria-expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} className="min-h-11 text-sm text-slate-400 underline underline-offset-2">{isExpanded ? "Згорнути" : "Показати все"}</button> : null}
    </div>
  );
}

function CustomFeatureRolls({ pers, feature }: { pers: PersWithRelations; feature: PersCustomFeature }) {
  const openRoll = useDiceUIStore((state) => state.openRoll);
  const { formulas } = parseCustomRollFormulas(feature.rollFormula ?? "");
  if (!formulas.length) return null;
  const stats = findCustomRollStats(pers);
  const rolls = formulas.map((formula) => ({ formula, bonus: calculateCustomRollBonus(formula, stats) }));
  return (
    <div className="flex flex-wrap gap-2">
      {rolls.map(({ formula, bonus }, index) => (
        <button key={formula.label} type="button" aria-label={`Кинути ${feature.name}: ${formatCustomRoll(formula, bonus)}`} title={formula.label} onClick={() => openRoll(buildCustomFormulaRollContext(feature.name, rolls, index))} className="min-h-11 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 text-sm font-semibold tabular-nums text-amber-100 hover:bg-amber-500/20">
          {formatCustomRoll(formula, bonus)}
        </button>
      ))}
    </div>
  );
}

function CustomFeatureUses({ pers, feature, usesMax, usesRemaining, isReadOnly, onPersUpdate }: { pers: PersWithRelations; feature: PersCustomFeature; usesMax: number; usesRemaining: number; isReadOnly?: boolean; onPersUpdate?: (next: PersWithRelations) => void }) {
  const { commitOperation } = useOfflineQueue();
  const showUses = (next: number) => onPersUpdate?.({ ...pers, persCustomFeatures: (pers.persCustomFeatures ?? []).map((row) => (row.id === feature.id ? { ...row, usesRemaining: next } : row)) });

  const step = async (direction: "spend" | "restore") => {
    showUses(usesRemaining + (direction === "spend" ? -1 : 1));
    const outcome = await commitOperation(
      { kind: "custom-feature-use", customFeatureId: feature.id, direction, operationId: createOperationId(), persId: pers.persId, createdAt: new Date().toISOString() },
      (operationId) => stepCustomFeatureUseAction(pers.persId, feature.id, direction, operationId),
    ).catch(() => null);
    if (outcome?.queued || outcome?.result.success) return;
    showUses(usesRemaining);
    toast.error(outcome?.result.success === false ? outcome.result.error : FAILED_STEP_ERROR);
  };

  const restLabel = feature.restoredOn ? REST_LABELS[feature.restoredOn] : "вручну";
  return (
    <div className="flex items-center gap-1">
      {isReadOnly ? null : <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Витратити: ${feature.name}`} disabled={usesRemaining === 0} onClick={() => step("spend")}><Minus className="h-4 w-4" aria-hidden /></Button>}
      <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-violet-200">{usesRemaining}/{usesMax}</span>
      {isReadOnly ? null : <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Повернути: ${feature.name}`} disabled={usesRemaining === usesMax} onClick={() => step("restore")}><Plus className="h-4 w-4" aria-hidden /></Button>}
      <span className="text-xs text-slate-400">{restLabel}</span>
    </div>
  );
}
