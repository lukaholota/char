import { describe, expect, it } from "vitest";
import {
  applyFogChange,
  FOG_LIMITS,
  isPointHidden,
  parseFogArea,
  parseFogChange,
  parseSceneFog,
  serializeSceneFog,
  type FogArea,
  type FogStroke,
  type SceneFog,
} from "@/rules/game-fog";

const reveal = (x: number, y: number, width: number, height: number): FogArea => ({ isRevealed: true, x, y, width, height });
const hide = (x: number, y: number, width: number, height: number): FogArea => ({ isRevealed: false, x, y, width, height });
const wholeMap = (isRevealed: boolean): FogArea => ({ isRevealed, x: 0, y: 0, width: 1, height: 1 });
const asFog = (result: ReturnType<typeof applyFogChange>): SceneFog => {
  if (result === null || result === "too_many") throw new Error(`expected fog, got ${String(result)}`);
  return result;
};

describe("isPointHidden", () => {
  it("shows everything when the scene has no fog", () => {
    expect(isPointHidden({ x: 0.5, y: 0.5 }, null, 1)).toBe(false);
  });

  it("hides everything under fog until an area reveals it", () => {
    expect(isPointHidden({ x: 0.5, y: 0.5 }, { areas: [] }, 1)).toBe(true);
    expect(isPointHidden({ x: 0.5, y: 0.5 }, { areas: [reveal(0.4, 0.4, 0.2, 0.2)] }, 1)).toBe(false);
    expect(isPointHidden({ x: 0.9, y: 0.9 }, { areas: [reveal(0.4, 0.4, 0.2, 0.2)] }, 1)).toBe(true);
  });

  it("lets the last matching area win", () => {
    const fog: SceneFog = { areas: [reveal(0, 0, 1, 1), hide(0.2, 0.2, 0.4, 0.4), reveal(0.3, 0.3, 0.1, 0.1)] };
    expect(isPointHidden({ x: 0.9, y: 0.9 }, fog, 1)).toBe(false);
    expect(isPointHidden({ x: 0.25, y: 0.25 }, fog, 1)).toBe(true);
    expect(isPointHidden({ x: 0.35, y: 0.35 }, fog, 1)).toBe(false);
  });

  it("treats area edges as inside", () => {
    const fog: SceneFog = { areas: [reveal(0.2, 0.2, 0.2, 0.2)] };
    expect(isPointHidden({ x: 0.2, y: 0.2 }, fog, 1)).toBe(false);
    expect(isPointHidden({ x: 0.4, y: 0.4 }, fog, 1)).toBe(false);
    expect(isPointHidden({ x: 0.401, y: 0.3 }, fog, 1)).toBe(true);
  });
});

