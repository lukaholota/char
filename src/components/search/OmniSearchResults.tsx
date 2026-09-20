"use client";

import type { OmniSearchCategory, OmniSearchItem } from "@/lib/omniSearchData";
import type { OmniSearchRow } from "@/lib/search/omniSearchRows";
import { OmniSearchItemRow } from "@/components/search/OmniSearchItemRow";
import { OmniSearchMoreRow } from "@/components/search/OmniSearchMoreRow";

type Props = {
  rows: OmniSearchRow[];
  selectedIndex: number;
  onSelect: (item: OmniSearchItem) => void;
  onShowMore: (category: OmniSearchCategory) => void;
  query: string;
  pendingItemId?: string | null;
};

export function OmniSearchResults({ rows, selectedIndex, onSelect, onShowMore, query, pendingItemId }: Props) {
  if (rows.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <p className="text-base font-semibold text-slate-300">Нічого не знайдено</p>
        <p className="text-xs text-slate-500 mt-1">
          За запитом «{query}» не знайдено жодної сутності в поточній редакції.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2 pr-1">
      {rows.map((row, index) => (
        <div key={row.key} data-omni-index={index}>
          {row.kind === "item" ? (
            <OmniSearchItemRow
              item={row.item}
              isSelected={index === selectedIndex}
              isPending={row.item.id === pendingItemId}
              onSelect={() => onSelect(row.item)}
            />
          ) : (
            <OmniSearchMoreRow
              categoryLabel={row.categoryLabel}
              hiddenCount={row.hiddenCount}
              isSelected={index === selectedIndex}
              onSelect={() => onShowMore(row.category)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
