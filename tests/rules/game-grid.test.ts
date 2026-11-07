import { describe, expect, it } from "vitest";
import {
  buildGridFromCells,
  buildGridLinesPath,
  buildLibraryGrid,
  findCell,
  findFeetVector,
  findGridSize,
  findRowsPerColumn,
  findViewUnitsPerFoot,
  measureGridFeet,
  moveByFeet,
  parseSceneGrid,
  snapToGrid,
  snapToHalfCell,
  toViewPoint,
  type MapFrame,
} from "@/rules/game-grid";

const frame: MapFrame = { aspect: 2, grid: { columns: 20, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 } };
const shiftedFrame: MapFrame = { aspect: 2, grid: { columns: 20, offsetX: 0.25, offsetY: 0.5, isVisible: true, opacity: 0.35 } };
const centreOf = (column: number, row: number) => ({ x: (column + 0.5) / 20, y: (row + 0.5) / 10 });

describe("grid geometry", () => {
  it("makes cells square: a 20x10 map with aspect 2 has as many rows as the cell shape needs", () => {
    expect(findRowsPerColumn(frame)).toBe(10);
    const vector = findFeetVector({ x: 0, y: 0 }, { x: 1 / 20, y: 1 / 10 }, frame);
    expect(vector.x).toBeCloseTo(5);
    expect(vector.y).toBeCloseTo(5);
  });

  it("finds the cell under a point, honouring the grid offset", () => {
    expect(findCell({ x: 0.26, y: 0.31 }, frame)).toEqual({ column: 5, row: 3 });
    expect(findCell({ x: 0.26, y: 0.31 }, shiftedFrame)).toEqual({ column: 4, row: 2 });
  });

  it("snaps Medium tokens to cell centres", () => {
    expect(snapToGrid({ x: 0.26, y: 0.31 }, frame)).toEqual({ x: 5.5 / 20, y: 3.5 / 10 });
  });

  it("snaps Large tokens to line intersections so they cover whole cells", () => {
    expect(snapToGrid({ x: 0.26, y: 0.31 }, frame, 2)).toEqual({ x: 5 / 20, y: 3 / 10 });
  });

  it("snaps relative to the grid offset", () => {
    const medium = snapToGrid({ x: 0.26, y: 0.31 }, shiftedFrame);
    expect(medium.x * 20 - 0.25).toBeCloseTo(4.5);
    expect(medium.y * 10 - 0.5).toBeCloseTo(2.5);
    const large = snapToGrid({ x: 0.26, y: 0.31 }, shiftedFrame, 2);
    expect(large.x * 20 - 0.25).toBeCloseTo(5);
    expect(large.y * 10 - 0.5).toBeCloseTo(3);
  });

  it("keeps snapped tokens on the map", () => {
    expect(snapToGrid({ x: -0.5, y: 2 }, frame, 2)).toEqual({ x: 0, y: 1 });
  });

  it("counts every cell, diagonals included, as 5 ft", () => {
    expect(measureGridFeet(centreOf(2, 2), centreOf(5, 2), frame)).toBe(15);
    expect(measureGridFeet(centreOf(2, 2), centreOf(5, 5), frame)).toBe(15);
    expect(measureGridFeet(centreOf(2, 2), centreOf(4, 5), frame)).toBe(15);
    expect(measureGridFeet(centreOf(2, 2), centreOf(2, 2), frame)).toBe(0);
  });

  it("measures between cells, not between exact points inside them", () => {
    expect(measureGridFeet({ x: 0.251, y: 0.05 }, { x: 0.299, y: 0.05 }, frame)).toBe(0);
  });

  it("moves a point by feet and back", () => {
    const moved = moveByFeet({ x: 0.5, y: 0.5 }, { x: 25, y: -10 }, frame);
    expect(moved.x).toBeCloseTo(0.75);
    expect(moved.y).toBeCloseTo(0.3);
    const vector = findFeetVector({ x: 0.5, y: 0.5 }, moved, frame);
    expect(vector.x).toBeCloseTo(25);
    expect(vector.y).toBeCloseTo(-10);
  });

  it("converts to the SVG layer of width 100", () => {
    expect(findViewUnitsPerFoot(frame)).toBeCloseTo(1);
    expect(toViewPoint({ x: 0.5, y: 0.5 }, 2)).toEqual({ x: 50, y: 25 });
  });

  it("draws one vertical line per column edge and one horizontal line per row edge", () => {
    const path = buildGridLinesPath(frame);
    expect(path.match(/V/g)).toHaveLength(21);
    expect(path.match(/H/g)).toHaveLength(11);
  });

  it("starts the first line at the offset", () => {
    expect(buildGridLinesPath(shiftedFrame).startsWith("M1.250 0V50.000")).toBe(true);
  });

  it("builds a grid from a library map and skips maps without one", () => {
    expect(buildLibraryGrid({ columns: 30, rows: 20 })).toEqual({ columns: 30, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 });
    expect(buildLibraryGrid(null)).toBeNull();
    expect(buildLibraryGrid({ columns: 1, rows: 1 })).toBeNull();
  });
});

