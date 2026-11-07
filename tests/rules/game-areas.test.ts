import { describe, expect, it } from "vitest";
import {
  AREA_LIMITS,
  buildAreaPath,
  findAngleTowards,
  findAreaTip,
  findTokenFootprint,
  isAreaShape,
  isPointInArea,
  isTokenInArea,
  normalizeAngle,
  parseAreaPlacement,
  snapAreaAngle,
  type AreaPlacement,
  type AreaShape,
} from "@/rules/game-areas";
import type { MapFrame } from "@/rules/game-grid";

const frame: MapFrame = { aspect: 2, grid: { columns: 20, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 } };
const COLUMNS = 20;
const ROWS = 10;

const centreOf = (column: number, row: number) => ({ x: (column + 0.5) / COLUMNS, y: (row + 0.5) / ROWS });
const cornerOf = (column: number, row: number) => ({ x: column / COLUMNS, y: row / ROWS });
const leftEdgeMiddleOf = (column: number, row: number) => ({ x: column / COLUMNS, y: (row + 0.5) / ROWS });
const topEdgeMiddleOf = (column: number, row: number) => ({ x: (column + 0.5) / COLUMNS, y: row / ROWS });
const buildArea = (shape: AreaShape, sizeFeet: number, origin: AreaPlacement["origin"], angle = 0): AreaPlacement => ({ shape, sizeFeet, origin, angle, label: null });

function findHitCells(area: AreaPlacement): [number, number][] {
  const cells: [number, number][] = [];
  for (let column = 0; column < COLUMNS; column += 1)
    for (let row = 0; row < ROWS; row += 1) if (isPointInArea(centreOf(column, row), area, frame)) cells.push([column, row]);
  return cells;
}

const pointAtFeet = (origin: AreaPlacement["origin"], along: number, across: number) => ({ x: origin.x + along / (COLUMNS * 5), y: origin.y + across / (ROWS * 5) });

describe("circle", () => {
  it("catches exactly the cells whose centres are within the radius of a cell centre", () => {
    const hits = findHitCells(buildArea("circle", 10, centreOf(10, 5)));
    const expected: [number, number][] = [];
    for (let dx = -2; dx <= 2; dx += 1)
      for (let dy = -2; dy <= 2; dy += 1) if (dx * dx + dy * dy <= 4) expected.push([10 + dx, 5 + dy]);
    expect(hits).toHaveLength(13);
    expect(hits).toEqual(expect.arrayContaining(expected));
  });

  it("catches 12 cells when centred on a grid intersection", () => {
    expect(findHitCells(buildArea("circle", 10, cornerOf(10, 5)))).toHaveLength(12);
  });

  it("includes the edge and excludes just beyond it", () => {
    const origin = centreOf(10, 5);
    const circle = buildArea("circle", 20, origin);
    expect(isPointInArea(pointAtFeet(origin, 20, 0), circle, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 20.5, 0), circle, frame)).toBe(false);
    expect(isPointInArea(pointAtFeet(origin, -14, -14), circle, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, -15, -15), circle, frame)).toBe(false);
  });

  it("is a true circle on a non-square map", () => {
    const origin = { x: 0.5, y: 0.5 };
    const circle = buildArea("circle", 25, origin);
    expect(isPointInArea(pointAtFeet(origin, 0, 25), circle, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 0, 26), circle, frame)).toBe(false);
  });
});

