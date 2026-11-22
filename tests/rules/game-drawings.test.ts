import { describe, expect, it } from "vitest";
import { buildDrawingView, buildTextPoints, canEditDrawing, DRAWING_LIMITS, findDrawingBounds, findDrawingHex, findDrawingPointGap, findEditableDrawingAt, findErasableDrawingIds, findShapeOutline, findTextFontSize, moveDrawingPoints, parseDrawingStroke, parseDrawingStrokes, resizeDrawingPoints, toDrawingColumns, type SceneDrawingView } from "@/rules/game-drawings";

const line = { color: "red", width: "thin", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }] };

describe("parseDrawingStroke", () => {
  it("keeps a valid line with rounded points", () => {
    expect(parseDrawingStroke({ ...line, points: [{ x: 0.123456, y: 0.2 }] })).toEqual({ shape: "line", isFilled: false, fillOpacity: 1, color: "red", width: "thin", points: [{ x: 0.1235, y: 0.2 }], label: null });
  });

  it("keeps a filled shape and never fills a line", () => {
    expect(parseDrawingStroke({ ...line, shape: "rect", isFilled: true, color: "pink", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.3 }] })).toMatchObject({ shape: "rect", isFilled: true, color: "pink" });
    expect(parseDrawingStroke({ ...line, isFilled: true })).toMatchObject({ shape: "line", isFilled: false });
  });

  it("keeps a spectrum colour in lower case and a see-through fill", () => {
    expect(parseDrawingStroke({ ...line, shape: "rect", isFilled: true, fillOpacity: 0.4, color: "#A1B2C3", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.3 }] })).toMatchObject({ color: "#a1b2c3", fillOpacity: 0.4, isFilled: true });
    expect(findDrawingHex("#a1b2c3")).toBe("#a1b2c3");
    expect(findDrawingHex("sky")).toBe("#38bdf8");
  });

  it("keeps text with its label and never fills it", () => {
    const text = { ...line, shape: "text", isFilled: true, points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }], label: { text: "  Тут\r\nдракон ", font: "ornate", effect: "glow" } };
    expect(parseDrawingStroke(text)).toMatchObject({ shape: "text", isFilled: false, label: { text: "Тут\nдракон", font: "ornate", effect: "glow" } });
  });

  it.each([
    ["text without a label", { ...line, shape: "text", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }] }],
    ["a label on a line", { ...line, label: { text: "А", font: "plain", effect: "none" } }],
    ["text upside down", { ...line, shape: "text", points: [{ x: 0.1, y: 0.14 }, { x: 0.1, y: 0.1 }], label: { text: "А", font: "plain", effect: "none" } }],
    ["blank text", { ...line, shape: "text", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }], label: { text: "  ", font: "plain", effect: "none" } }],
    ["too long text", { ...line, shape: "text", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }], label: { text: "а".repeat(DRAWING_LIMITS.textLength + 1), font: "plain", effect: "none" } }],
    ["too many text lines", { ...line, shape: "text", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }], label: { text: "а\n".repeat(DRAWING_LIMITS.textLines) + "а", font: "plain", effect: "none" } }],
    ["an unknown font", { ...line, shape: "text", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }], label: { text: "А", font: "comic", effect: "none" } }],
    ["a fill too faint", { ...line, shape: "rect", isFilled: true, fillOpacity: 0.05, points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.3 }] }],
    ["a short hex colour", { ...line, color: "#fff" }],
  ])("rejects %s", (_name, raw) => {
    expect(parseDrawingStroke(raw)).toBeNull();
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
  const noText = { text: null, font: null, textEffect: null };
  it("reads stored point pairs", () => {
    expect(buildDrawingView({ ...noText, id: 4, userId: 9, shape: "circle", isFilled: true, fillOpacity: 0.35, color: "sky", width: "bold", points: [[0.2, 0.3], [0.4, 0.5]] })).toEqual([
      { id: 4, userId: 9, shape: "circle", isFilled: true, fillOpacity: 0.35, color: "sky", width: "bold", points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }], label: null },
    ]);
  });

  it("reads text back from its columns", () => {
    const stroke = parseDrawingStroke({ ...line, shape: "text", points: [{ x: 0.1, y: 0.1 }, { x: 0.1, y: 0.14 }], label: { text: "Брама", font: "hand", effect: "shadow" } })!;
    const columns = toDrawingColumns(stroke);
    expect(columns).toMatchObject({ text: "Брама", font: "hand", textEffect: "shadow", points: [[0.1, 0.1], [0.1, 0.14]] });
    expect(buildDrawingView({ ...columns, id: 1, userId: 2 })).toEqual([{ ...stroke, id: 1, userId: 2 }]);
  });

  it("drops a row the rules no longer accept", () => {
    const row = { ...noText, id: 4, userId: 9, shape: "line", isFilled: false, fillOpacity: 1, color: "sky", width: "bold" };
    expect(buildDrawingView({ ...row, color: "gold", points: [[0.2, 0.3]] })).toEqual([]);
    expect(buildDrawingView({ ...row, points: "broken" })).toEqual([]);
    expect(buildDrawingView({ ...row, shape: "rect", points: [[0.2, 0.3]] })).toEqual([]);
  });
});

