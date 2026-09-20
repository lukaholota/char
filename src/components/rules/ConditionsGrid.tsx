"use client";

import { useState, useMemo } from "react";
import { ConditionData } from "@/lib/rulesData";
import { cn } from "@/lib/utils";
import { ShieldAlert, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { buildConditionAnchor } from "@/lib/term-card";
import { findAccentVariant } from "@/styles/edition-accent";

type Props = {
  conditions: ConditionData[];
  is2024?: boolean;
  className?: string;
};

export function ConditionsGrid({ conditions, is2024 = false, className }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<ConditionData | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conditions;
    return conditions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.engName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.bulletPoints.some((b) => b.toLowerCase().includes(q))
    );
  }, [conditions, search]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Пошук стану (напр. Сліпий, Отруєний)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900/60 border-white/10 text-slate-200 placeholder:text-slate-500 rounded-xl"
          />
        </div>
        <div className="text-xs text-slate-400 self-end sm:self-center">
          Знайдено станів: <span className="font-semibold text-slate-200">{filtered.length}</span> з {conditions.length}
        </div>
      </div>

      {/* Grid of conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cond) => {
          const isSelected = selectedCondition?.id === cond.id;
          return (
            <div
              key={cond.id}
              id={buildConditionAnchor(cond.id)}
              onClick={() => setSelectedCondition(isSelected ? null : cond)}
              className={cn(
                "glass-card scroll-mt-24 rounded-2xl border p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group",
                isSelected
                  ? findAccentVariant(is2024, { prism: "border-prism-500/60 bg-prism-950/20 shadow-[0_0_20px_rgba(192,74,224,0.2)]", arcane: "border-arcane-500/60 bg-arcane-950/20 shadow-[0_0_20px_rgba(45,212,191,0.2)]" })
                  : "border-white/10 bg-slate-950/50 hover:border-white/20 hover:bg-slate-900/60"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-800/60 bg-emerald-950/50 text-emerald-300">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-rpg-display text-xl text-slate-100 group-hover:text-prism-300 transition-colors">
                        {cond.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono italic">{cond.engName}</p>
                    </div>
                  </div>
                  {cond.ruleset === "RULES_2024" && (
                    <span className="rounded-md border border-prism-500/30 bg-prism-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-prism-300">
                      2024
                    </span>
                  )}
                </div>

                <FormattedDescription
                  content={cond.description}
                  className="mt-3 text-slate-300"
                />

                {/* Bullet points */}
                <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                  {cond.bulletPoints.map((bullet, idx) => (
                    <li key={idx} className="text-sm text-slate-300/90 flex items-start gap-2">
                      <span className="text-arcane-400 select-none">•</span>
                      <FormattedDescription content={bullet} className="min-w-0 flex-1 text-slate-300/90" />
                    </li>
                  ))}
                </ul>
              </div>

              {is2024 && cond.editionDiff && (
                <div className="mt-4 rounded-xl border border-prism-500/30 bg-prism-950/30 p-2.5 flex items-start gap-2 text-[11px] text-prism-200">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-prism-400 mt-0.5" />
                  <div>{cond.editionDiff}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
