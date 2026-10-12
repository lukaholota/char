"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SpellChoiceGrid } from "@/components/spells/SpellChoiceGrid";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";

function describeSpellLevel(spell: SpellChoiceOption) {
  return spell.level === 0 ? "Замовляння" : `${spell.level}-й рівень`;
}

export function PresetSpellPicker({ label, spells, selectedIds, limit, onChange, isSelectable }: {
  label: string; spells: readonly SpellChoiceOption[]; selectedIds: readonly number[];
  limit: number; onChange: (ids: number[]) => void; isSelectable?: (spell: SpellChoiceOption) => boolean;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("uk");
  const visible = spells.filter((spell) => selectedIds.includes(spell.spellId) || `${spell.name} ${spell.engName}`.toLocaleLowerCase("uk").includes(normalized));
  return <section aria-label={label} className="space-y-4">
    <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg text-white">{label}</h3><span className="shrink-0 text-sm text-slate-400">{selectedIds.length} / {limit}</span></div>
    <Input aria-label={`Пошук: ${label}`} placeholder="Знайти заклинання…" value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11" />
    <SpellChoiceGrid spells={visible} selectedIds={selectedIds} limit={limit} onChange={onChange} findGroupLabel={describeSpellLevel} isSelectable={isSelectable} />
    {!visible.length ? <p className="text-sm text-slate-400">Заклинань не знайдено. Спробуйте іншу назву.</p> : null}
  </section>;
}
