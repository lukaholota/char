import { describe, expect, it } from "vitest";
import { OBJECT_LIBRARY_CATEGORIES } from "@/lib/refs/object-library";
import { OBJECT_LIBRARY } from "@/lib/refs/object-library-catalog";
import { OBJECT_LIMITS } from "@/rules/game-objects";

describe("каталог базових обʼєктів", () => {
  it("кожна категорія має обʼєкти, і кожен обʼєкт — у відомій категорії", () => {
    const categories = new Set(OBJECT_LIBRARY.map((object) => object.category));
    expect([...categories].toSorted()).toEqual(OBJECT_LIBRARY_CATEGORIES.map((category) => category.id).toSorted());
  });

  it("назви унікальні, а ширина — чверті клітинки в межах, які приймає сервер", () => {
    expect(new Set(OBJECT_LIBRARY.map((object) => object.slug)).size).toBe(OBJECT_LIBRARY.length);
    const badWidths = OBJECT_LIBRARY.filter(({ widthCells }) => widthCells < OBJECT_LIMITS.widthCells.min || widthCells > OBJECT_LIMITS.widthCells.max || !Number.isInteger(widthCells * 4));
    expect(badWidths).toEqual([]);
  });
});