describe("applyFogChange", () => {
  it("covers the whole map with a base layer that hides everything", () => {
    expect(applyFogChange({ areas: [reveal(0, 0, 0.5, 0.5)] }, { kind: "cover" })).toEqual({ areas: [] });
    expect(applyFogChange(null, { kind: "cover" })).toEqual({ areas: [] });
  });

  it("removes the fog entirely on clear", () => {
    expect(applyFogChange({ areas: [hide(0, 0, 0.5, 0.5)] }, { kind: "clear" })).toBeNull();
  });

  it("reveals on top of the cover", () => {
    const fog = asFog(applyFogChange({ areas: [] }, { kind: "area", area: reveal(0.1, 0.1, 0.2, 0.2) }));
    expect(fog.areas).toEqual([reveal(0.1, 0.1, 0.2, 0.2)]);
    expect(isPointHidden({ x: 0.15, y: 0.15 }, fog, 1)).toBe(false);
    expect(isPointHidden({ x: 0.8, y: 0.8 }, fog, 1)).toBe(true);
  });

  it("hiding a part of a map with no fog keeps the rest visible", () => {
    const fog = asFog(applyFogChange(null, { kind: "area", area: hide(0.4, 0.4, 0.2, 0.2) }));
    expect(fog.areas).toEqual([wholeMap(true), hide(0.4, 0.4, 0.2, 0.2)]);
    expect(isPointHidden({ x: 0.5, y: 0.5 }, fog, 1)).toBe(true);
    expect(isPointHidden({ x: 0.1, y: 0.1 }, fog, 1)).toBe(false);
  });

  it("drops earlier areas when a new area covers the whole map", () => {
    const fog: SceneFog = { areas: [reveal(0.1, 0.1, 0.2, 0.2), hide(0.2, 0.2, 0.1, 0.1)] };
    expect(applyFogChange(fog, { kind: "area", area: wholeMap(false) })).toEqual({ areas: [wholeMap(false)] });
    expect(applyFogChange(null, { kind: "area", area: wholeMap(true) })).toEqual({ areas: [wholeMap(true)] });
  });

  it("sets the fog back to an earlier state for undo", () => {
    const earlier: SceneFog = { areas: [reveal(0, 0, 0.5, 0.5)] };
    expect(applyFogChange({ areas: [] }, { kind: "set", fog: earlier })).toEqual(earlier);
    expect(applyFogChange({ areas: [] }, { kind: "set", fog: null })).toBeNull();
  });

  it("refuses an area over the limit but lets a whole-map area through", () => {
    const full: SceneFog = { areas: Array.from({ length: FOG_LIMITS.areas }, () => reveal(0, 0, 0.1, 0.1)) };
    expect(applyFogChange(full, { kind: "area", area: reveal(0.5, 0.5, 0.1, 0.1) })).toBe("too_many");
    expect(applyFogChange(full, { kind: "area", area: wholeMap(true) })).toEqual({ areas: [wholeMap(true)] });
    const almostFull: SceneFog = { areas: full.areas.slice(1) };
    expect(asFog(applyFogChange(almostFull, { kind: "area", area: reveal(0.5, 0.5, 0.1, 0.1) })).areas).toHaveLength(FOG_LIMITS.areas);
  });

  it("does not change the fog it was given", () => {
    const fog: SceneFog = { areas: [reveal(0, 0, 0.5, 0.5)] };
    applyFogChange(fog, { kind: "area", area: hide(0.1, 0.1, 0.1, 0.1) });
    expect(fog.areas).toHaveLength(1);
  });
});

describe("parseFogArea", () => {
  it("accepts a rectangle and rounds it", () => {
    expect(parseFogArea({ isRevealed: true, x: 0.123456, y: 0.2, width: 0.3, height: 0.4 })).toEqual(reveal(0.1235, 0.2, 0.3, 0.4));
  });

  it("turns a rectangle dragged up and left into a normal one", () => {
    expect(parseFogArea({ isRevealed: false, x: 0.5, y: 0.6, width: -0.2, height: -0.3 })).toEqual(hide(0.3, 0.3, 0.2, 0.3));
  });

  it("clips the rectangle to the map", () => {
    expect(parseFogArea({ isRevealed: true, x: -0.2, y: 0.8, width: 0.5, height: 0.5 })).toEqual(reveal(0, 0.8, 0.3, 0.2));
  });

  it("drops slivers narrower than the minimum side", () => {
    expect(parseFogArea({ isRevealed: true, x: 0.1, y: 0.1, width: 0.004, height: 0.5 })).toBeNull();
    expect(parseFogArea({ isRevealed: true, x: 0.1, y: 0.1, width: 0.006, height: 0.5 })).not.toBeNull();
    expect(parseFogArea({ isRevealed: true, x: 1.2, y: 0.1, width: 0.5, height: 0.5 })).toBeNull();
  });

  it.each([
    ["null", null],
    ["a string", "area"],
    ["a text flag", { isRevealed: "yes", x: 0, y: 0, width: 1, height: 1 }],
    ["a missing flag", { x: 0, y: 0, width: 1, height: 1 }],
    ["NaN", { isRevealed: true, x: Number.NaN, y: 0, width: 1, height: 1 }],
    ["text numbers", { isRevealed: true, x: "0", y: 0, width: 1, height: 1 }],
    ["a missing side", { isRevealed: true, x: 0, y: 0, width: 1 }],
  ])("rejects %s", (_name, raw) => {
    expect(parseFogArea(raw)).toBeNull();
  });
});

