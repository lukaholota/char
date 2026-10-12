"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PresetOptionPicker({ label, options, selected, onChange }: {
  label: string; options: { value: string; label: string; disabled?: boolean }[];
  selected: string; onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = options.filter((option) => option.value === selected || option.label.toLocaleLowerCase("uk").includes(query.trim().toLocaleLowerCase("uk")));
  return <fieldset className="space-y-3">
    <legend className="text-sm text-slate-300">{label}</legend>
    {options.length > 12 ? <Input aria-label={`Пошук: ${label}`} placeholder="Знайти…" value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11" /> : null}
    <div className="grid gap-2 sm:grid-cols-2">{visible.map((option) => <Button key={option.value} type="button" variant="outline" disabled={option.disabled} aria-pressed={selected === option.value} onClick={() => onChange(option.value)} className={`h-auto min-h-12 justify-start whitespace-normal p-3 text-left ${selected === option.value ? "border-arcane-400 bg-arcane-500/15" : ""}`}>{selected === option.value ? "✓ " : ""}{option.label}</Button>)}</div>
    {!visible.length ? <p className="text-sm text-slate-400">Нічого не знайдено.</p> : null}
  </fieldset>;
}
