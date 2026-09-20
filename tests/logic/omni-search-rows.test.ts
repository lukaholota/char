import { describe, expect, it } from "vitest";
import { buildOmniSearchRows } from "@/lib/search/omniSearchRows";
import type { OmniSearchItem } from "@/lib/omniSearchData";

function item(id: string, category: OmniSearchItem["category"]): OmniSearchItem {
  return { id, title: id, category, categoryLabel: category, href: `/${id}` };
}

describe("KR36.4 — рядки видачі з «ще K у каталозі»", () => {
  it("ставить «ще K» після останнього рядка блоку, а не в кінець списку", () => {
    const rows = buildOmniSearchRows(
      [item("s1", "spells"), item("s2", "spells"), item("b1", "bestiary")],
      [{ category: "spells", categoryLabel: "Заклинання", hiddenCount: 23 }],
    );

    expect(rows.map((row) => row.key)).toEqual(["s1", "s2", "more-spells", "b1"]);
    expect(rows[2]).toMatchObject({ kind: "more", category: "spells", hiddenCount: 23 });
  });

  it("залишок без показаних рядків не губиться, а стає в хвіст", () => {
    const rows = buildOmniSearchRows([item("s1", "spells")], [{ category: "rules", categoryLabel: "Правила", hiddenCount: 4 }]);
    expect(rows.map((row) => row.key)).toEqual(["s1", "more-rules"]);
  });

  it("без переповнення — лише результати", () => {
    const rows = buildOmniSearchRows([item("s1", "spells")], []);
    expect(rows).toEqual([{ kind: "item", key: "s1", item: item("s1", "spells") }]);
  });
});
