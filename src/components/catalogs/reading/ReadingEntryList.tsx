"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import { FormattedDescription } from "@/components/ui/FormattedDescription";
import type { ReadingEntry } from "@/lib/catalogs/reading-entries";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

type LevelGroup = { level: number | null; entries: ReadingEntry[] };

export function ReadingEntryList({
  entries,
  targetKey,
  focusRequest,
  is2024,
  isExpandedByDefault = false,
}: {
  entries: readonly ReadingEntry[];
  targetKey: string | null;
  focusRequest: number;
  is2024: boolean;
  isExpandedByDefault?: boolean;
}) {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(() =>
    new Set(isExpandedByDefault ? entries.map((entry) => entry.key) : targetKey ? [targetKey] : []),
  );
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!targetKey) return;
    setExpandedKeys((current) => (current.has(targetKey) ? current : new Set([...current, targetKey])));
  }, [targetKey, focusRequest]);

  useEffect(() => {
    if (targetKey) targetRef.current?.scrollIntoView({ block: "start" });
  }, [targetKey, focusRequest]);

  const toggle = (key: string) =>
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {entries.length > 1 ? (
        <ExpandAllButtons
          onExpandAll={() => setExpandedKeys(new Set(entries.map((entry) => entry.key)))}
          onCollapseAll={() => setExpandedKeys(new Set())}
        />
      ) : null}

      {groupByLevel(entries).map((group) => (
        <section key={group.level ?? "all"} aria-label={group.level ? `${group.level} рівень` : undefined}>
          {group.level ? (
            <h3
              className={cn(
                "mb-2 text-xs font-semibold uppercase tracking-wider",
                findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" }),
              )}
            >
              {group.level} рівень
            </h3>
          ) : null}
          <div className="space-y-2">
            {group.entries.map((entry) => (
              <EntryItem
                key={entry.key}
                entry={entry}
                isExpanded={expandedKeys.has(entry.key)}
                isTarget={entry.key === targetKey}
                is2024={is2024}
                onToggle={() => toggle(entry.key)}
                targetRef={entry.key === targetKey ? targetRef : undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EntryItem({
  entry,
  isExpanded,
  isTarget,
  is2024,
  onToggle,
  targetRef,
}: {
  entry: ReadingEntry;
  isExpanded: boolean;
  isTarget: boolean;
  is2024: boolean;
  onToggle: () => void;
  targetRef?: React.Ref<HTMLDivElement>;
}) {
  const descriptionId = `reading-entry-${entry.key}`;

  return (
    <div
      ref={targetRef}
      data-reading-entry={entry.key}
      className={cn(
        "scroll-mt-28 rounded-xl border border-white/10 bg-white/[0.03]",
        isTarget && cn("outline-2 outline-offset-2 [outline-style:solid]", findAccentVariant(is2024, { prism: "outline-prism-400/70", arcane: "outline-arcane-400/70" })),
      )}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={descriptionId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left"
      >
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-500", isExpanded && "rotate-90")} />
        <span className="min-w-0 flex-1 font-rpg-display text-[17px] leading-snug tracking-wide text-slate-100">{entry.name}</span>
      </button>
      {isExpanded ? (
        <div id={descriptionId} className="px-3 pb-3">
          <FormattedDescription content={entry.description} className="text-sm leading-relaxed text-slate-300" />
        </div>
      ) : null}
    </div>
  );
}

function ExpandAllButtons({ onExpandAll, onCollapseAll }: { onExpandAll: () => void; onCollapseAll: () => void }) {
  const className = "min-h-10 rounded-lg border border-white/10 bg-slate-900/40 px-3 text-xs font-medium text-slate-300 hover:bg-white/5";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onExpandAll} className={className}>
        Розгорнути всі
      </button>
      <button type="button" onClick={onCollapseAll} className={className}>
        Згорнути всі
      </button>
    </div>
  );
}

function groupByLevel(entries: readonly ReadingEntry[]): LevelGroup[] {
  const groups: LevelGroup[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.level === entry.level) last.entries.push(entry);
    else groups.push({ level: entry.level, entries: [entry] });
  }
  return groups;
}
