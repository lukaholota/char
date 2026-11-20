import { describe, expect, it } from "vitest";
import { buildDrawingView, canEraseDrawing, DRAWING_LIMITS, findDrawingPointGap, findErasableDrawingIds, findShapeOutline, parseDrawingStroke, parseDrawingStrokes, type SceneDrawingView } from "@/rules/game-drawings";

const line = { color: "red", width: "thin", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }] };

describe("parseDrawingStroke", () => {
  it("keeps a valid line with rounded points", () => {
    expect(parseDrawingStroke({ ...line, points: [{ x: 0.123456, y: 0.2 }] })).toEqual({ shape: "line", isFilled: false, color: "red", width: "thin", points: [{ x: 0.1235, y: 0.2 }] });
  });

  it("keeps a filled shape and never fills a line", () => {
    expect(parseDrawingStroke({ ...line, shape: "rect", isFilled: true, color: "pink", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.3 }] })).toMatchObject({ shape: "rect", isFilled: true, color: "pink" });
    expect(parseDrawingStroke({ ...line, isFilled: true })).toMatchObject({ shape: "line", isFilled: false });
  });

  it.each([
    ["a rectangle with one point", { ...line, shape: "rect", points: [{ x: 0.1, y: 0.1 }] }],
    ["a flat rectangle", { ...line, shape: "rect", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }] }],
    ["a circle with no radius", { ...line, shape: "circle", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.1 }] }],
    ["a polygon with two corners", { ...line, shape: "polygon" }],
    ["a polygon with too many corners", { ...line, shape: "polygon", points: Array.from({ length: DRAWING_LIMITS.polygonPoints + 1 }, (_, index) => ({ x: index / 100, y: (index % 2) / 10 })) }],
    ["an unknown shape", { ...line, shape: "star" }],
    ["a fill that is not a flag", { ...line, shape: "rect", isFilled: "yes" }],
  ])("rejects %s", (_name, raw) => {
    expect(parseDrawingStroke(raw)).toBeNull();
  });

  it.each([
    ["null", null],
    ["an unknown colour", { ...line, color: "gold" }],
    ["an unknown width", { ...line, width: "huge" }],
    ["an inherited width name", { ...line, width: "toString" }],
    ["no points", { ...line, points: [] }],
  ])("rejects %s", (_name, raw) => {
    expect(parseDrawingStroke(raw)).toBeNull();
  });
});

describe("parseDrawingStrokes", () => {
  it("keeps a list of valid lines", () => {
    expect(parseDrawingStrokes([line, { ...line, color: "white", width: "bold" }])).toHaveLength(2);
  });

  it("keeps black and every width", () => {
    expect(parseDrawingStrokes(["fine", "thin", "medium", "bold", "heavy"].map((width) => ({ ...line, color: "black", width })))).toHaveLength(5);
  });

  it.each([
    ["not a list", line],
    ["an empty list", []],
    ["a list with a broken line", [line, { ...line, color: "gold" }]],
    ["too many lines", Array.from({ length: DRAWING_LIMITS.perSave + 1 }, () => line)],
  ])("rejects %s", (_name, raw) => {
    expect(parseDrawingStrokes(raw)).toBeNull();
  });
});

describe("buildDrawingView", () => {
  it("reads stored point pairs", () => {
    expect(buildDrawingView({ id: 4, userId: 9, shape: "circle", isFilled: true, color: "sky", width: "bold", points: [[0.2, 0.3], [0.4, 0.5]] })).toEqual([
      { id: 4, userId: 9, shape: "circle", isFilled: true, color: "sky", width: "bold", points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }] },
    ]);
  });

  it("drops a row the rules no longer accept", () => {
    const row = { id: 4, userId: 9, shape: "line", isFilled: false, color: "sky", width: "bold" };
    expect(buildDrawingView({ ...row, color: "gold", points: [[0.2, 0.3]] })).toEqual([]);
    expect(buildDrawingView({ ...row, points: "broken" })).toEqual([]);
    expect(buildDrawingView({ ...row, shape: "rect", points: [[0.2, 0.3]] })).toEqual([]);
  });
});

describe("erasing", () => {
  const drawings: SceneDrawingView[] = [
    { id: 1, userId: 7, shape: "line", isFilled: false, color: "red", width: "thin", points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }] },
    { id: 2, userId: 8, shape: "line", isFilled: false, color: "sky", width: "bold", points: [{ x: 0.1, y: 0.52 }, { x: 0.9, y: 0.52 }] },
    { id: 3, userId: 7, shape: "line", isFilled: false, color: "amber", width: "thin", points: [{ x: 0.1, y: 0.9 }] },
  ];

  it("lets a player erase only their own lines and the GM any line", () => {
    expect(canEraseDrawing(drawings[1], 7, false)).toBe(false);
    expect(canEraseDrawing(drawings[1], 7, true)).toBe(true);
    expect(canEraseDrawing(drawings[0], 7, false)).toBe(true);
  });

  it("finds the erasable lines under the finger", () => {
    expect(findErasableDrawingIds({ x: 0.5, y: 0.51 }, drawings, 1, 7, false)).toEqual([1]);
    expect(findErasableDrawingIds({ x: 0.5, y: 0.51 }, drawings, 1, 7, true)).toEqual([1, 2]);
    expect(findErasableDrawingIds({ x: 0.5, y: 0.7 }, drawings, 1, 7, true)).toEqual([]);
  });

  it("erases a filled shape by a tap inside and an outline only by its edge", () => {
    const square = { id: 5, userId: 7, shape: "rect" as const, color: "red" as const, width: "thin" as const, points: [{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.6 }] };
    expect(findErasableDrawingIds({ x: 0.4, y: 0.4 }, [{ ...square, isFilled: true }], 1, 7, false)).toEqual([5]);
    expect(findErasableDrawingIds({ x: 0.4, y: 0.4 }, [{ ...square, isFilled: false }], 1, 7, false)).toEqual([]);
    expect(findErasableDrawingIds({ x: 0.6, y: 0.4 }, [{ ...square, isFilled: false }], 1, 7, false)).toEqual([5]);
  });
});

describe("findShapeOutline", () => {
  it("closes a rectangle and a polygon and keeps a line as drawn", () => {
    const [a, b, c] = [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.3 }, { x: 0.2, y: 0.6 }];
    expect(findShapeOutline({ shape: "rect", points: [a, b] }, 1)).toEqual([a, { x: 0.5, y: 0.1 }, b, { x: 0.1, y: 0.3 }, a]);
    expect(findShapeOutline({ shape: "polygon", points: [a, b, c] }, 1)).toEqual([a, b, c, a]);
    expect(findShapeOutline({ shape: "line", points: [a, b] }, 1)).toEqual([a, b]);
  });

  it("keeps a circle round on a wide map", () => {
    const aspect = 2;
    const outline = findShapeOutline({ shape: "circle", points: [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.5 }] }, aspect);
    expect(outline[0].x).toBeCloseTo(0.6);
    expect(Math.max(...outline.map((point) => point.y)) - 0.5).toBeCloseTo(0.2);
  });
});

describe("findDrawingPointGap", () => {
  it("keeps the point step between the thin and the bold width", () => {
    expect(findDrawingPointGap("fine")).toBe(0.004);
    expect(findDrawingPointGap("medium")).toBe(0.007);
    expect(findDrawingPointGap("heavy")).toBe(0.011);
  });
});