describe("cone", () => {
  it("is as wide as it is long at its end", () => {
    const origin = { x: 0.3, y: 0.5 };
    const cone = buildArea("cone", 15, origin, 0);
    expect(isPointInArea(pointAtFeet(origin, 15, 7.4), cone, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 15, -7.4), cone, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 15, 7.6), cone, frame)).toBe(false);
    expect(isPointInArea(pointAtFeet(origin, 7.5, 3.7), cone, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 7.5, 3.9), cone, frame)).toBe(false);
  });

  it("starts at a point and stops at its length", () => {
    const origin = { x: 0.3, y: 0.5 };
    const cone = buildArea("cone", 15, origin, 0);
    expect(isPointInArea(origin, cone, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, -1, 0), cone, frame)).toBe(false);
    expect(isPointInArea(pointAtFeet(origin, 15.5, 0), cone, frame)).toBe(false);
  });

  it("catches cell columns 1, 1, 3 for a 15 ft cone pointing right from the middle of a cell edge", () => {
    const hits = findHitCells(buildArea("cone", 15, leftEdgeMiddleOf(5, 5), 0));
    const perColumn = [5, 6, 7].map((column) => hits.filter(([hitColumn]) => hitColumn === column).map(([, row]) => row));
    expect(perColumn).toEqual([[5], [5], [4, 5, 6]]);
    expect(hits).toHaveLength(5);
  });

  it("catches a symmetric 2 + 2 cells from a grid intersection", () => {
    const hits = findHitCells(buildArea("cone", 15, cornerOf(5, 5), 0));
    expect(hits).toHaveLength(4);
    expect(hits.map(([, row]) => row).sort()).toEqual([4, 4, 5, 5]);
  });

  it("points where the angle says, down being 90 degrees", () => {
    const origin = { x: 0.5, y: 0.3 };
    const cone = buildArea("cone", 30, origin, 90);
    expect(isPointInArea(pointAtFeet(origin, 0, 25), cone, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 0, -5), cone, frame)).toBe(false);
    expect(isPointInArea(pointAtFeet(origin, 25, 0), cone, frame)).toBe(false);
  });
});

describe("line", () => {
  it("is 5 ft wide and as long as asked", () => {
    const origin = leftEdgeMiddleOf(2, 5);
    const line = buildArea("line", 30, origin, 0);
    expect(isPointInArea(pointAtFeet(origin, 30, 2.4), line, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 15, -2.4), line, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 15, 2.6), line, frame)).toBe(false);
    expect(isPointInArea(pointAtFeet(origin, 30.5, 0), line, frame)).toBe(false);
  });

  it("catches one row of 6 cells from the middle of a cell edge", () => {
    const hits = findHitCells(buildArea("line", 30, leftEdgeMiddleOf(2, 5), 0));
    expect(hits).toEqual([2, 3, 4, 5, 6, 7].map((column) => [column, 5]));
  });

  it("follows a diagonal angle", () => {
    const origin = { x: 0.3, y: 0.3 };
    const line = buildArea("line", 40, origin, 45);
    expect(isPointInArea(pointAtFeet(origin, 20, 20), line, frame)).toBe(true);
    expect(isPointInArea(pointAtFeet(origin, 20, 0), line, frame)).toBe(false);
  });
});

describe("square (cube)", () => {
  it("grows from the origin along the angle, centred across it", () => {
    const origin = leftEdgeMiddleOf(5, 5);
    const hits = findHitCells(buildArea("square", 15, origin, 0));
    expect(hits).toHaveLength(9);
    expect(hits).toEqual(expect.arrayContaining([5, 6, 7].flatMap((column) => [4, 5, 6].map((row): [number, number] => [column, row]))));
  });

  it("grows downwards at 90 degrees", () => {
    const hits = findHitCells(buildArea("square", 15, topEdgeMiddleOf(5, 5), 90));
    expect(hits).toHaveLength(9);
    expect(hits).toEqual(expect.arrayContaining([4, 5, 6].flatMap((column) => [5, 6, 7].map((row): [number, number] => [column, row]))));
  });

  it("grows to the left at 180 degrees", () => {
    const hits = findHitCells(buildArea("square", 15, leftEdgeMiddleOf(10, 5), 180));
    expect(hits.every(([column]) => column <= 9 && column >= 7)).toBe(true);
    expect(hits).toHaveLength(9);
  });

  it("does not reach behind the origin", () => {
    const origin = { x: 0.5, y: 0.5 };
    expect(isPointInArea(pointAtFeet(origin, -1, 0), buildArea("square", 20, origin, 0), frame)).toBe(false);
  });
});

