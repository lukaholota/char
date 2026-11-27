"use client";

import { useState, type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Check, Heart, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type HitPointsEdit = { max?: number; current?: number; temp?: number; damage?: number; heal?: number };
type EditField = keyof HitPointsEdit;
type Drafts = Partial<Record<EditField, string>>;

type HitPointsEditorProps = {
  current: number | null;
  max: number | null;
  temp?: number;
  disabled?: boolean;
  onApply: (edit: HitPointsEdit) => void;
};

const MAX_DIGITS = 4;

export function HitPointsEditor({ current, max, temp, disabled = false, onApply }: HitPointsEditorProps) {
  const [drafts, setDrafts] = useState<Drafts>({});
  const edit = readHitPointsEdit(drafts, { current, max, temp });
  const hasEdit = Object.keys(edit).length > 0;
  const hasHitPoints = current !== null && max !== null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || !hasEdit) return;
    onApply(edit);
    setDrafts({});
  };
  const bindField = (field: EditField, shown: number | null | undefined) => ({
    inputMode: "numeric" as const,
    enterKeyHint: "done" as const,
    maxLength: MAX_DIGITS,
    value: drafts[field] ?? (shown === null || shown === undefined ? "" : String(shown)),
    onChange: (event: ChangeEvent<HTMLInputElement>) => setDrafts((previous) => ({ ...previous, [field]: event.target.value.replace(/\D/g, "") })),
  });

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className={cn("grid gap-2", temp === undefined ? "grid-cols-2" : "grid-cols-3")}>
        <ValueField label="Поточні">
          <Input aria-label="Поточні хіти" disabled={disabled || !hasHitPoints} placeholder="—" className="h-11 text-center font-mono text-lg" {...bindField("current", current)} />
        </ValueField>
        <ValueField label="Максимум">
          <Input aria-label="Максимум хітів" disabled={disabled} placeholder="—" className="h-11 text-center font-mono text-lg" {...bindField("max", max)} />
        </ValueField>
        {temp === undefined ? null : (
          <ValueField label="Тимчасові">
            <Input aria-label="Тимчасові хіти" disabled={disabled || !hasHitPoints} className="h-11 border-sky-400/40 text-center font-mono text-lg" {...bindField("temp", temp)} />
          </ValueField>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2">
        <ChangeField icon={<Sword className="h-4 w-4" />} label="Шкода" disabled={disabled || !hasHitPoints} className="border-rose-500/50 bg-rose-500/10 text-rose-50 placeholder:text-rose-200/50 focus-visible:ring-rose-400" {...bindField("damage", null)} />
        <Button type="submit" disabled={disabled || !hasEdit} className="h-11 gap-1.5 bg-slate-200 px-3 text-slate-900 hover:bg-slate-100">
          <Check className="h-4 w-4" aria-hidden />
          Застосувати
        </Button>
        <ChangeField icon={<Heart className="h-4 w-4" />} label="Лікування" disabled={disabled || !hasHitPoints} className="border-emerald-500/50 bg-emerald-500/10 text-emerald-50 placeholder:text-emerald-200/50 focus-visible:ring-emerald-400" {...bindField("heal", null)} />
      </div>
    </form>
  );
}

function ValueField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs text-slate-400">
      {label}
      {children}
    </label>
  );
}

function ChangeField({ icon, label, className, ...inputProps }: { icon: ReactNode; label: string } & ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2.5 grid place-items-center opacity-80">
        {icon}
      </span>
      <Input aria-label={label} className={cn("h-11 pl-8 font-mono", className)} {...inputProps} />
    </div>
  );
}

/// Порожнє поле чи те саме число — не зміна; максимум не менший за 1, шкода й лікування — від 1.
export function readHitPointsEdit(drafts: Drafts, shown: { current: number | null; max: number | null; temp?: number }): HitPointsEdit {
  const edit: HitPointsEdit = {};
  const read = (field: EditField) => (drafts[field] ? Number(drafts[field]) : null);
  const max = read("max");
  if (max !== null && max >= 1 && max !== shown.max) edit.max = max;
  const current = read("current");
  if (current !== null && current !== shown.current) edit.current = current;
  const temp = read("temp");
  if (temp !== null && shown.temp !== undefined && temp !== shown.temp) edit.temp = temp;
  const damage = read("damage");
  if (damage) edit.damage = damage;
  const heal = read("heal");
  if (heal) edit.heal = heal;
  return edit;
}
