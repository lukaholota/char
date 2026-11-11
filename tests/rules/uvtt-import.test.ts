import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIGHT_LIMITS } from "@/rules/game-lighting";
import { WALL_LIMITS } from "@/rules/game-walls";
import { dropStraightPoints, parseSceneLayout, parseUvttScene, readSceneLayoutField, UVTT_FILE_PATTERN } from "@/rules/uvtt-import";

const readFixture = (name: string) => JSON.parse(readFileSync(`${__dirname}/../fixtures/uvtt/${name}`, "utf8")) as Record<string, unknown>;
const at = (x: number, y: number) => ({ x, y });
const square = (size: number) => ({ resolution: { map_size: { x: size, y: size } }, image: "AA==" });

function parseOk(raw: unknown) {
  const result = parseUvttScene(raw);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("parseUvttScene", () => {
  it("reads a Dungeondraft room: walls with the object outline, a closed and an open door, a torch-sized light and a dark scene", () => {
    const scene = parseOk(readFixture("dungeondraft-room.dd2vtt"));
    expect(scene.grid).toMatchObject({ columns: 8, offsetX: 0, offsetY: 0 });
    expect(scene.lighting).toBe("dark");
    expect(scene.imageBase64).toBe("iVBORw0KGgo=");
    const walls = scene.walls.filter((wall) => wall.kind === "wall");
    expect(walls.map((wall) => wall.points.length)).toEqual([5, 2, 2]);
    expect(walls[0].points[0]).toEqual(at(0.125, 0.1667));
    expect(scene.walls.filter((wall) => wall.kind === "door")).toEqual([
      { kind: "door", isOpen: false, points: [at(0.125, 0.4167), at(0.125, 0.5833)] },
      { kind: "door", isOpen: true, points: [at(0.5625, 0.8333), at(0.6875, 0.8333)] },
    ]);
    expect(scene.lights).toEqual([{ at: at(0.5, 0.5), brightFeet: 10, dimFeet: 10 }]);
  });

  it("reads a Dungeon Alchemist export without map_origin and without lights as a lit scene", () => {
    const scene = parseOk(readFixture("dungeon-alchemist-hall.uvtt"));
    expect(scene.grid.columns).toBe(10);
    expect(scene.lighting).toBe("off");
    expect(scene.walls).toEqual([{ kind: "wall", isOpen: false, points: [at(0, 0), at(1, 0), at(1, 1), at(0, 1), at(0, 0)] }]);
    expect(scene.lights).toEqual([]);
  });

  it("moves the grid by a fractional origin and keeps points outside the picture on its edge", () => {
    const scene = parseOk({ ...square(4), resolution: { map_origin: at(-0.25, 0.5), map_size: at(4, 4) }, line_of_sight: [[at(-1, 0.5), at(2, 0.5)]] });
    expect(scene.grid).toMatchObject({ offsetX: 0.25, offsetY: 0.5 });
    expect(scene.walls[0].points).toEqual([at(0, 0), at(0.5625, 0)]);
  });

  it("splits a wall longer than the editor allows into joined pieces", () => {
    const zigzag = Array.from({ length: 100 }, (_, index) => at(index / 10, index % 2));
    const scene = parseOk({ ...square(10), line_of_sight: [zigzag] });
    expect(scene.walls.every((wall) => wall.points.length <= WALL_LIMITS.pointsPerWall)).toBe(true);
    expect(scene.walls.reduce((total, wall) => total + wall.points.length - 1, 0)).toBe(99);
    expect(scene.walls[1].points[0]).toEqual(scene.walls[0].points.at(-1));
  });

  it("refuses the whole file when walls or lights stay over the limit, with no partial import", () => {
    const zigzag = Array.from({ length: WALL_LIMITS.segmentsPerScene + 2 }, (_, index) => at(index / 50, index % 2));
    expect(parseUvttScene({ ...square(10), line_of_sight: [zigzag] })).toEqual({ ok: false, error: "too_many_walls" });
    const lights = Array.from({ length: LIGHT_LIMITS.perScene + 1 }, () => ({ position: at(1, 1), range: 2 }));
    expect(parseUvttScene({ ...square(10), lights })).toEqual({ ok: false, error: "too_many_lights" });
  });

  it("drops lights without reach and caps huge ranges at the editor maximum", () => {
    const scene = parseOk({ ...square(10), lights: [{ position: at(1, 1), range: 0.2 }, { position: at(2, 2), range: 3 }, { position: at(3, 3), range: 500 }] });
    expect(scene.lights.map(({ brightFeet, dimFeet }) => [brightFeet, dimFeet])).toEqual([[10, 5], [150, 150]]);
  });

  it("rejects a broken file, a file without a picture and a grid the editor cannot hold", () => {
    expect(parseUvttScene(null)).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ image: "AA==" })).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ ...square(10), line_of_sight: [[at(0, 0), { x: "1", y: 0 }]] })).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ ...square(10), portals: [{ bounds: [at(0, 0)] }] })).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ ...square(10), lights: [{ position: at(0, 0) }] })).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ ...square(10), portals: "none" })).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ resolution: { map_size: at(10, 10) } })).toEqual({ ok: false, error: "no_image" });
    expect(parseUvttScene(square(1000))).toEqual({ ok: false, error: "bad_file" });
    expect(parseUvttScene({ ...square(10), resolution: { map_size: at(0, 10) } })).toEqual({ ok: false, error: "bad_file" });
  });

  it("knows the three export extensions", () => {
    expect(["a.dd2vtt", "b.UVTT", "c.df2vtt"].every((name) => UVTT_FILE_PATTERN.test(name))).toBe(true);
    expect(UVTT_FILE_PATTERN.test("map.webp")).toBe(false);
  });
});