describe("findGridSize", () => {
  it("рахує рядки з пропорцій мапи й переводить клітинки у фути", () => {
    expect(findGridSize({ aspect: 0.75, grid: { columns: 21, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 } })).toEqual({ columns: 21, rows: 28, widthFeet: 105, heightFeet: 140 });
  });

  it("округлює дробову сітку з обведених клітинок до цілих", () => {
    expect(findGridSize({ aspect: 1.5, grid: { columns: 19.6, offsetX: 0.3, offsetY: 0, isVisible: false, opacity: 0.35 } })).toEqual({ columns: 20, rows: 13, widthFeet: 100, heightFeet: 65 });
  });
});

describe("parseSceneGrid", () => {
  it("accepts a plain grid and fills defaults", () => {
    expect(parseSceneGrid({ columns: 24 })).toEqual({ columns: 24, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 });
  });

  it("wraps offsets into [0, 1) and rounds", () => {
    expect(parseSceneGrid({ columns: 24, offsetX: 1.25, offsetY: -0.25 })).toMatchObject({ offsetX: 0.25, offsetY: 0.75 });
    expect(parseSceneGrid({ columns: 24.456, offsetX: 0.12345 })).toMatchObject({ columns: 24.46, offsetX: 0.123 });
  });

  it("keeps the grid hidden only when isVisible is false", () => {
    expect(parseSceneGrid({ columns: 24, isVisible: false, opacity: 0.35 })?.isVisible).toBe(false);
    expect([undefined, 0, 0.5, 7, Number.NaN].map((opacity) => parseSceneGrid({ columns: 24, opacity })?.opacity)).toEqual([0.35, 0.1, 0.5, 1, 0.35]);
    expect(parseSceneGrid({ columns: 24, isVisible: "no" })?.isVisible).toBe(true);
  });

  it.each([
    ["null", null],
    ["a string", "grid"],
    ["no columns", {}],
    ["too few columns", { columns: 1 }],
    ["too many columns", { columns: 301 }],
    ["NaN columns", { columns: Number.NaN }],
    ["text columns", { columns: "20" }],
    ["infinite offset", { columns: 20, offsetX: Number.POSITIVE_INFINITY }],
    ["text offset", { columns: 20, offsetY: "0.5" }],
  ])("rejects %s", (_name, raw) => {
    expect(parseSceneGrid(raw)).toBeNull();
  });

  it("accepts the limits", () => {
    expect(parseSceneGrid({ columns: 2 })).not.toBeNull();
    expect(parseSceneGrid({ columns: 300 })).not.toBeNull();
  });
});

describe("buildGridFromCells", () => {
  it("turns a frame around two drawn cells into columns and the first line", () => {
    const grid = buildGridFromCells({ x: 0.13, y: 0.26, width: 0.1, height: 0.2 }, 2, 2);
    expect(grid).toEqual({ columns: 20, offsetX: 0.6, offsetY: 0.6, isVisible: true, opacity: 0.35 });
  });

  it("accepts a frame dragged from the bottom right corner", () => {
    expect(buildGridFromCells({ x: 0.23, y: 0.46, width: -0.1, height: -0.2 }, 2, 2)).toEqual(buildGridFromCells({ x: 0.13, y: 0.26, width: 0.1, height: 0.2 }, 2, 2));
  });

  it("refuses an empty frame or no cells", () => {
    expect(buildGridFromCells({ x: 0.1, y: 0.1, width: 0, height: 0 }, 1, 1)).toBeNull();
    expect(buildGridFromCells({ x: 0.1, y: 0.1, width: 0.1, height: 0.1 }, 0, 1)).toBeNull();
  });
});

describe("snapToHalfCell", () => {
  const frame: MapFrame = { aspect: 1, grid: { columns: 10, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.35 } };

  it("snaps to a line crossing or a cell centre, whichever is closer", () => {
    expect(snapToHalfCell({ x: 0.21, y: 0.29 }, frame)).toEqual({ x: 0.2, y: 0.3 });
    expect(snapToHalfCell({ x: 0.26, y: 0.24 }, frame)).toEqual({ x: 0.25, y: 0.25 });
  });

  it("follows a shifted grid", () => {
    const shifted: MapFrame = { ...frame, grid: { ...frame.grid, offsetX: 0.4, offsetY: 0.4 } };
    const snapped = snapToHalfCell({ x: 0.24, y: 0.24 }, shifted);
    expect(snapped.x).toBeCloseTo(0.24);
    expect(snapped.y).toBeCloseTo(0.24);
  });
});
