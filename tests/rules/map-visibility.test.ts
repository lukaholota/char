import { describe, expect, it } from "vitest";
import { buildVisibilityPolygon, isMoveBlocked, isPointInPolygon, type SightSegment, type ViewPoint } from "@/rules/map-visibility";

const wall = (x1: number, y1: number, x2: number, y2: number): SightSegment => ({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
const box = (left: number, top: number, right: number, bottom: number): SightSegment[] => [
  wall(left, top, right, top),
  wall(right, top, right, bottom),
  wall(right, bottom, left, bottom),
  wall(left, bottom, left, top),
];
const sees = (eye: ViewPoint, walls: SightSegment[], radius = 200) => {
  const polygon = buildVisibilityPolygon(eye, walls, radius);
  return (x: number, y: number) => isPointInPolygon({ x, y }, polygon);
};

describe("buildVisibilityPolygon", () => {
  it("sees exactly the closed room around the eye", () => {
    const isSeen = sees({ x: 20, y: 20 }, box(10, 10, 30, 30));
    expect([isSeen(20, 20), isSeen(11, 11), isSeen(29, 29), isSeen(29, 11)]).toEqual([true, true, true, true]);
    expect([isSeen(5, 20), isSeen(40, 20), isSeen(20, 50), isSeen(20, 9)]).toEqual([false, false, false, false]);
  });

  it("does not leak through a corner where two walls meet", () => {
    const isSeen = sees({ x: 20, y: 20 }, box(10, 10, 30, 30));
    expect([isSeen(30.5, 30.5), isSeen(9.5, 9.5), isSeen(30.5, 9.5)]).toEqual([false, false, false]);
  });

  it("casts a shadow behind a pillar and sees around it", () => {
    const isSeen = sees({ x: 20, y: 50 }, [...box(0, 0, 100, 100), ...box(45, 45, 55, 55)]);
    expect([isSeen(80, 50), isSeen(60, 52)]).toEqual([false, false]);
    expect([isSeen(80, 20), isSeen(80, 80), isSeen(50, 30), isSeen(40, 50)]).toEqual([true, true, true, true]);
  });

  it("sees a cone through a door gap", () => {
    const room = [wall(10, 10, 30, 10), wall(30, 10, 30, 18), wall(30, 22, 30, 30), wall(30, 30, 10, 30), wall(10, 30, 10, 10)];
    const isSeen = sees({ x: 20, y: 20 }, room);
    expect([isSeen(40, 20), isSeen(40, 23), isSeen(60, 20)]).toEqual([true, true, true]);
    expect([isSeen(40, 12), isSeen(40, 28), isSeen(60, 40)]).toEqual([false, false, false]);
  });

  it("moves an eye that stands on a wall to one side instead of seeing nothing", () => {
    const polygon = buildVisibilityPolygon({ x: 50, y: 50 }, [wall(0, 50, 100, 50)], 30);
    expect(polygon.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    const sides = [isPointInPolygon({ x: 50, y: 40 }, polygon), isPointInPolygon({ x: 50, y: 60 }, polygon)];
    expect(sides.filter(Boolean)).toHaveLength(1);
  });

  it("handles an eye on the shared end of two walls", () => {
    const polygon = buildVisibilityPolygon({ x: 50, y: 50 }, [wall(50, 50, 80, 50), wall(50, 50, 50, 80)], 30);
    expect(polygon.length).toBeGreaterThan(0);
    expect(polygon.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(isPointInPolygon({ x: 60, y: 60 }, polygon)).toBe(true);
  });

  it("stops at a long wall whose ends are far, even when a short wall behind it is listed first", () => {
    const isSeen = sees({ x: 50, y: 50 }, [wall(49, 30, 51, 30), wall(0, 45, 100, 45)]);
    expect([isSeen(50, 40), isSeen(50, 31), isSeen(20, 40)]).toEqual([false, false, false]);
    expect([isSeen(50, 46), isSeen(20, 60)]).toEqual([true, true]);
  });

  it("returns the radius square when there are no walls", () => {
    const isSeen = sees({ x: 50, y: 50 }, [], 10);
    expect([isSeen(59, 59), isSeen(41, 41), isSeen(50, 50)]).toEqual([true, true, true]);
    expect([isSeen(61, 50), isSeen(50, 39)]).toEqual([false, false]);
  });

  it("ignores walls beyond the radius and clips walls that cross its edge", () => {
    expect(sees({ x: 50, y: 50 }, [wall(90, 0, 90, 100)], 20)(65, 50)).toBe(true);
    const isSeen = sees({ x: 50, y: 50 }, [wall(60, 0, 60, 100)], 20);
    expect([isSeen(55, 50), isSeen(55, 68), isSeen(65, 50), isSeen(65, 68)]).toEqual([true, true, false, false]);
  });

  it("skips a wall that is only a point", () => {
    expect(sees({ x: 50, y: 50 }, [wall(55, 50, 55, 50)], 20)(60, 50)).toBe(true);
  });
});

describe("isMoveBlocked", () => {
  const room = [wall(10, 10, 30, 10), wall(30, 10, 30, 18), wall(30, 22, 30, 30), wall(30, 30, 10, 30), wall(10, 30, 10, 10)];
  it("stops a move through a wall and lets it through a gap or around a corner", () => {
    expect(isMoveBlocked({ x: 20, y: 15 }, { x: 40, y: 15 }, room)).toBe(true);
    expect(isMoveBlocked({ x: 20, y: 20 }, { x: 40, y: 20 }, room)).toBe(false);
    expect(isMoveBlocked({ x: 35, y: 5 }, { x: 35, y: 35 }, room)).toBe(false);
  });

  it("lets a token that starts on a wall step away but not land on another wall", () => {
    expect(isMoveBlocked({ x: 20, y: 10 }, { x: 20, y: 15 }, room)).toBe(false);
    expect(isMoveBlocked({ x: 20, y: 15 }, { x: 20, y: 30 }, room)).toBe(true);
    expect(isMoveBlocked({ x: 20, y: 15 }, { x: 25, y: 15 }, [wall(0, 0, 50, 0)])).toBe(false);
  });
});

describe("isPointInPolygon", () => {
  it("tells inside from outside of a concave shape", () => {
    const shape = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 3 }, { x: 0, y: 10 }];
    expect([isPointInPolygon({ x: 2, y: 2 }, shape), isPointInPolygon({ x: 9, y: 8 }, shape)]).toEqual([true, true]);
    expect([isPointInPolygon({ x: 5, y: 8 }, shape), isPointInPolygon({ x: 11, y: 5 }, shape)]).toEqual([false, false]);
    expect(isPointInPolygon({ x: 1, y: 1 }, [])).toBe(false);
  });
});
