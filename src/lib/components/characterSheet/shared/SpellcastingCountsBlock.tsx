"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatSpellCountValue, type SpellcastingCountsLine } from "@/lib/logic/spellcasting-progression";
import type { PreparedSpellTallies } from "@/rules/prepared-spell-limits";
import type { SpellbookTally } from "@/rules/class-spell-choices-2024";

interface Props {
  lines: readonly SpellcastingCountsLine[];
  knownSpellsCount: number;
  knownCantripsCount: number;
  preparedSpellsCount: number;
  preparedTallies: PreparedSpellTallies;
  excludedFromPreparedCount: number;
  excludedFromKnownCount: number;
  spellbook: { lineKey: string; tally: SpellbookTally } | null;
}

export default function SpellcastingCountsBlock(props: Props) {
  const { lines, preparedTallies } = props;
  if (lines.length === 0) return null;

  const isMulticlassLimit = preparedTallies.byClass.length > 1;
  const singleClassLimit = preparedTallies.byClass.length === 1 ? preparedTallies.byClass[0].limit : null;

  return (
    <Collapsible defaultOpen={false} className="rounded-lg border border-white/10 bg-white/5">
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
            Кількість відомих / підготовлених
          </div>
          <div className="text-xs text-slate-400">Залежить від рівня класу та модифікатора</div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-300" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <div className="mb-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          Заклинань: <span className="font-semibold">{props.knownSpellsCount}</span>
          {" · "}
          Замовлянь: <span className="font-semibold">{props.knownCantripsCount}</span>
          {" · "}
          Підготовлено: <span className="font-semibold">{props.preparedSpellsCount}</span>
          {singleClassLimit !== null ? (
            <>
              {" / "}
              <span className="font-semibold">{singleClassLimit}</span>
            </>
          ) : null}
        </div>

        {isMulticlassLimit && preparedTallies.unassigned > 0 ? (
          <div className="mb-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            Підготовлено без бейджа класу: {preparedTallies.unassigned}. Додайте бейдж, щоб зарахувати до класу.
          </div>
        ) : null}

        {props.excludedFromPreparedCount > 0 ? (
          <div className="mb-2 rounded-md border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/90">
            Не рахуємо у підготовлених: {props.excludedFromPreparedCount}.
          </div>
        ) : null}

        {props.excludedFromKnownCount > 0 ? (
          <div className="mb-2 rounded-md border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100/90">
            Не рахуємо у відомих: {props.excludedFromKnownCount}.
          </div>
        ) : null}

        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm font-semibold text-slate-100">
                {line.name} <span className="text-xs font-normal text-slate-400">(рів. {line.level})</span>
              </div>
              <div className="text-xs text-slate-200/80">
                Замовлянь: <span className="font-semibold text-slate-100">{line.cantrips}</span>
                {", "}
                {line.spellsLabel}: <span className="font-semibold text-slate-100">{formatSpellCountValue(line.spells)}</span>
                {line.spellsNote ? ` ${line.spellsNote}` : null}
              </div>
              {isMulticlassLimit ? <ClassPreparedTally tallies={preparedTallies} lineKey={line.key} /> : null}
              {props.spellbook?.lineKey === line.key ? <SpellbookCount tally={props.spellbook.tally} /> : null}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SpellbookCount({ tally }: { tally: SpellbookTally }) {
  return (
    <div className={tally.inBook < tally.size ? "text-xs text-amber-200/90" : "text-xs text-emerald-100/90"}>
      Книга заклинань: <span className="font-semibold">{tally.inBook}</span> / <span className="font-semibold">{tally.size}</span>
    </div>
  );
}

function ClassPreparedTally({ tallies, lineKey }: { tallies: PreparedSpellTallies; lineKey: string }) {
  const tally = tallies.byClass.find((entry) => entry.key === lineKey);
  if (!tally) return null;

  return (
    <div className={tally.prepared > tally.limit ? "text-xs text-rose-300" : "text-xs text-emerald-100/90"}>
      Підготовлено: <span className="font-semibold">{tally.prepared}</span> / <span className="font-semibold">{tally.limit}</span>
    </div>
  );
}
