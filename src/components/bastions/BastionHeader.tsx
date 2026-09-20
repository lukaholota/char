"use client";

import { useState, useTransition } from "react";
import { Anchor, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BelowStandardLevelHint } from "@/components/bastions/BastionFacilityBasics";
import { BastionRemoveButton } from "@/components/bastions/BastionRemoveButton";
import { bastionFieldLabelClassName, bastionSectionClassName, bastionTextAreaClassName } from "@/components/bastions/bastion-field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { removeBastion, saveBastionDetails } from "@/lib/actions/bastion-actions";
import { summarizeFacilities } from "@/rules/bastions";
import type { BastionFacilityView, BastionRecord, BastionStanding } from "@/server/db/bastions";

export function BastionHeader({
  standing,
  bastion,
  views,
  onChanged,
}: {
  standing: BastionStanding;
  bastion: BastionRecord;
  views: readonly BastionFacilityView[];
  onChanged: (next: BastionStanding) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <section className={bastionSectionClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-slate-400">
            <span className="text-xs uppercase tracking-[0.1em] text-emerald-300/90">Бастіон</span> · {standing.persName} · рівень {standing.characterLevel}
          </p>
          <h1 className="break-words text-2xl font-bold text-slate-50 sm:text-3xl">{bastion.name}</h1>
        </div>
        {isEditing ? null : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="shrink-0 gap-2 text-slate-300">
            <Pencil className="h-4 w-4" />
            <span className="max-sm:sr-only">Редагувати опис</span>
          </Button>
        )}
      </div>

      <BastionSummaryLine bastion={bastion} views={views} />
      <BelowStandardLevelHint standing={standing} />

      {isEditing ? (
        <BastionDetailsForm
          standing={standing}
          bastion={bastion}
          onSaved={(next) => {
            onChanged(next);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <BastionDetailsText bastion={bastion} />
      )}
    </section>
  );
}

function BastionSummaryLine({ bastion, views }: { bastion: BastionRecord; views: readonly BastionFacilityView[] }) {
  const summary = summarizeFacilities(views);
  if (views.length === 0 && !bastion.isMaintaining) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
      {summary.specialCount > 0 ? <span>Спеціальних: {summary.specialCount}</span> : null}
      {summary.basicCount > 0 ? <span>Базових: {summary.basicCount}</span> : null}
      {summary.defenders > 0 ? <span>Захисників: {summary.defenders}</span> : null}
      {bastion.isMaintaining ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-300">
          <Anchor className="h-3 w-3" />
          На утриманні
        </span>
      ) : null}
    </p>
  );
}

function BastionDetailsText({ bastion }: { bastion: BastionRecord }) {
  if (!bastion.description && !bastion.notes) {
    return <p className="text-sm text-slate-400">Антуражу й нотаток ще немає.</p>;
  }

  return (
    <div className="space-y-3">
      {bastion.description ? <p className="whitespace-pre-line text-base leading-relaxed text-slate-200">{bastion.description}</p> : null}
      {bastion.notes ? (
        <div className="space-y-1">
          <h2 className={bastionFieldLabelClassName}>Нотатки</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{bastion.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function BastionDetailsForm({
  standing,
  bastion,
  onSaved,
  onCancel,
}: {
  standing: BastionStanding;
  bastion: BastionRecord;
  onSaved: (next: BastionStanding) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(bastion.name);
  const [description, setDescription] = useState(bastion.description);
  const [notes, setNotes] = useState(bastion.notes);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveBastionDetails({ persId: standing.persId, name, description, notes });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onSaved(result.standing);
      toast.success("Опис бастіону збережено");
    });
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className={bastionFieldLabelClassName}>Назва</span>
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
      </label>

      <label className="block space-y-1">
        <span className={bastionFieldLabelClassName}>Антураж</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={bastionTextAreaClassName} />
      </label>

      <label className="block space-y-1">
        <span className={bastionFieldLabelClassName}>Нотатки</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={bastionTextAreaClassName} />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={isPending}>
          Зберегти опис
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Скасувати
        </Button>
      </div>

      <BastionRemoval standing={standing} onRemoved={onSaved} />
    </div>
  );
}

function BastionRemoval({ standing, onRemoved }: { standing: BastionStanding; onRemoved: (next: BastionStanding) => void }) {
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      const result = await removeBastion(standing.persId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onRemoved({ ...standing, bastion: null });
      toast.success("Бастіон видалено");
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
      <p className="text-sm text-slate-400">Разом із бастіоном зникнуть усі приміщення й журнал ходів.</p>
      <BastionRemoveButton label="Видалити бастіон" confirmLabel="Точно видалити?" isPending={isPending} onConfirm={remove} />
    </div>
  );
}
