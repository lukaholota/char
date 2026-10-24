"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Ruleset } from "@/rules/types";

export type SelectedSpellGroup = { label: string; ids: readonly number[] };
type SpellName = { spellId: number; name: string };

export function SelectedSpellSummary({ groups, ruleset }: { groups: readonly SelectedSpellGroup[]; ruleset: Ruleset }) {
  const ids = [...new Set(groups.flatMap((group) => [...group.ids]))].sort((a, b) => a - b).join(",");
  const query = new URLSearchParams({ ruleset, ids }).toString();
  const [loaded, setLoaded] = useState<{ query: string; spells: SpellName[]; failed: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    fetch(`/api/spells/selected?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Selected spells: ${response.status}`);
        const spells: SpellName[] = await response.json();
        if (!controller.signal.aborted) setLoaded({ query, spells, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ query, spells: [], failed: true });
      });
    return () => controller.abort();
  }, [ids, query, retry]);
  if (!ids) return null;
  if (!loaded || loaded.query !== query) return <p role="status" className="text-sm text-slate-400">Завантажуємо назви вибраних заклинань…</p>;
  if (loaded.failed) return <div role="alert" className="space-y-2 text-sm text-slate-300">
    <p>Не вдалося завантажити назви заклинань. Ваші вибори збережені в чернетці.</p>
    <Button type="button" variant="outline" onClick={() => { setLoaded(null); setRetry((attempt) => attempt + 1); }}>Спробувати ще раз</Button>
  </div>;
  const names = new Map(loaded.spells.map((spell) => [spell.spellId, spell.name]));
  return <div className="space-y-3">
    {groups.filter((group) => group.ids.length > 0).map((group) => <section key={group.label} aria-label={group.label}>
      <h3 className="text-sm font-semibold text-slate-200">{group.label}</h3>
      <ul className="mt-1 space-y-1 text-sm text-slate-300">{group.ids.map((id) => <li key={id} className="break-words">{names.get(id) ?? "Заклинання недоступне в цій редакції — поверніться до вибору"}</li>)}</ul>
    </section>)}
  </div>;
}