describe("fog brush strokes", () => {
  const stroke = (isRevealed: boolean, points: Array<[number, number]>, radius: number): FogStroke => ({ isRevealed, points: points.map(([x, y]) => ({ x, y })), radius });

  it("hides or reveals everything within the radius of the line", () => {
    const fog: SceneFog = { areas: [stroke(true, [[0.2, 0.5], [0.8, 0.5]], 0.05)] };
    expect(isPointHidden({ x: 0.5, y: 0.54 }, fog, 1)).toBe(false);
    expect(isPointHidden({ x: 0.5, y: 0.56 }, fog, 1)).toBe(true);
    expect(isPointHidden({ x: 0.16, y: 0.5 }, fog, 1)).toBe(false);
    expect(isPointHidden({ x: 0.14, y: 0.5 }, fog, 1)).toBe(true);
  });

  it("keeps the brush round on a wide map: the radius is a share of the width", () => {
    const fog: SceneFog = { areas: [stroke(true, [[0.5, 0.5]], 0.05)] };
    expect(isPointHidden({ x: 0.5, y: 0.59 }, fog, 2)).toBe(false);
    expect(isPointHidden({ x: 0.5, y: 0.61 }, fog, 2)).toBe(true);
    expect(isPointHidden({ x: 0.54, y: 0.5 }, fog, 2)).toBe(false);
  });

  it("lets a later stroke cover an earlier reveal", () => {
    const fog: SceneFog = { areas: [reveal(0, 0, 1, 1), stroke(false, [[0.5, 0.5]], 0.1)] };
    expect(isPointHidden({ x: 0.5, y: 0.5 }, fog, 1)).toBe(true);
    expect(isPointHidden({ x: 0.9, y: 0.9 }, fog, 1)).toBe(false);
  });

  it("parses a stroke and rounds it, rejecting a bad radius or points", () => {
    expect(parseFogArea({ isRevealed: true, points: [{ x: 0.123456, y: 1.5 }], radius: 0.03 })).toEqual(stroke(true, [[0.1235, 1]], 0.03));
    expect(parseFogArea({ isRevealed: true, points: [{ x: 0.1, y: 0.1 }], radius: 0.001 })).toBeNull();
    expect(parseFogArea({ isRevealed: true, points: [{ x: 0.1, y: 0.1 }], radius: 0.5 })).toBeNull();
    expect(parseFogArea({ isRevealed: true, points: [], radius: 0.03 })).toBeNull();
    expect(parseFogArea({ isRevealed: "no", points: [{ x: 0.1, y: 0.1 }], radius: 0.03 })).toBeNull();
  });

  it("stores strokes compactly next to rectangles and reads them back", () => {
    const fog: SceneFog = { areas: [reveal(0, 0, 1, 1), stroke(false, [[0.1, 0.2], [0.3, 0.4]], 0.03)] };
    expect(serializeSceneFog(fog).areas[1]).toEqual({ r: false, p: [[0.1, 0.2], [0.3, 0.4]], d: 0.03 });
    expect(parseSceneFog(serializeSceneFog(fog))).toEqual(fog);
    expect(parseSceneFog({ areas: [{ r: true, p: [null], d: 0.03 }, { r: true, p: [[0.1, 0.1]], d: 0.03 }] })).toEqual({ areas: [stroke(true, [[0.1, 0.1]], 0.03)] });
  });

  it("never treats a stroke as a whole-map area", () => {
    const fog: SceneFog = { areas: [hide(0.1, 0.1, 0.1, 0.1)] };
    expect(asFog(applyFogChange(fog, { kind: "area", area: stroke(true, [[0, 0], [1, 1]], 0.2) })).areas).toHaveLength(2);
  });
});

