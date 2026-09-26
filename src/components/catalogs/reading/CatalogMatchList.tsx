"use client";

import type { CatalogMatch } from "@/lib/catalogs/reading-matches";

const VISIBLE_MATCH_LIMIT = 6;

export function CatalogMatchList<TTarget>({
  matches,
  onOpen,
}: {
  matches: readonly CatalogMatch<TTarget>[];
  onOpen: (target: TTarget) => void;
}) {
  if (matches.length === 0) return null;
  const hiddenCount = matches.length - VISIBLE_MATCH_LIMIT;

  return (
    <ul aria-label="Знайдено всередині" className="mt-1.5 flex flex-wrap gap-1.5 px-1">
      {matches.slice(0, VISIBLE_MATCH_LIMIT).map((match) => (
        <li key={match.key} className="max-w-full">
          <button
            type="button"
            onClick={() => onOpen(match.target)}
            className="min-h-10 max-w-full truncate rounded-lg border border-white/10 bg-slate-900/60 px-2.5 text-left text-xs text-slate-200 hover:bg-white/5"
          >
            {match.label}
            <span className="text-slate-500"> · {match.context}</span>
          </button>
        </li>
      ))}
      {hiddenCount > 0 ? <li className="self-center text-xs text-slate-500">ще {hiddenCount} — уточніть запит</li> : null}
    </ul>
  );
}
