"use client";

import type { ReactNode } from "react";
import { RichTextEditor } from "@/components/ui/rich-text/RichTextEditor";
import { cn } from "@/lib/utils";

const CONTROL = "w-full rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-base text-slate-100 outline-none focus:ring-1 focus:ring-amber-400/40 sm:text-sm";

type FieldShell = { name: string; label: string; error?: string; hint?: string; className?: string };

export function FormField({ name, label, error, hint, className, children }: FieldShell & { children: ReactNode }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor={`homebrew-${name}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={describedBy(name)} className="text-xs text-rose-300">{error}</p>
      ) : hint ? (
        <p id={describedBy(name)} className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function describedBy(name: string): string {
  return `homebrew-${name}-note`;
}

export function TextField(props: FieldShell & { value: string; onChange: (value: string) => void; maxLength: number; placeholder?: string; list?: string }) {
  return (
    <FormField {...props}>
      <input id={`homebrew-${props.name}`} aria-describedby={describedBy(props.name)} aria-invalid={Boolean(props.error)} value={props.value} maxLength={props.maxLength} placeholder={props.placeholder} list={props.list} onChange={(event) => props.onChange(event.target.value)} className={cn(CONTROL, "h-11 sm:h-10", props.error && "border-rose-400/60")} />
    </FormField>
  );
}

export function RichTextField(props: FieldShell & { value: string; onChange: (value: string) => void; isTall?: boolean; placeholder?: string }) {
  return (
    <FormField {...props}>
      <RichTextEditor id={`homebrew-${props.name}`} ariaDescribedBy={describedBy(props.name)} isInvalid={Boolean(props.error)} value={props.value} onChange={props.onChange} placeholder={props.placeholder} contentClassName={props.isTall ? "min-h-48" : undefined} />
    </FormField>
  );
}

export function SelectField(props: FieldShell & { value: string; onChange: (value: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <FormField {...props}>
      <select id={`homebrew-${props.name}`} aria-describedby={describedBy(props.name)} aria-invalid={Boolean(props.error)} value={props.value} onChange={(event) => props.onChange(event.target.value)} className={cn(CONTROL, "h-11 sm:h-10", props.error && "border-rose-400/60")}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function ToggleChip({ label, isOn, onToggle }: { label: string; isOn: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={cn("min-h-10 rounded-full border px-3 text-sm transition", isOn ? "border-amber-400/60 bg-amber-500/20 text-amber-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")}
    >
      {label}
    </button>
  );
}

export const RULESET_OPTIONS = [
  { value: "RULES_2014", label: "Редакція 2014" },
  { value: "RULES_2024", label: "Редакція 2024" },
  { value: "ANY", label: "Обидві редакції" },
] as const;
