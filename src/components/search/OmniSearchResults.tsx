"use client";

import type { OmniSearchItem } from "@/lib/omniSearchData";
import { OmniSearchItemRow } from "@/components/search/OmniSearchItemRow";

type Props = {
  results: OmniSearchItem[];
  selectedIndex: number;
  onSelect: (item: OmniSearchItem) => void;
  query: string;
  pendingItemId?: string | null;
};

export function OmniSearchResults({ results, selectedIndex, onSelect, query, pendingItemId }: Props) {
  if (results.length === 0) {
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
      {results.map((item, index) => (
        <div key={item.id} data-omni-index={index}>
          <OmniSearchItemRow
            item={item}
            isSelected={index === selectedIndex}
            isPending={item.id === pendingItemId}
            onSelect={() => onSelect(item)}
          />
        </div>
      ))}
    </div>
  );
}
