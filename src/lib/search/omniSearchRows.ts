import type { OmniSearchCategory, OmniSearchItem, OmniSearchOverflow } from "@/lib/omniSearchData";

/// Рядок видачі — або результат, або «ще K у каталозі X» (KR36.4). Другий не має href і не є
/// переходом на сторінку: стрілки ходять по ньому як по решті, а Enter перемикає фільтр.
export type OmniSearchRow =
  | { kind: "item"; key: string; item: OmniSearchItem }
  | { kind: "more"; key: string; category: OmniSearchCategory; categoryLabel: string; hiddenCount: number };

export function buildOmniSearchRows(items: OmniSearchItem[], overflow: OmniSearchOverflow[]): OmniSearchRow[] {
  const overflowByCategory = new Map(overflow.map((entry) => [entry.category, entry]));
  const lastIndexByCategory = findLastIndexByCategory(items);
  const rows: OmniSearchRow[] = [];

  items.forEach((item, index) => {
    rows.push({ kind: "item", key: item.id, item });
    const more = overflowByCategory.get(item.category);
    if (more && lastIndexByCategory.get(item.category) === index) {
      rows.push(buildMoreRow(more));
      overflowByCategory.delete(item.category);
    }
  });

  for (const more of overflowByCategory.values()) rows.push(buildMoreRow(more));
  return rows;
}

function findLastIndexByCategory(items: OmniSearchItem[]): Map<OmniSearchCategory, number> {
  const lastIndex = new Map<OmniSearchCategory, number>();
  items.forEach((item, index) => lastIndex.set(item.category, index));
  return lastIndex;
}

function buildMoreRow(more: OmniSearchOverflow): OmniSearchRow {
  return {
    kind: "more",
    key: `more-${more.category}`,
    category: more.category,
    categoryLabel: more.categoryLabel,
    hiddenCount: more.hiddenCount,
  };
}
