import { describe, expect, it } from "vitest";
import type { MapFrame } from "@/rules/game-grid";
import { buildSceneWallViews, buildWallView, collectSightSegments, countWallSegments, cutDoor, findWallIdsNearPoint, parseWallEdit, parseWallLine, snapWallPoint, WALL_LIMITS, type SceneWallView } from "@/rules/game-walls";

const at = (x: number, y: number) => ({ x, y });
const wall = (id: number, ...points: Array<[number, number]>): SceneWallView => ({ id, kind: "wall", isOpen: false, points: points.map(([x, y]) => at(x, y)) });
const frame: MapFrame = { aspect: 1, grid: { columns: 10, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.4 } };

describe("parseWallLine", () => {
  it("keeps a wall of 2–40 points and a door of exactly 2", () => {
    expect(parseWallLine({ kind: "wall", isOpen: false, points: [at(0, 0), at(0.5, 0), at(0.5, 0.5)] })?.points).toHaveLength(3);
    expect(parseWallLine({ kind: "door", isOpen: true, points: [at(0, 0), at(0.1, 0)] })?.isOpen).toBe(true);
    expect(parseWallLine({ kind: "door", isOpen: false, points: [at(0, 0), at(0.1, 0), at(0.2, 0)] })).toBeNull();
    expect(parseWallLine({ kind: "wall", isOpen: false, points: [at(0, 0)] })).toBeNull();
    expect(parseWallLine({ kind: "wall", isOpen: false, points: Array.from({ length: 41 }, (_, index) => at(index / 100, 0)) })).toBeNull();
  });

  it("rejects unknown kinds and never stores an open wall", () => {
    expect(parseWallLine({ kind: "window", isOpen: false, points: [at(0, 0), at(1, 1)] })).toBeNull();
    expect(parseWallLine({ kind: "wall", points: [at(0, 0), at(1, 1)] })).toBeNull();
    expect(parseWallLine(null)).toBeNull();
    expect(parseWallLine({ kind: "wall", isOpen: true, points: [at(0, 0), at(1, 1)] })?.isOpen).toBe(false);
  });
});

describe("parseWallEdit", () => {
  const line = { kind: "wall", isOpen: false, points: [at(0, 0), at(1, 0)] };
  it("accepts removals, additions or both, and rejects an empty or broken edit", () => {
    expect(parseWallEdit({ removedIds: [3], added: [] })).toEqual({ removedIds: [3], added: [] });
    expect(parseWallEdit({ removedIds: [], added: [line] })?.added).toHaveLength(1);
    expect(parseWallEdit({ removedIds: [], added: [] })).toBeNull();
    expect(parseWallEdit({ removedIds: [0], added: [] })).toBeNull();
    expect(parseWallEdit({ removedIds: [], added: [{ ...line, kind: "x" }] })).toBeNull();
    expect(parseWallEdit({ removedIds: "all", added: [] })).toBeNull();
    expect(parseWallEdit(null)).toBeNull();
  });

  it("rejects more segments than a scene can hold", () => {
    const long = { kind: "wall", isOpen: false, points: Array.from({ length: 40 }, (_, index) => at(index / 40, 0)) };
    expect(parseWallEdit({ removedIds: [], added: Array.from({ length: 11 }, () => long) })).toBeNull();
    expect(countWallSegments(Array.from({ length: 10 }, () => long))).toBe(390);
    expect(390).toBeLessThanOrEqual(WALL_LIMITS.segmentsPerScene);
  });
});

describe("buildSceneWallViews", () => {
  const rows = [
    { id: 1, kind: "wall", isOpen: false, points: [[0, 0], [1, 0]] },
    { id: 2, kind: "door", isOpen: false, points: [[0, 0.5], [0.1, 0.5]] },
    { id: 3, kind: "door", isOpen: true, points: [[0, 0.7], [0.1, 0.7]] },
    { id: 4, kind: "wall", isOpen: false, points: "broken" },
  ];

  it("gives the GM every wall and door", () => {
    expect(buildSceneWallViews(rows, true)).toEqual({ walls: rows.slice(0, 3).flatMap(buildWallView), sightLines: [] });
  });

  it("gives a player only closed lines, with no hint which of them are doors", () => {
    const view = buildSceneWallViews(rows, false);
    expect(view.walls).toEqual([]);
    expect(view.sightLines).toEqual([[at(0, 0), at(1, 0)], [at(0, 0.5), at(0.1, 0.5)]]);
  });
});

describe("collectSightSegments", () => {
  it("turns lines into view-space segments", () => {
    expect(collectSightSegments([[at(0, 0), at(0.5, 0), at(0.5, 0.5)]], 2)).toEqual([
      { from: { x: 0, y: 0 }, to: { x: 50, y: 0 } },
      { from: { x: 50, y: 0 }, to: { x: 50, y: 25 } },
    ]);
  });
});

describe("snapWallPoint", () => {
  it("sticks to a nearby wall end before the grid", () => {
    expect(snapWallPoint(at(0.505, 0.502), [wall(1, [0.5, 0.5], [0.9, 0.5])], frame, 1)).toEqual(at(0.5, 0.5));
  });

  it("falls back to the half cell, or keeps the point without a grid", () => {
    expect(snapWallPoint(at(0.32, 0.47), [], frame, 1)).toEqual(at(0.3, 0.45));
    expect(snapWallPoint(at(0.32, 0.47), [], null, 1)).toEqual(at(0.32, 0.47));
  });
});

describe("findWallIdsNearPoint", () => {
  it("finds walls under a tap", () => {
    const walls = [wall(1, [0, 0.5], [1, 0.5]), wall(2, [0.5, 0], [0.5, 0.2])];
    expect(findWallIdsNearPoint(at(0.3, 0.505), walls, 1)).toEqual([1]);
    expect(findWallIdsNearPoint(at(0.3, 0.3), walls, 1)).toEqual([]);
  });
});

describe("cutDoor", () => {
  it("splits a wall into two parts with the door between them", () => {
    const room = wall(7, [0.1, 0.1], [0.5, 0.1], [0.5, 0.5]);
    const edit = cutDoor([room], at(0.3, 0.102), at(0.2, 0.099), 1);
    expect(edit?.removedIds).toEqual([7]);
    expect(edit?.added.map((line) => [line.kind, line.points])).toEqual([
      ["wall", [at(0.1, 0.1), at(0.2, 0.1)]],
      ["wall", [at(0.3, 0.1), at(0.5, 0.1), at(0.5, 0.5)]],
      ["door", [at(0.2, 0.1), at(0.3, 0.1)]],
    ]);
  });

  it("drops a part that would have no length when the door starts at a wall end", () => {
    const edit = cutDoor([wall(7, [0.1, 0.1], [0.5, 0.1])], at(0.1, 0.1), at(0.2, 0.1), 1);
    expect(edit?.added.map((line) => line.kind)).toEqual(["wall", "door"]);
  });

  it("places a free door when its ends are not on one wall, and refuses a zero-length door", () => {
    expect(cutDoor([wall(7, [0.1, 0.1], [0.5, 0.1])], at(0.2, 0.3), at(0.3, 0.3), 1)).toEqual({ removedIds: [], added: [{ kind: "door", isOpen: false, points: [at(0.2, 0.3), at(0.3, 0.3)] }] });
    expect(cutDoor([], at(0.2, 0.3), at(0.2, 0.3), 1)).toBeNull();
    expect(cutDoor([wall(7, [0.1, 0.1], [0.5, 0.1])], at(0.2, 0.1), at(0.2, 0.1), 1)).toBeNull();
  });
});