describe("tokens", () => {
  it("has one footprint cell for a Medium token and four for a Large one", () => {
    expect(findTokenFootprint(centreOf(5, 5), 1, frame)).toHaveLength(1);
    const large = findTokenFootprint(cornerOf(5, 5), 2, frame);
    expect(large).toHaveLength(4);
    const columns = large.map((point) => Math.floor(point.x * COLUMNS));
    const rows = large.map((point) => Math.floor(point.y * ROWS));
    expect(new Set(columns)).toEqual(new Set([4, 5]));
    expect(new Set(rows)).toEqual(new Set([4, 5]));
  });

  it("hits a Large token when any one of its 4 cells is inside", () => {
    const largeCentre = cornerOf(6, 5);
    expect(isTokenInArea(largeCentre, 2, buildArea("circle", 5, centreOf(4, 5)), frame)).toBe(true);
    expect(isTokenInArea(largeCentre, 2, buildArea("circle", 5, centreOf(7, 5)), frame)).toBe(true);
    expect(isTokenInArea(largeCentre, 2, buildArea("circle", 5, centreOf(3, 5)), frame)).toBe(false);
  });

  it("does not hit a Medium token where a Large one is hit", () => {
    const circle = buildArea("circle", 5, centreOf(4, 5));
    expect(isTokenInArea(centreOf(6, 5), 1, circle, frame)).toBe(false);
    expect(isTokenInArea(centreOf(5, 5), 1, circle, frame)).toBe(true);
  });

  it("treats a size below 1 as Medium", () => {
    const circle = buildArea("circle", 5, centreOf(5, 5));
    expect(isTokenInArea(centreOf(5, 5), 0.5, circle, frame)).toBe(true);
    expect(isTokenInArea(centreOf(5, 5), 0, circle, frame)).toBe(true);
  });
});

describe("parseAreaPlacement", () => {
  const valid = { shape: "cone", sizeFeet: 30, origin: { x: 0.4, y: 0.6 }, angle: 45, label: "Конус" };

  it("accepts a valid placement", () => {
    expect(parseAreaPlacement(valid)).toEqual(valid);
  });

  it("defaults angle and label", () => {
    expect(parseAreaPlacement({ shape: "circle", sizeFeet: 20, origin: { x: 0.4, y: 0.6 } })).toEqual({ shape: "circle", sizeFeet: 20, origin: { x: 0.4, y: 0.6 }, angle: 0, label: null });
  });

  it("normalizes angle, label and origin", () => {
    expect(parseAreaPlacement({ ...valid, angle: -90, label: "  Друзки \n  вибух  " })).toMatchObject({ angle: 270, label: "Друзки вибух" });
    expect(parseAreaPlacement({ ...valid, label: "   " })?.label).toBeNull();
    expect(parseAreaPlacement({ ...valid, label: "я".repeat(200) })?.label).toHaveLength(AREA_LIMITS.label);
    expect(parseAreaPlacement({ ...valid, origin: { x: 5, y: -5 } })?.origin).toEqual({ x: 1, y: 0 });
  });

  it("accepts the size limits and rejects values outside them", () => {
    expect(parseAreaPlacement({ ...valid, sizeFeet: 5 })).not.toBeNull();
    expect(parseAreaPlacement({ ...valid, sizeFeet: 500 })).not.toBeNull();
    expect(parseAreaPlacement({ ...valid, sizeFeet: 4 })).toBeNull();
    expect(parseAreaPlacement({ ...valid, sizeFeet: 501 })).toBeNull();
  });

  it.each([
    ["null", null],
    ["a string", "cone"],
    ["an unknown shape", { ...valid, shape: "triangle" }],
    ["no shape", { sizeFeet: 30, origin: { x: 0, y: 0 } }],
    ["a fractional size", { ...valid, sizeFeet: 12.5 }],
    ["a text size", { ...valid, sizeFeet: "30" }],
    ["a missing size", { shape: "cone", origin: { x: 0, y: 0 } }],
    ["NaN angle", { ...valid, angle: Number.NaN }],
    ["text angle", { ...valid, angle: "90" }],
    ["a numeric label", { ...valid, label: 5 }],
    ["no origin", { ...valid, origin: undefined }],
    ["a broken origin", { ...valid, origin: { x: "a", y: 1 } }],
  ])("rejects %s", (_name, raw) => {
    expect(parseAreaPlacement(raw)).toBeNull();
  });
});