describe("erasing", () => {
  const drawings: SceneDrawingView[] = [
    { id: 1, userId: 7, shape: "line", isFilled: false, fillOpacity: 1, color: "red", width: "thin", points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], label: null },
    { id: 2, userId: 8, shape: "line", isFilled: false, fillOpacity: 1, color: "sky", width: "bold", points: [{ x: 0.1, y: 0.52 }, { x: 0.9, y: 0.52 }], label: null },
    { id: 3, userId: 7, shape: "line", isFilled: false, fillOpacity: 1, color: "amber", width: "thin", points: [{ x: 0.1, y: 0.9 }], label: null },
  ];

  it("lets a player erase only their own lines and the GM any line", () => {
    expect(canEditDrawing(drawings[1], 7, false)).toBe(false);
    expect(canEditDrawing(drawings[1], 7, true)).toBe(true);
    expect(canEditDrawing(drawings[0], 7, false)).toBe(true);
  });

  it("finds the erasable lines under the finger", () => {
    expect(findErasableDrawingIds({ x: 0.5, y: 0.51 }, drawings, 1, 7, false)).toEqual([1]);
    expect(findErasableDrawingIds({ x: 0.5, y: 0.51 }, drawings, 1, 7, true)).toEqual([1, 2]);
    expect(findErasableDrawingIds({ x: 0.5, y: 0.7 }, drawings, 1, 7, true)).toEqual([]);
  });

  it("erases a filled shape by a tap inside and an outline only by its edge", () => {
    const square = { id: 5, userId: 7, shape: "rect" as const, fillOpacity: 1, color: "red", width: "thin" as const, label: null, points: [{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.6 }] };
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

describe("moving and resizing", () => {
  const square: SceneDrawingView = { id: 1, userId: 7, shape: "rect", isFilled: true, fillOpacity: 1, color: "#ef4444", width: "thin", points: [{ x: 0.2, y: 0.2 }, { x: 0.4, y: 0.4 }], label: null };
  const sign: SceneDrawingView = { ...square, id: 2, shape: "text", isFilled: false, points: buildTextPoints({ x: 0.5, y: 0.5 }, "medium", 1), label: { text: "Тут\nдракон", font: "plain", effect: "outline" } };

  it("picks the top drawing the user may change", () => {
    const other = { ...square, id: 3, userId: 8 };
    expect(findEditableDrawingAt({ x: 0.3, y: 0.3 }, [square, other], 1, 7, false)?.id).toBe(1);
    expect(findEditableDrawingAt({ x: 0.3, y: 0.3 }, [square, other], 1, 7, true)?.id).toBe(3);
    expect(findEditableDrawingAt({ x: 0.52, y: 0.52 }, [square, sign], 1, 7, false)?.id).toBe(2);
    expect(findEditableDrawingAt({ x: 0.9, y: 0.9 }, [square, sign], 1, 7, false)).toBeNull();
  });

  it("frames text by its letters and lines", () => {
    expect(findTextFontSize(sign.points, 1)).toBeCloseTo(4);
    const bounds = findDrawingBounds(sign, 1);
    expect(bounds.from).toEqual({ x: 0.5, y: 0.5 });
    expect(bounds.to.x).toBeCloseTo(0.5 + 6 * 0.6 * 0.04);
    expect(bounds.to.y).toBeCloseTo(0.5 + 2 * 1.2 * 0.04);
  });

  it("moves a shape but stops it at the map edge", () => {
    expect(moveDrawingPoints(square.points, { x: 0.3, y: 0.3 }, { x: 0.4, y: 0.35 })).toEqual([{ x: 0.3, y: 0.25 }, { x: 0.5, y: 0.45 }]);
    expect(moveDrawingPoints(square.points, { x: 0.3, y: 0.3 }, { x: 1.5, y: -1 })).toEqual([{ x: 0.8, y: 0 }, { x: 1, y: 0.2 }]);
  });

  it("scales a shape from the far corner and refuses a tiny or off-map one", () => {
    const { from, to } = findDrawingBounds(square, 1);
    expect(resizeDrawingPoints(square.points, from, to, { x: 0.6, y: 0.6 }, 1)).toEqual([{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.6 }]);
    expect(resizeDrawingPoints(square.points, from, to, { x: 0.2, y: 0.2 }, 1)).toBeNull();
    expect(resizeDrawingPoints(square.points, from, to, { x: 1.4, y: 1.4 }, 1)).toBeNull();
    expect(resizeDrawingPoints(square.points, from, from, { x: 0.6, y: 0.6 }, 1)).toBeNull();
  });

  it("places text inside the map near the bottom edge", () => {
    expect(buildTextPoints({ x: 0.3, y: 0.99 }, "large", 1)).toEqual([{ x: 0.3, y: 0.93 }, { x: 0.3, y: 1 }]);
  });
});
