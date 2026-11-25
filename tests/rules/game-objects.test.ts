import { describe, expect, it } from "vitest";
import { applyObjectTransform, buildSceneObjectViews, clampObjectAspect, findBackSortOrder, findFrontSortOrder, findObjectWidthShare, OBJECT_LIMITS, parseObjectPlacement, scatterObjectPlacement, toObjectPlacement, toObjectTransform } from "@/rules/game-objects";

const placement = { at: { x: 0.5, y: 0.25 }, widthCells: 2, rotation: 90, name: "Скриня", isHidden: false, sortOrder: 0 };
const row = (id: number, overrides: Partial<{ isHidden: boolean; sortOrder: number }> = {}) => ({ id, imageKey: `token-images/1/${id}`, name: null, x: 0.1, y: 0.2, widthCells: 1, rotation: 0, isHidden: false, sortOrder: 0, ...overrides });

describe("parseObjectPlacement", () => {
  it("keeps a valid placement with a trimmed name and rounded shares", () => {
    expect(parseObjectPlacement({ ...placement, at: { x: 0.123456, y: 1 }, name: "  Скриня  ", widthCells: 1.234 })).toEqual({ ...placement, at: { x: 0.1235, y: 1 }, widthCells: 1.23, floor: null, aspect: 1 });
  });

  it("turns an empty name into none", () => {
    expect(parseObjectPlacement({ ...placement, name: "   " })?.name).toBeNull();
    expect(parseObjectPlacement({ ...placement, name: null })?.name).toBeNull();
  });

  it.each([
    ["null", null],
    ["a point off the map", { ...placement, at: { x: 1.2, y: 0.5 } }],
    ["no point", { ...placement, at: null }],
    ["a size below a quarter cell", { ...placement, widthCells: 0.1 }],
    ["a size above the limit", { ...placement, widthCells: OBJECT_LIMITS.widthCells.max + 1 }],
    ["a fractional rotation", { ...placement, rotation: 12.5 }],
    ["a full turn", { ...placement, rotation: 360 }],
    ["a fractional order", { ...placement, sortOrder: 0.5 }],
    ["a huge order", { ...placement, sortOrder: 10_000_000 }],
    ["a name that is too long", { ...placement, name: "я".repeat(41) }],
    ["a name that is not text", { ...placement, name: 5 }],
    ["hidden as text", { ...placement, isHidden: "yes" }],
  ])("rejects %s", (_name, raw) => {
    expect(parseObjectPlacement(raw)).toBeNull();
  });
});

describe("buildSceneObjectViews", () => {
  it("never gives hidden objects to players", () => {
    const rows = [row(1), row(2, { isHidden: true })];
    expect(buildSceneObjectViews(rows, false).map((object) => object.id)).toEqual([1]);
    expect(buildSceneObjectViews(rows, true).map((object) => object.id)).toEqual([1, 2]);
  });

  it("orders by layer, then by creation", () => {
    const rows = [row(3, { sortOrder: 1 }), row(2), row(1), row(4, { sortOrder: -1 })];
    expect(buildSceneObjectViews(rows, true).map((object) => object.id)).toEqual([4, 1, 2, 3]);
  });

  it("builds an image address and a point from the row", () => {
    const [object] = buildSceneObjectViews([row(1)], true);
    expect(object.at).toEqual({ x: 0.1, y: 0.2 });
    expect(object.imageUrl).toContain("token-images/1/1");
  });
});

describe("object size and layers", () => {
  it("measures width in grid cells, or in twentieths of the map without a grid", () => {
    expect(findObjectWidthShare(2, 40)).toBe(0.05);
    expect(findObjectWidthShare(2, null)).toBe(0.1);
  });

  it("round-trips through the token handles and keeps the size in bounds", () => {
    expect(toObjectTransform({ rotation: 45, widthCells: 1.5 })).toEqual({ rotation: 45, scale: 150 });
    expect(applyObjectTransform(placement, { rotation: 10, scale: 10 })).toMatchObject({ rotation: 10, widthCells: OBJECT_LIMITS.widthCells.min });
    expect(applyObjectTransform(placement, { rotation: 0, scale: 300 }).widthCells).toBe(3);
  });

  it("puts a raised object above all and a lowered one below all", () => {
    expect(findFrontSortOrder([{ sortOrder: -2 }, { sortOrder: 4 }])).toBe(5);
    expect(findBackSortOrder([{ sortOrder: -2 }, { sortOrder: 4 }])).toBe(-3);
    expect(findFrontSortOrder([])).toBe(0);
    expect(findBackSortOrder([])).toBe(0);
  });

  it("drops view-only fields from a placement", () => {
    expect(toObjectPlacement({ ...placement, id: 1, imageKey: "k", imageUrl: "u" } as never)).toEqual(placement);
  });
});

describe("scatterObjectPlacement", () => {
  const full = { ...placement, floor: null, aspect: 1 };
  it("міняє розмір у межах 0.8–1.25 і повертає випадково, решту лишає", () => {
    expect(scatterObjectPlacement(full, () => 0)).toEqual({ ...full, widthCells: 1.6, rotation: 0 });
    expect(scatterObjectPlacement(full, () => 0.999)).toEqual({ ...full, widthCells: 2.5, rotation: 359 });
  });
  it("не виходить за межі ширини", () => {
    expect(scatterObjectPlacement({ ...full, widthCells: OBJECT_LIMITS.widthCells.max }, () => 0.999).widthCells).toBe(OBJECT_LIMITS.widthCells.max);
    expect(scatterObjectPlacement({ ...full, widthCells: OBJECT_LIMITS.widthCells.min }, () => 0).widthCells).toBe(OBJECT_LIMITS.widthCells.min);
  });
});

describe("clampObjectAspect", () => {
  it("keeps a wide cart wide and rounds it", () => {
    expect(clampObjectAspect(1280, 600)).toBe(2.133);
  });

  it("falls back to a square for an unreadable image and clamps extreme strips", () => {
    expect(clampObjectAspect(0, 0)).toBe(1);
    expect(clampObjectAspect(100, 0)).toBe(1);
    expect(clampObjectAspect(10_000, 10)).toBe(OBJECT_LIMITS.aspect.max);
    expect(clampObjectAspect(1, 10_000)).toBe(OBJECT_LIMITS.aspect.min);
  });
});