describe("parseSceneFog and serializeSceneFog", () => {
  it("round-trips the stored form", () => {
    const fog: SceneFog = { areas: [reveal(0, 0, 1, 1), hide(0.2, 0.2, 0.3, 0.3)] };
    expect(serializeSceneFog(fog)).toEqual({ areas: [{ r: true, x: 0, y: 0, w: 1, h: 1 }, { r: false, x: 0.2, y: 0.2, w: 0.3, h: 0.3 }] });
    expect(parseSceneFog(serializeSceneFog(fog))).toEqual(fog);
  });

  it("rejects anything without an areas array", () => {
    expect(parseSceneFog(null)).toBeNull();
    expect(parseSceneFog("fog")).toBeNull();
    expect(parseSceneFog({})).toBeNull();
    expect(parseSceneFog({ areas: "none" })).toBeNull();
  });

  it("skips broken stored areas and keeps the good ones", () => {
    const stored = { areas: [null, { r: true, x: 0, y: 0, w: 0.5, h: 0.5 }, { r: "x", x: 0, y: 0, w: 1, h: 1 }, 7] };
    expect(parseSceneFog(stored)).toEqual({ areas: [reveal(0, 0, 0.5, 0.5)] });
  });

  it("keeps only the newest areas over the limit", () => {
    const stored = { areas: Array.from({ length: FOG_LIMITS.areas + 5 }, (_value, index) => ({ r: true, x: 0, y: 0, w: 0.5, h: 0.5 + index / 100000 })) };
    const fog = parseSceneFog(stored);
    expect(fog?.areas).toHaveLength(FOG_LIMITS.areas);
    expect(fog?.areas.at(-1)?.height).toBe(0.503);
  });
});

describe("parseFogChange", () => {
  it.each(["cover", "clear"])("accepts %s", (kind) => {
    expect(parseFogChange({ kind })).toEqual({ kind });
  });

  it("accepts a set back to no fog or to earlier areas, checking each area", () => {
    expect(parseFogChange({ kind: "set", fog: null })).toEqual({ kind: "set", fog: null });
    const stroke = { isRevealed: false, points: [{ x: 0.1, y: 0.2 }], radius: 0.03 };
    expect(parseFogChange({ kind: "set", fog: { areas: [stroke, { isRevealed: true, x: 0.5, y: 0.5, width: -0.1, height: 0.1 }] } })).toEqual({ kind: "set", fog: { areas: [stroke, reveal(0.4, 0.5, 0.1, 0.1)] } });
  });

  it("accepts an area change and normalizes the area", () => {
    expect(parseFogChange({ kind: "area", area: { isRevealed: true, x: 0.5, y: 0.5, width: -0.1, height: 0.1 } })).toEqual({ kind: "area", area: reveal(0.4, 0.5, 0.1, 0.1) });
  });

  it.each([
    ["null", null],
    ["an unknown kind", { kind: "reveal" }],
    ["the old undo", { kind: "undo" }],
    ["a set without fog", { kind: "set" }],
    ["a set with a broken area", { kind: "set", fog: { areas: [{ isRevealed: true }] } }],
    ["a set over the limit", { kind: "set", fog: { areas: Array.from({ length: FOG_LIMITS.areas + 1 }, () => ({ isRevealed: true, x: 0, y: 0, width: 0.5, height: 0.5 })) } }],
    ["an area change without area", { kind: "area" }],
    ["an area change with a broken area", { kind: "area", area: { isRevealed: true } }],
    ["a string", "cover"],
  ])("rejects %s", (_name, raw) => {
    expect(parseFogChange(raw)).toBeNull();
  });
});