describe("shapes and angles", () => {
  it("knows the four shapes", () => {
    for (const shape of ["circle", "cone", "line", "square"]) expect(isAreaShape(shape)).toBe(true);
    for (const value of ["triangle", "", null, 3, undefined]) expect(isAreaShape(value)).toBe(false);
  });

  it("wraps angles into [0, 360)", () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(359.96)).toBe(0);
    expect(normalizeAngle(12.34)).toBe(12.3);
  });

  it("finds the angle towards a point, using real feet on a non-square map", () => {
    const origin = { x: 0.5, y: 0.5 };
    expect(findAngleTowards(origin, { x: 0.7, y: 0.5 }, frame)).toBe(0);
    expect(findAngleTowards(origin, { x: 0.5, y: 0.7 }, frame)).toBe(90);
    expect(findAngleTowards(origin, { x: 0.3, y: 0.5 }, frame)).toBe(180);
    expect(findAngleTowards(origin, { x: 0.5, y: 0.3 }, frame)).toBe(270);
    expect(findAngleTowards(origin, { x: 0.55, y: 0.6 }, frame)).toBe(45);
  });

  it("snaps cones and lines by 15 degrees, cubes by 90, circles not at all", () => {
    expect(snapAreaAngle("cone", 22)).toBe(15);
    expect(snapAreaAngle("line", 23)).toBe(30);
    expect(snapAreaAngle("square", 50)).toBe(90);
    expect(snapAreaAngle("square", 40)).toBe(0);
    expect(snapAreaAngle("circle", 170)).toBe(0);
  });

  it("puts the rotation handle at the far end of the area", () => {
    const tip = findAreaTip(buildArea("cone", 30, { x: 0.25, y: 0.5 }, 0), frame);
    expect(tip.x).toBeCloseTo(0.55);
    expect(tip.y).toBeCloseTo(0.5);
    const down = findAreaTip(buildArea("line", 25, { x: 0.5, y: 0.2 }, 90), frame);
    expect(down.x).toBeCloseTo(0.5);
    expect(down.y).toBeCloseTo(0.2 + 25 / (ROWS * 5));
  });
});

describe("buildAreaPath", () => {
  it("draws a circle whose radius is the size in view units", () => {
    expect(buildAreaPath(buildArea("circle", 20, { x: 0.5, y: 0.5 }), frame)).toBe("M30 25a20 20 0 1 0 40 0a20 20 0 1 0 -40 0Z");
  });

  it("draws a cone as a triangle as wide as it is long", () => {
    expect(buildAreaPath(buildArea("cone", 30, { x: 0.1, y: 0.5 }, 0), frame)).toBe("M10.000 25.000L40.000 10.000L40.000 40.000L10.000 25.000Z");
  });

  it("draws a line 5 ft wide", () => {
    expect(buildAreaPath(buildArea("line", 30, { x: 0.1, y: 0.5 }, 0), frame)).toBe("M10.000 22.500L40.000 22.500L40.000 27.500L10.000 27.500Z");
  });

  it("draws a cube centred across the angle", () => {
    expect(buildAreaPath(buildArea("square", 20, { x: 0.1, y: 0.5 }, 0), frame)).toBe("M10.000 15.000L30.000 15.000L30.000 35.000L10.000 35.000Z");
  });
});