describe("dropStraightPoints", () => {
  it("removes repeated points and points in the middle of a straight run, but keeps corners and turns back", () => {
    expect(dropStraightPoints([at(0, 0), at(0, 0), at(1, 0), at(2, 0), at(2, 1)])).toEqual([at(0, 0), at(2, 0), at(2, 1)]);
    expect(dropStraightPoints([at(0, 0), at(2, 0), at(1, 0)])).toEqual([at(0, 0), at(2, 0), at(1, 0)]);
  });
});

describe("parseSceneLayout", () => {
  const layout = parseOk(readFixture("dungeondraft-room.dd2vtt"));
  const sent = JSON.parse(JSON.stringify({ grid: layout.grid, lighting: layout.lighting, walls: layout.walls, lights: layout.lights })) as Record<string, unknown>;

  it("accepts what the browser parsed from a file", () => {
    expect(parseSceneLayout(sent)).toEqual({ grid: layout.grid, lighting: "dark", walls: layout.walls, lights: layout.lights });
  });

  it("rejects a tampered layout: bad grid, unknown lighting, broken wall or light, too much of anything", () => {
    expect(parseSceneLayout(null)).toBeNull();
    expect(parseSceneLayout({ ...sent, grid: { columns: 1 } })).toBeNull();
    expect(parseSceneLayout({ ...sent, lighting: "noon" })).toBeNull();
    expect(parseSceneLayout({ ...sent, walls: [{ kind: "window", isOpen: false, points: [at(0, 0), at(1, 1)] }] })).toBeNull();
    expect(parseSceneLayout({ ...sent, lights: [{ at: at(2, 0), brightFeet: 10, dimFeet: 10 }] })).toBeNull();
    expect(parseSceneLayout({ ...sent, lights: "none" })).toBeNull();
    expect(parseSceneLayout({ ...sent, lights: Array.from({ length: LIGHT_LIMITS.perScene + 1 }, () => layout.lights[0]) })).toBeNull();
    const longWall = { kind: "wall", isOpen: false, points: Array.from({ length: WALL_LIMITS.pointsPerWall }, (_, index) => at(index / 100, index % 2)) };
    expect(parseSceneLayout({ ...sent, walls: Array.from({ length: 11 }, () => longWall) })).toBeNull();
    expect(parseSceneLayout({ ...sent, walls: Array.from({ length: WALL_LIMITS.segmentsPerScene + 1 }, () => layout.walls[0]) })).toBeNull();
  });
});

describe("readSceneLayoutField", () => {
  it("treats a missing field as an ordinary map and anything unreadable as a rejection", () => {
    const { imageBase64: _image, ...layout } = parseOk(readFixture("dungeon-alchemist-hall.uvtt"));
    expect(readSceneLayoutField(null)).toEqual({ ok: true, value: null });
    expect(readSceneLayoutField(JSON.stringify(layout))).toEqual({ ok: true, value: layout });
    expect(readSceneLayoutField(new Blob(["{}"]))).toEqual({ ok: false });
    expect(readSceneLayoutField("{not json")).toEqual({ ok: false });
    expect(readSceneLayoutField("{}")).toEqual({ ok: false });
  });
});
