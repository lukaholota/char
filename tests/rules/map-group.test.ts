import { describe, expect, it } from "vitest";
import { GROUP_MOVE_LIMIT, changeGroupKeys, collectKeysInRect, isPointInRect, parseGroupMoves, parseMapTokenMoves, parsePositionMoves, shiftGroup, findIdInGroupKey } from "@/rules/map-group";

const rect = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 };

describe("map group selection", () => {
  it("counts points on the frame edge as inside", () => {
    expect(isPointInRect({ x: 0.2, y: 0.5 }, rect)).toBe(true);
    expect(isPointInRect({ x: 0.51, y: 0.3 }, rect)).toBe(false);
    expect(isPointInRect({ x: 0.3, y: 0.1 }, rect)).toBe(false);
  });

  it("collects only items whose centre is in the frame", () => {
    const items = [
      { key: "hero-1", position: { x: 0.3, y: 0.3 } },
      { key: "creature-2", position: { x: 0.9, y: 0.9 } },
      { key: "creature-3", position: { x: 0.45, y: 0.25 } },
    ];
    expect(collectKeysInRect(items, rect)).toEqual(["hero-1", "creature-3"]);
  });

  it("adds with Shift, removes with Ctrl or ⌘ and replaces without a key", () => {
    expect(changeGroupKeys(["hero-1"], ["hero-1", "creature-2"], "add")).toEqual(["hero-1", "creature-2"]);
    expect(changeGroupKeys(["hero-1", "creature-2", "creature-3"], ["creature-2", "creature-9"], "remove")).toEqual(["hero-1", "creature-3"]);
    expect(changeGroupKeys(["hero-1"], ["creature-2"], null)).toEqual(["creature-2"]);
  });

  it("shifts every item by the same step and stops each at the map edge", () => {
    const shifted = shiftGroup([{ key: "a", position: { x: 0.5, y: 0.5 } }, { key: "b", position: { x: 0.95, y: 0.1 } }], { x: 0.1, y: -0.2 });
    expect(shifted.map((item) => item.next)).toEqual([{ x: 0.6, y: 0.3 }, { x: 1, y: 0 }]);
  });
});

describe("parseGroupMoves", () => {
  it("accepts unique ids with positions and removal only when allowed", () => {
    expect(parseGroupMoves([{ id: 1, at: { x: 0.1, y: 0.2 } }, { id: 2, at: null }], true)).toEqual([{ id: 1, at: { x: 0.1, y: 0.2 } }, { id: 2, at: null }]);
    expect(parseGroupMoves([{ id: 2, at: null }], false)).toBeNull();
  });

  it("rejects bad ids, duplicates, bad positions and oversized batches", () => {
    expect(parseGroupMoves([{ id: 0, at: { x: 0, y: 0 } }], true)).toBeNull();
    expect(parseGroupMoves([{ id: 1, at: { x: 0, y: 0 } }, { id: 1, at: { x: 1, y: 1 } }], true)).toBeNull();
    expect(parseGroupMoves([{ id: 1, at: { x: "a", y: 0 } }], true)).toBeNull();
    expect(parseGroupMoves([null], true)).toBeNull();
    expect(parseGroupMoves("nope", true)).toBeNull();
    expect(parseGroupMoves(Array.from({ length: GROUP_MOVE_LIMIT + 1 }, (_, index) => ({ id: index + 1, at: { x: 0, y: 0 } })), true)).toBeNull();
  });

  it("parses token moves where heroes may leave the map but creatures may not", () => {
    expect(parseMapTokenMoves({ heroes: [{ id: 1, at: null }], creatures: [{ id: 5, at: { x: 0.5, y: 0.5 } }] })).toEqual({ heroes: [{ id: 1, at: null }], creatures: [{ id: 5, at: { x: 0.5, y: 0.5 } }] });
    expect(parseMapTokenMoves({ heroes: [], creatures: [{ id: 5, at: null }] })).toBeNull();
    expect(parseMapTokenMoves(null)).toBeNull();
  });
});

describe("parsePositionMoves", () => {
  it("accepts placed moves and rejects removal", () => {
    expect(parsePositionMoves([{ id: 3, at: { x: 0.4, y: 0.6 } }])).toEqual([{ id: 3, at: { x: 0.4, y: 0.6 } }]);
    expect(parsePositionMoves([{ id: 3, at: null }])).toBeNull();
  });
});

describe("findIdInGroupKey", () => {
  it("бере число після останнього дефіса ключа групи", () => {
    expect(findIdInGroupKey("object-42")).toBe(42);
    expect(findIdInGroupKey("creature-7")).toBe(7);
  });
});
