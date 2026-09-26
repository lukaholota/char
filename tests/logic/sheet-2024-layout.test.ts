import { describe, expect, it } from "vitest";

import { DETAILS_PAGE, MAGIC_PAGE, MAIN_PAGE, NOTES_PAGE, type PixelRect, type SheetPageSpec } from "@/server/pdf/sheet2024/layout";

const PAGES: Record<string, SheetPageSpec> = { MAIN_PAGE, MAGIC_PAGE, DETAILS_PAGE, NOTES_PAGE };
const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1456;

function overlaps(a: PixelRect, b: PixelRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

describe("макет листа 2024", () => {
  it("імена полів унікальні на всьому бланку — форма додає поля без перевірки", () => {
    const names = Object.values(PAGES).flatMap((page) => page.fields.map((field) => field.name));

    expect(names.length).toBe(new Set(names).size);
  });

  it("імена без крапок — інакше pdf-lib будує ієрархію, яку не вміє сплощити", () => {
    const dotted = Object.values(PAGES).flatMap((page) => page.fields.map((field) => field.name)).filter((name) => name.includes("."));

    expect(dotted).toEqual([]);
  });

  it.each(Object.entries(PAGES))("%s — кожне поле лежить на картинці бланка", (_, page) => {
    const outside = page.fields.filter(
      ({ rect }) => rect.left < 0 || rect.top < 0 || rect.right > IMAGE_WIDTH || rect.bottom > IMAGE_HEIGHT || rect.left >= rect.right || rect.top >= rect.bottom,
    );

    expect(outside.map((field) => field.name)).toEqual([]);
  });

  it.each(Object.entries(PAGES))("%s — поля не налазять одне на одне", (_, page) => {
    const collisions = page.fields.flatMap((field, index) =>
      page.fields.slice(index + 1).flatMap((other) => (overlaps(field.rect, other.rect) ? [`${field.name} × ${other.name}`] : [])),
    );

    expect(collisions).toEqual([]);
  });
});
