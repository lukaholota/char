"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Pencil, Shield, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { BastionFacilityKindLabel, BastionFacilityReplaceSelect, BastionFacilitySpaceSelect } from "@/components/bastions/BastionFacilityBasics";
import { BastionFacilityDetailDialog } from "@/components/bastions/BastionFacilityDetailDialog";
import { BastionMatchBadge } from "@/components/bastions/BastionPicking";
import { BastionRemoveButton } from "@/components/bastions/BastionRemoveButton";
import { bastionFieldLabelClassName, bastionSelectClassName, bastionTextAreaClassName } from "@/components/bastions/bastion-field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { removeFacility, saveFacilityState } from "@/lib/actions/bastion-actions";
import { splitOrderCodesByCatalog, toBastionSpace } from "@/lib/bastion-facility";
import { bastionOrderTranslations } from "@/lib/refs/translation";
import type { BastionFacilityView, BastionOrderCode, BastionReplacementOption } from "@/server/db/bastions";

type FacilityStateChange = Partial<Pick<BastionFacilityView, "space" | "currentOrder" | "defenders" | "hirelings" | "notes">>;

export function BastionFacilityCard({
  persId,
  view,
  replacementOptions,
  onChanged,
}: {
  persId: number;
  view: BastionFacilityView;
  replacementOptions: readonly BastionReplacementOption[];
  onChanged: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const saveState = (change: FacilityStateChange, onDone?: () => void) => {
    const next = { ...view, ...change };
    startSaving(async () => {
      const result = await saveFacilityState({
        persId,
        facilityId: view.facilityId,
        space: toBastionSpace(next.space),
        currentOrder: next.currentOrder,
        defenders: next.defenders,
        hirelings: next.hirelings,
        notes: next.notes,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await onChanged();
      onDone?.();
    });
  };

  return (
    <article className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-100">
            {view.match ? <BastionFacilityDetailDialog slug={view.slug} name={view.name ?? view.slug} /> : view.name ?? view.slug}
          </h3>
          <BastionFacilityKindLabel view={view} />
        </div>
        {isEditing ? null : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="shrink-0 text-slate-300" aria-label={`Редагувати: ${view.name ?? view.slug}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <BastionFacilityStanding view={view} />

      {isOrderShown(view) ? (
        <BastionFacilityOrderSelect view={view} isSaving={isSaving} onChange={(currentOrder) => saveState({ currentOrder }, () => toast.success("Наказ збережено"))} />
      ) : null}

      {isEditing ? (
        <BastionFacilityEditForm
          persId={persId}
          view={view}
          replacementOptions={replacementOptions}
          isSaving={isSaving}
          onSave={(change) => saveState(change, () => {
            setIsEditing(false);
            toast.success("Приміщення збережено");
          })}
          onCancel={() => setIsEditing(false)}
          onChanged={onChanged}
        />
      ) : (
        <BastionFacilityFacts view={view} />
      )}
    </article>
  );
}

/// Базовим приміщенням каталог наказів не дає; селект лишається лише там, де наказ уже стоїть, щоб його можна було зняти.
function isOrderShown(view: BastionFacilityView): boolean {
  return view.allowedOrderCodes.length > 0 || view.currentOrder !== null;
}

function BastionFacilityStanding({ view }: { view: BastionFacilityView }) {
  if (!view.match) return <p className="text-sm text-amber-300">Приміщення більше немає в каталозі</p>;

  const needsBadge = view.match.status !== "met" || view.match.isAboveCharacterLevel;
  return (
    <>
      {needsBadge ? <BastionMatchBadge level={view.level} prerequisiteText={view.prerequisiteText} match={view.match} /> : null}
      {view.heroicInspirationHint ? (
        <p className="flex items-start gap-1.5 text-sm text-amber-200/90">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{view.heroicInspirationHint}</span>
        </p>
      ) : null}
    </>
  );
}

export function BastionFacilityOrderSelect({
  view,
  isSaving,
  onChange,
}: {
  view: BastionFacilityView;
  isSaving: boolean;
  onChange: (order: BastionOrderCode | null) => void;
}) {
  const { catalog, other } = splitOrderCodesByCatalog(view.allowedOrderCodes);
  const isOutsideCatalog = view.currentOrder !== null && !catalog.some((code) => code === view.currentOrder);

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-3">
        <span className={bastionFieldLabelClassName}>Наказ</span>
        <select
          value={view.currentOrder ?? ""}
          disabled={isSaving}
          onChange={(event) => onChange((event.target.value || null) as BastionOrderCode | null)}
          className={`${bastionSelectClassName} max-w-xs`}
        >
          <option value="">Без наказу</option>
          {catalog.map((code) => (
            <option key={code} value={code}>
              {bastionOrderTranslations[code]}
            </option>
          ))}
          <optgroup label="Поза каталогом — домашнє правило">
            {other.map((code) => (
              <option key={code} value={code}>
                {bastionOrderTranslations[code]}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      {isOutsideCatalog ? (
        <p className="flex items-start gap-1.5 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {catalog.length > 0
            ? `За каталогом це приміщення виконує наказ «${catalog.map((code) => bastionOrderTranslations[code]).join("», «")}»`
            : "Базовим приміщенням каталог наказів не дає"}
        </p>
      ) : null}
    </div>
  );
}

function BastionFacilityFacts({ view }: { view: BastionFacilityView }) {
  const expectsHirelings = view.expectedHirelings !== "" && view.expectedHirelings !== "—";

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
      {view.defenders > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-slate-400" />
          Захисників: {view.defenders}
        </span>
      ) : null}
      {view.hirelings || expectsHirelings ? (
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {view.hirelings ? `Найманці: ${view.hirelings}` : <span className="text-slate-400">Найманців очікується {view.expectedHirelings}</span>}
        </span>
      ) : null}
      {view.notes ? <p className="basis-full whitespace-pre-line text-slate-400">{view.notes}</p> : null}
    </div>
  );
}

function BastionFacilityEditForm({
  persId,
  view,
  replacementOptions,
  isSaving,
  onSave,
  onCancel,
  onChanged,
}: {
  persId: number;
  view: BastionFacilityView;
  replacementOptions: readonly BastionReplacementOption[];
  isSaving: boolean;
  onSave: (change: FacilityStateChange) => void;
  onCancel: () => void;
  onChanged: () => Promise<void>;
}) {
  const [space, setSpace] = useState(view.space);
  const [defenders, setDefenders] = useState(String(view.defenders));
  const [hirelings, setHirelings] = useState(view.hirelings);
  const [notes, setNotes] = useState(view.notes);

  return (
    <div className="space-y-3 rounded-xl bg-slate-950/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <BastionFacilitySpaceSelect view={view} value={space} onChange={setSpace} />
        <label className="block space-y-1">
          <span className={bastionFieldLabelClassName}>Захисники</span>
          <Input type="number" min={0} value={defenders} onChange={(event) => setDefenders(event.target.value)} />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={bastionFieldLabelClassName}>
            Найманці{view.expectedHirelings && view.expectedHirelings !== "—" ? ` · очікується ${view.expectedHirelings}` : ""}
          </span>
          <Input value={hirelings} onChange={(event) => setHirelings(event.target.value)} placeholder="Імена найманців" />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className={bastionFieldLabelClassName}>Нотатки</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={bastionTextAreaClassName}
            placeholder="Кастомне формулювання наказу, план на наступний хід тощо"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isSaving} onClick={() => onSave({ space, defenders: Number(defenders), hirelings, notes })}>
          Зберегти
        </Button>
        <Button size="sm" variant="ghost" disabled={isSaving} onClick={onCancel}>
          Скасувати
        </Button>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-3">
        <BastionFacilityReplaceSelect persId={persId} view={view} options={replacementOptions} onReplaced={onChanged} />
        <BastionFacilityRemoval persId={persId} facilityId={view.facilityId} onRemoved={onChanged} />
      </div>
    </div>
  );
}

function BastionFacilityRemoval({ persId, facilityId, onRemoved }: { persId: number; facilityId: number; onRemoved: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      const result = await removeFacility({ persId, facilityId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await onRemoved();
      toast.success("Приміщення прибрано");
    });
  };

  return <BastionRemoveButton label="Прибрати приміщення" confirmLabel="Точно прибрати?" isPending={isPending} onConfirm={remove} />;
}
