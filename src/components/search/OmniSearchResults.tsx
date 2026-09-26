"use client";

import type { OmniSearchCategory, OmniSearchItem } from "@/lib/omniSearchData";
import type { OmniSearchRow } from "@/lib/search/omniSearchRows";
import { OmniSearchItemRow } from "@/components/search/OmniSearchItemRow";
import { OmniSearchMoreRow } from "@/components/search/OmniSearchMoreRow";
import type { Edition } from "@/rules/route-helpers";

type Props = {
  rows: OmniSearchRow[];
  selectedIndex: number;
  onSelect: (item: OmniSearchItem) => void;
  onShowMore: (category: OmniSearchCategory) => void;
  query: string;
  edition: Edition;
  otherEdition: Edition | null;
  pendingItemId?: string | null;
};

export function OmniSearchResults({
  rows,
  selectedIndex,
  onSelect,
  onShowMore,
  query,
  edition,
  otherEdition,
  pendingItemId,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="py-12 px-4 text-center">
        <p className="text-base font-semibold text-slate-300">Нічого не знайдено</p>
        <p className="text-xs text-slate-500 mt-1">
          За запитом «{query}» не знайдено жодної сутності в редакції {edition}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2 pr-1">
      {otherEdition && (
        <p className="px-2 pb-1 pt-1 text-xs text-slate-400">
          У редакції {edition} нічого не знайдено. Є в редакції{" "}
          <span className="font-semibold text-slate-300">{otherEdition}</span>:
        </p>
      )}
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
