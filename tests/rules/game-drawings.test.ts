import { describe, expect, it } from "vitest";
import { buildDrawingView, canEraseDrawing, DRAWING_LIMITS, findDrawingPointGap, findErasableDrawingIds, parseDrawingStroke, parseDrawingStrokes, type SceneDrawingView } from "@/rules/game-drawings";

const line = { color: "red", width: "thin", points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }] };

describe("parseDrawingStroke", () => {
  it("keeps a valid line with rounded points", () => {
    expect(parseDrawingStroke({ ...line, points: [{ x: 0.123456, y: 0.2 }] })).toEqual({ color: "red", width: "thin", points: [{ x: 0.1235, y: 0.2 }] });
  });

  it.each([
    ["null", null],
    ["an unknown colour", { ...line, color: "pink" }],
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
    ["a list with a broken line", [line, { ...line, color: "pink" }]],
    ["too many lines", Array.from({ length: DRAWING_LIMITS.perSave + 1 }, () => line)],
  ])("rejects %s", (_name, raw) => {
    expect(parseDrawingStrokes(raw)).toBeNull();
  });
});

describe("buildDrawingView", () => {
  it("reads stored point pairs", () => {
    expect(buildDrawingView({ id: 4, userId: 9, color: "sky", width: "bold", points: [[0.2, 0.3], [0.4, 0.5]] })).toEqual([
      { id: 4, userId: 9, color: "sky", width: "bold", points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }] },
    ]);
  });

  it("drops a row the rules no longer accept", () => {
    expect(buildDrawingView({ id: 4, userId: 9, color: "pink", width: "bold", points: [[0.2, 0.3]] })).toEqual([]);
    expect(buildDrawingView({ id: 4, userId: 9, color: "sky", width: "bold", points: "broken" })).toEqual([]);
  });
});

describe("erasing", () => {
  const drawings: SceneDrawingView[] = [
    { id: 1, userId: 7, color: "red", width: "thin", points: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }] },
    { id: 2, userId: 8, color: "sky", width: "bold", points: [{ x: 0.1, y: 0.52 }, { x: 0.9, y: 0.52 }] },
    { id: 3, userId: 7, color: "amber", width: "thin", points: [{ x: 0.1, y: 0.9 }] },
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
});

describe("findDrawingPointGap", () => {
  it("keeps the point step between the thin and the bold width", () => {
    expect(findDrawingPointGap("fine")).toBe(0.004);
    expect(findDrawingPointGap("medium")).toBe(0.007);
    expect(findDrawingPointGap("heavy")).toBe(0.011);
  });
});
