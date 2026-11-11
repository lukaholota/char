import { describe, expect, it } from "vitest";
import { appendStrokePoint, buildStrokePath, isPointNearStroke, parseStrokePoints, STROKE_POINT_LIMIT } from "@/rules/map-strokes";

describe("parseStrokePoints", () => {
  it("rounds points and clips them to the map", () => {
    expect(parseStrokePoints([{ x: 0.123456, y: -0.2 }, { x: 2, y: 0.5 }])).toEqual([{ x: 0.1235, y: 0 }, { x: 1, y: 0.5 }]);
  });

  it.each([
    ["not a list", "points"],
    ["an empty list", []],
    ["a broken point", [{ x: 0.1, y: 0.1 }, { x: "0.2", y: 0.1 }]],
    ["a null point", [null]],
    ["too many points", Array.from({ length: STROKE_POINT_LIMIT + 1 }, () => ({ x: 0.1, y: 0.1 }))],
  ])("rejects %s", (_name, raw) => {
    expect(parseStrokePoints(raw)).toBeNull();
  });
});

describe("appendStrokePoint", () => {
  it("starts a stroke with the first point and skips points too close to the last one", () => {
    const started = appendStrokePoint([], { x: 0.5, y: 0.5 }, 0.01, 1);
    expect(started).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(appendStrokePoint(started, { x: 0.505, y: 0.5 }, 0.01, 1)).toBe(started);
    expect(appendStrokePoint(started, { x: 0.52, y: 0.5 }, 0.01, 1)).toHaveLength(2);
  });

  it("measures the gap in map units, so a tall step on a wide map counts double", () => {
    const started = [{ x: 0.5, y: 0.5 }];
    expect(appendStrokePoint(started, { x: 0.5, y: 0.506 }, 0.01, 1)).toHaveLength(1);
    expect(appendStrokePoint(started, { x: 0.5, y: 0.506 }, 0.01, 0.5)).toHaveLength(2);
  });

  it("stops growing at the point limit", () => {
    const full = Array.from({ length: STROKE_POINT_LIMIT }, (_value, index) => ({ x: index / STROKE_POINT_LIMIT, y: 0 }));
    expect(appendStrokePoint(full, { x: 1, y: 1 }, 0.01, 1)).toBe(full);
  });
});

describe("isPointNearStroke", () => {
  it("finds points along the line and around a single dot", () => {
    expect(isPointNearStroke({ x: 0.5, y: 0.52 }, [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], 0.03, 1)).toBe(true);
    expect(isPointNearStroke({ x: 0.5, y: 0.6 }, [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], 0.03, 1)).toBe(false);
    expect(isPointNearStroke({ x: 0.31, y: 0.3 }, [{ x: 0.3, y: 0.3 }], 0.02, 1)).toBe(true);
  });
});

describe("buildStrokePath", () => {
  it("draws a polyline in layer units and a tiny segment for a single tap", () => {
    expect(buildStrokePath([{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }], 2)).toBe("M10 10L30 20");
    expect(buildStrokePath([{ x: 0.5, y: 0.5 }], 1)).toBe("M50 50L50.01 50");
    expect(buildStrokePath([], 1)).toBe("");
  });
});
