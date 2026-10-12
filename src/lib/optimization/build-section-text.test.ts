import { describe, expect, it } from "vitest";
import { readLevelTableRows } from "./build-section-text";
import type { ArticleDocument } from "./types";

type Section = ArticleDocument["translations"][number]["sections"][number];

const cell = (text: string) => [{ type: "text" as const, text }];

function buildSection(headers: string[], rows: string[][]): Section {
  return { sectionId: "levels", heading: "Рівні", blocks: [{ type: "table", headers: headers.map(cell), rows: rows.map((row) => row.map(cell)) }] } as unknown as Section;
}

describe("readLevelTableRows", () => {
  it("reads rows that start with the character level", () => {
    const section = buildSection(["Рівень", "Риси"], [["1", "Бонусна риса"], ["2", "Друге дихання"]]);
    expect(readLevelTableRows(section).map((row) => [row.level, row.features])).toEqual([[1, "Бонусна риса"], [2, "Друге дихання"]]);
  });

  it("takes the character level from the row position when rows are named by class and class level", () => {
    const section = buildSection(["Рівень і клас", "Риси й уміння", "Нотатки"], [["Бард 1", "Телекінетик", "a"], ["Воїн 1", "Стрільба з лука", "b"], ["Бард 2", "Майстер на всі руки", "c"]]);
    expect(readLevelTableRows(section).map((row) => [row.level, row.features, row.notes])).toEqual([[1, "Телекінетик", "a"], [2, "Стрільба з лука", "b"], [3, "Майстер на всі руки", "c"]]);
  });
});
