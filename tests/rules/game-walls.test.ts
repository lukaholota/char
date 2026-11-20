import { describe, expect, it } from "vitest";
import type { MapFrame } from "@/rules/game-grid";
import { buildSceneWallViews, buildWall, buildWallView, collectMoveLines, collectSightLines, collectSightSegments, countWallSegments, cutOpening, findOpeningChangeFailure, findOpeningSides, findWallIdsNearPoint, parseOpeningChange, parseWallEdit, parseWallLine, snapWallPoint, WALL_LIMITS, type Opening, type SceneWallView, type WallLine } from "@/rules/game-walls";

const at = (x: number, y: number) => ({ x, y });
const wall = (id: number, ...points: Array<[number, number]>): SceneWallView => ({ ...buildWall(points.map(([x, y]) => at(x, y))), id });
const door: Opening = { kind: "door", isOpen: false, lock: "none", isCurtained: false };
const opening = (patch: Partial<WallLine>): WallLine => ({ ...door, points: [at(0, 0), at(0.1, 0)], ...patch });
const frame: MapFrame = { aspect: 1, grid: { columns: 10, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.4 } };

describe("parseWallLine", () => {
  it("keeps a wall of 2–40 points and a door of exactly 2", () => {
    expect(parseWallLine({ kind: "wall", isOpen: false, points: [at(0, 0), at(0.5, 0), at(0.5, 0.5)] })?.points).toHaveLength(3);
    expect(parseWallLine({ kind: "door", isOpen: true, points: [at(0, 0), at(0.1, 0)] })?.isOpen).toBe(true);
    expect(parseWallLine({ kind: "door", isOpen: false, points: [at(0, 0), at(0.1, 0), at(0.2, 0)] })).toBeNull();
    expect(parseWallLine({ kind: "wall", isOpen: false, points: [at(0, 0)] })).toBeNull();
    expect(parseWallLine({ kind: "wall", isOpen: false, points: Array.from({ length: 41 }, (_, index) => at(index / 100, 0)) })).toBeNull();
  });

  it("keeps the lock only on a door and the curtain only on a window", () => {
    expect(parseWallLine({ kind: "door", isOpen: false, lock: "secret", points: [at(0, 0), at(0.1, 0)] })).toMatchObject({ lock: "secret", isCurtained: false });
    expect(parseWallLine({ kind: "window", isOpen: true, lock: "locked", isCurtained: true, points: [at(0, 0), at(0.1, 0)] })).toMatchObject({ isOpen: true, lock: "none", isCurtained: true });
    expect(parseWallLine({ kind: "wall", isOpen: false, isCurtained: true, points: [at(0, 0), at(0.1, 0)] })).toMatchObject({ lock: "none", isCurtained: false });
    expect(parseWallLine({ kind: "window", isOpen: false, points: [at(0, 0), at(0.1, 0), at(0.2, 0)] })).toBeNull();
    expect(parseWallLine({ kind: "door", isOpen: false, lock: "bolted", points: [at(0, 0), at(0.1, 0)] })).toBeNull();
  });

  it("rejects unknown kinds and never stores an open wall", () => {
    expect(parseWallLine({ kind: "gate", isOpen: false, points: [at(0, 0), at(1, 1)] })).toBeNull();
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
  const row = { kind: "door", isOpen: false, doorLock: "none", isCurtained: false };
  const rows = [
    { ...row, id: 1, kind: "wall", points: [[0, 0], [1, 0]] },
    { ...row, id: 2, points: [[0, 0.5], [0.1, 0.5]] },
    { ...row, id: 3, doorLock: "locked", points: [[0, 0.6], [0.1, 0.6]] },
    { ...row, id: 4, doorLock: "secret", points: [[0, 0.7], [0.1, 0.7]] },
    { ...row, id: 5, doorLock: "secret", isOpen: true, points: [[0, 0.8], [0.1, 0.8]] },
    { ...row, id: 6, kind: "window", isCurtained: true, points: [[0, 0.9], [0.1, 0.9]] },
    { ...row, id: 7, kind: "wall", points: "broken" },
  ];

  it("gives the GM every wall, door and window as stored", () => {
    expect(buildSceneWallViews(rows, true)).toEqual(rows.slice(0, 6).flatMap(buildWallView));
  });

  it("shows a player a closed secret door as a plain wall and drops an open one", () => {
    const view = buildSceneWallViews(rows, false);
    expect(view.map((each) => [each.id, each.kind, each.lock])).toEqual([[1, "wall", "none"], [2, "door", "none"], [3, "door", "locked"], [4, "wall", "none"], [6, "window", "none"]]);
  });
});

describe("collectSightLines and collectMoveLines", () => {
  const lines = [
    { ...buildWall([at(0, 0), at(1, 0)]) },
    opening({ isOpen: true }),
    opening({ points: [at(0, 0.2), at(0.1, 0.2)] }),
    opening({ kind: "window", points: [at(0, 0.4), at(0.1, 0.4)] }),
    opening({ kind: "window", isCurtained: true, points: [at(0, 0.6), at(0.1, 0.6)] }),
    opening({ kind: "window", isOpen: true, points: [at(0, 0.8), at(0.1, 0.8)] }),
  ];

  it("blocks sight with walls, closed doors and curtained windows", () => {
    expect(collectSightLines(lines)).toEqual([lines[0].points, lines[2].points, lines[4].points]);
  });

  it("blocks movement with walls and every closed door or window", () => {
    expect(collectMoveLines(lines)).toEqual([lines[0].points, lines[2].points, lines[3].points, lines[4].points]);
  });
});

describe("opening changes", () => {
  it("reads a change of one or more fields and rejects a lock with a curtain or junk", () => {
    expect(parseOpeningChange({ isOpen: true })).toEqual({ isOpen: true });
    expect(parseOpeningChange({ lock: "locked", isOpen: false })).toEqual({ lock: "locked", isOpen: false });
    expect(parseOpeningChange({ lock: "locked", isCurtained: true })).toBeNull();
    expect(parseOpeningChange({ lock: "bolted" })).toBeNull();
    expect(parseOpeningChange({ isOpen: "yes" })).toBeNull();
    expect(parseOpeningChange({})).toBeNull();
    expect(parseOpeningChange(null)).toBeNull();
  });

  it("matches a lock to doors and a curtain to windows for the GM", () => {
    const [door, window] = [{ kind: "door", lock: "secret" }, { kind: "window", lock: "none" }];
    expect(findOpeningChangeFailure(door, { lock: "none", isOpen: true }, true)).toBeNull();
    expect(findOpeningChangeFailure(window, { isCurtained: true }, true)).toBeNull();
    expect(findOpeningChangeFailure(window, { isOpen: true }, true)).toBeNull();
    expect(findOpeningChangeFailure(door, { isCurtained: true }, true)).toBe("wall_gone");
    expect(findOpeningChangeFailure(window, { lock: "locked" }, true)).toBe("wall_gone");
    expect(findOpeningChangeFailure({ kind: "wall", lock: "none" }, { isOpen: true }, true)).toBe("wall_gone");
  });

  it("lets a player only open or close a plain door", () => {
    expect(findOpeningChangeFailure({ kind: "door", lock: "none" }, { isOpen: true }, false)).toBeNull();
    expect(findOpeningChangeFailure({ kind: "door", lock: "none" }, { isOpen: true, lock: "none" }, false)).toBe("forbidden");
    expect(findOpeningChangeFailure({ kind: "door", lock: "locked" }, { isOpen: true }, false)).toBe("door_locked");
    expect(findOpeningChangeFailure({ kind: "door", lock: "secret" }, { isOpen: true }, false)).toBe("wall_gone");
    expect(findOpeningChangeFailure({ kind: "window", lock: "none" }, { isOpen: true }, false)).toBe("wall_gone");
  });

  it("finds a point on each side of a door, square to it on a wide map", () => {
    const [left, right] = findOpeningSides([at(0.4, 0.5), at(0.6, 0.5)], 2);
    expect(left.x).toBeCloseTo(0.5);
    expect(right.x).toBeCloseTo(0.5);
    expect(left.y - 0.5).toBeCloseTo(0.012);
    expect(right.y - 0.5).toBeCloseTo(-0.012);
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

describe("cutOpening", () => {
  it("splits a wall into two parts with the door between them", () => {
    const room = wall(7, [0.1, 0.1], [0.5, 0.1], [0.5, 0.5]);
    const edit = cutOpening([room], door, at(0.3, 0.102), at(0.2, 0.099), 1);
    expect(edit?.removedIds).toEqual([7]);
    expect(edit?.added.map((line) => [line.kind, line.points])).toEqual([
      ["wall", [at(0.1, 0.1), at(0.2, 0.1)]],
      ["wall", [at(0.3, 0.1), at(0.5, 0.1), at(0.5, 0.5)]],
      ["door", [at(0.2, 0.1), at(0.3, 0.1)]],
    ]);
  });

  it("drops a part that would have no length when the door starts at a wall end", () => {
    const edit = cutOpening([wall(7, [0.1, 0.1], [0.5, 0.1])], door, at(0.1, 0.1), at(0.2, 0.1), 1);
    expect(edit?.added.map((line) => line.kind)).toEqual(["wall", "door"]);
  });

  it("places a free door when its ends are not on one wall, and refuses a zero-length door", () => {
    expect(cutOpening([wall(7, [0.1, 0.1], [0.5, 0.1])], door, at(0.2, 0.3), at(0.3, 0.3), 1)).toEqual({ removedIds: [], added: [{ ...door, points: [at(0.2, 0.3), at(0.3, 0.3)] }] });
    expect(cutOpening([], door, at(0.2, 0.3), at(0.2, 0.3), 1)).toBeNull();
    expect(cutOpening([wall(7, [0.1, 0.1], [0.5, 0.1])], door, at(0.2, 0.1), at(0.2, 0.1), 1)).toBeNull();
  });

  it("cuts a curtained window or a secret door into a wall the same way", () => {
    const window: Opening = { kind: "window", isOpen: false, lock: "none", isCurtained: true };
    expect(cutOpening([wall(7, [0.1, 0.1], [0.5, 0.1])], window, at(0.2, 0.1), at(0.3, 0.1), 1)?.added.at(-1)).toEqual({ ...window, points: [at(0.2, 0.1), at(0.3, 0.1)] });
    expect(cutOpening([wall(7, [0.1, 0.1], [0.5, 0.1])], { ...door, lock: "secret" }, at(0.2, 0.1), at(0.3, 0.1), 1)?.added.at(-1)?.lock).toBe("secret");
  });
});
