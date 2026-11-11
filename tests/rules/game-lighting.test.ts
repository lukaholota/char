import { describe, expect, it } from "vitest";
import type { MapFrame } from "@/rules/game-grid";
import { buildSceneLightViews, buildSceneSight, findPointSight, hasLight, isTokenSeen, LIGHT_PRESETS, parseLightSource, parseSceneLighting, parseTokenLight, type SightInput } from "@/rules/game-lighting";
import { collectSightSegments } from "@/rules/game-walls";

const at = (x: number, y: number) => ({ x, y });
/// 20 клітинок по 5 фт на квадратній мапі: частка 0.05 — одна клітинка.
const frame: MapFrame = { aspect: 1, grid: { columns: 20, offsetX: 0, offsetY: 0, isVisible: true, opacity: 0.4 } };
const wallAtHalf = collectSightSegments([[at(0.5, 0), at(0.5, 1)]], 1);
const input = (overrides: Partial<SightInput>): SightInput => ({ lighting: "dark", segments: [], lights: [], eyes: [{ at: at(0.1, 0.5), darkvisionFeet: 0 }], frame, aspect: 1, ...overrides });
const sightAt = (point: { x: number; y: number }, overrides: Partial<SightInput>) => findPointSight(point, buildSceneSight(input(overrides))!);

describe("parsing", () => {
  it("accepts known lighting, light feet 0–300 and a source inside the map", () => {
    expect(parseSceneLighting("dim")).toBe("dim");
    expect(parseSceneLighting("night")).toBeNull();
    expect(parseTokenLight({ brightFeet: 20, dimFeet: 20 })).toEqual({ brightFeet: 20, dimFeet: 20 });
    expect(parseTokenLight({ brightFeet: 301, dimFeet: 0 })).toBeNull();
    expect(parseTokenLight({ brightFeet: 1.5, dimFeet: 0 })).toBeNull();
    expect(parseTokenLight(null)).toBeNull();
    expect(parseLightSource({ at: at(0.2, 0.3), brightFeet: 5, dimFeet: 5 })).toEqual({ at: at(0.2, 0.3), brightFeet: 5, dimFeet: 5 });
    expect(parseLightSource({ at: at(1.2, 0.3), brightFeet: 5, dimFeet: 5 })).toBeNull();
    expect(parseLightSource({ brightFeet: 5, dimFeet: 5 })).toBeNull();
    expect(hasLight({ brightFeet: 0, dimFeet: 0 })).toBe(false);
    expect(LIGHT_PRESETS.find((preset) => preset.key === "torch")).toMatchObject({ brightFeet: 20, dimFeet: 20 });
  });

  it("players get only lights that are on", () => {
    const rows = [{ id: 1, x: 0.2, y: 0.3, brightFeet: 20, dimFeet: 20, isOn: true }, { id: 2, x: 0.5, y: 0.5, brightFeet: 5, dimFeet: 5, isOn: false }];
    expect(buildSceneLightViews(rows, false)).toEqual([{ id: 1, at: at(0.2, 0.3), brightFeet: 20, dimFeet: 20, isOn: true }]);
    expect(buildSceneLightViews(rows, true).map((light) => light.id)).toEqual([1, 2]);
  });
});

describe("findPointSight", () => {
  it("has nothing to compute when lighting is off", () => {
    expect(buildSceneSight(input({ lighting: "off" }))).toBeNull();
  });

  it("bright and dim scenes show everything in line of sight, but not behind a wall", () => {
    expect(sightAt(at(0.4, 0.2), { lighting: "bright" })).toBe("bright");
    expect(sightAt(at(0.4, 0.2), { lighting: "dim" })).toBe("dim");
    expect(sightAt(at(0.8, 0.5), { lighting: "bright", segments: wallAtHalf })).toBe("hidden");
  });

  it("darkness shows only the eye's own cell, lit points and darkvision", () => {
    expect(sightAt(at(0.13, 0.5), {})).toBe("dim");
    expect(sightAt(at(0.3, 0.5), {})).toBe("hidden");
    expect(sightAt(at(0.3, 0.5), { eyes: [{ at: at(0.1, 0.5), darkvisionFeet: 60 }] })).toBe("dim");
    expect(sightAt(at(0.3, 0.5), { lighting: "dim", eyes: [{ at: at(0.1, 0.5), darkvisionFeet: 60 }] })).toBe("bright");
    const torch = { at: at(0.3, 0.5), brightFeet: 20, dimFeet: 20 };
    expect(sightAt(at(0.33, 0.5), { lights: [torch] })).toBe("bright");
    expect(sightAt(at(0.3, 0.2), { lights: [torch] })).toBe("dim");
    expect(sightAt(at(0.3, 0.05), { lights: [torch] })).toBe("hidden");
  });

  it("light behind a wall does not light this side, and no eye means nothing seen", () => {
    expect(sightAt(at(0.45, 0.5), { segments: wallAtHalf, lights: [{ at: at(0.55, 0.5), brightFeet: 20, dimFeet: 0 }] })).toBe("hidden");
    expect(sightAt(at(0.4, 0.5), { lighting: "bright", eyes: [] })).toBe("hidden");
  });

  it("a closed door blocks like a wall; an open one is skipped", () => {
    const closed = collectSightSegments([[at(0.5, 0.4), at(0.5, 0.6)]], 1);
    const corridor = collectSightSegments([[at(0.5, 0), at(0.5, 0.4)], [at(0.5, 0.6), at(0.5, 1)]], 1);
    expect(sightAt(at(0.8, 0.5), { lighting: "bright", segments: [...corridor, ...closed] })).toBe("hidden");
    expect(sightAt(at(0.8, 0.5), { lighting: "bright", segments: corridor })).toBe("bright");
  });

  it("without a grid lights and darkvision measure nothing", () => {
    const sight = buildSceneSight(input({ frame: null, lights: [{ at: at(0.3, 0.5), brightFeet: 20, dimFeet: 20 }], eyes: [{ at: at(0.1, 0.5), darkvisionFeet: 60 }] }))!;
    expect(sight.lights).toEqual([]);
    expect(findPointSight(at(0.3, 0.5), sight)).toBe("hidden");
  });
});

describe("isTokenSeen", () => {
  it("shows a large creature whose corner peeks past a wall end", () => {
    const sight = buildSceneSight(input({ lighting: "bright", segments: collectSightSegments([[at(0.5, 0.3), at(0.5, 1)]], 1) }))!;
    expect(isTokenSeen(at(0.55, 0.32), 1, sight, frame)).toBe(false);
    expect(isTokenSeen(at(0.55, 0.32), 4, sight, frame)).toBe(true);
    expect(isTokenSeen(at(0.55, 0.32), 4, sight, null)).toBe(false);
    expect(isTokenSeen(at(0.2, 0.5), 1, sight, frame)).toBe(true);
  });
});
