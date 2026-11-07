import { describe, expect, it } from "vitest";
import type { LibraryMap } from "@/lib/refs/map-library";
import { GAME_SCENE_LIMITS, buildSceneListItems, filterLibraryMaps, findAutoSceneName, findLibraryMap, findQuickLibraryMaps, listLibraryPacks, findViewedSceneId, isLibraryMapKey, isRoomUploadedMapKey, parseSceneMapSource, parseSceneName } from "@/rules/game-scenes";

const catalog: LibraryMap[] = [
  { slug: "forest-road", name: "Лісова дорога", originalName: "Forest Road", pack: "dndavid", key: "library/maps/forest-road", width: 1600, height: 1000, grid: { columns: 32, rows: 20 } },
  { slug: "old-keep", name: "Стара фортеця", originalName: "Ravenloft Keep", pack: "castle-ravenloft", key: "library/maps/old-keep", width: 1200, height: 1600, grid: null },
];

describe("parseSceneName", () => {
  it("trims and collapses spaces", () => expect(parseSceneName("  Лісова   дорога ")).toBe("Лісова дорога"));
  it("rejects empty, too long and non-text names", () => {
    expect(parseSceneName("   ")).toBeNull();
    expect(parseSceneName("я".repeat(GAME_SCENE_LIMITS.name + 1))).toBeNull();
    expect(parseSceneName(42)).toBeNull();
  });
  it("accepts the longest allowed name", () => expect(parseSceneName("я".repeat(GAME_SCENE_LIMITS.name))).toHaveLength(GAME_SCENE_LIMITS.name));
});

describe("findViewedSceneId", () => {
  it("shows a player only the active scene, ignoring any open scene", () => {
    expect(findViewedSceneId({ isGm: false, activeSceneId: 1, openSceneId: 2 })).toBe(1);
    expect(findViewedSceneId({ isGm: false, activeSceneId: null, openSceneId: 2 })).toBeNull();
  });
  it("shows the GM the open scene, falling back to the active one", () => {
    expect(findViewedSceneId({ isGm: true, activeSceneId: 1, openSceneId: 2 })).toBe(2);
    expect(findViewedSceneId({ isGm: true, activeSceneId: 1, openSceneId: null })).toBe(1);
    expect(findViewedSceneId({ isGm: true, activeSceneId: null, openSceneId: null })).toBeNull();
  });
});

describe("buildSceneListItems", () => {
  it("marks the active scene and whether a map is set", () => {
    const items = buildSceneListItems([{ id: 1, name: "A", mapImageKey: "k" }, { id: 2, name: "B", mapImageKey: null }], 2);
    expect(items).toEqual([{ id: 1, name: "A", hasMap: true, isActive: false }, { id: 2, name: "B", hasMap: false, isActive: true }]);
  });
});

describe("findLibraryMap", () => {
  it("finds an entry by slug and handles an empty catalog", () => {
    expect(findLibraryMap("forest-road", catalog)?.name).toBe("Лісова дорога");
    expect(findLibraryMap("missing", catalog)).toBeNull();
    expect(findLibraryMap("forest-road", [])).toBeNull();
    expect(findLibraryMap(5, catalog)).toBeNull();
  });
});

describe("map key guards", () => {
  it("recognises library keys", () => {
    expect(isLibraryMapKey("library/maps/forest-road")).toBe(true);
    expect(isLibraryMapKey("games/7/map/abc")).toBe(false);
  });
  it("allows deleting only this room's own uploads", () => {
    expect(isRoomUploadedMapKey(7, "games/7/map/abc")).toBe(true);
    expect(isRoomUploadedMapKey(7, "games/8/map/abc")).toBe(false);
    expect(isRoomUploadedMapKey(7, "library/maps/forest-road")).toBe(false);
    expect(isRoomUploadedMapKey(7, "games/7/map/../../library/maps/x")).toBe(false);
  });
});

describe("parseSceneMapSource", () => {
  it("prefers a library slug, then an uploaded file, otherwise none", () => {
    const file = new Blob(["x"]);
    expect(parseSceneMapSource(new Map<string, unknown>([["library", "forest-road"], ["file", file]]))).toEqual({ kind: "library", slug: "forest-road" });
    expect(parseSceneMapSource(new Map<string, unknown>([["file", file]]))).toEqual({ kind: "upload", file });
    expect(parseSceneMapSource(new Map<string, unknown>([["library", ""], ["file", "text"]]))).toEqual({ kind: "none" });
  });
});

describe("filterLibraryMaps", () => {
  it("matches the Ukrainian and the original name, ignoring case", () => {
    expect(filterLibraryMaps(catalog, "ЛІСОВА", null).map((entry) => entry.slug)).toEqual(["forest-road"]);
    expect(filterLibraryMaps(catalog, "ravenloft", null).map((entry) => entry.slug)).toEqual(["old-keep"]);
  });
  it("combines the pack filter with the search and returns everything for an empty query", () => {
    expect(filterLibraryMaps(catalog, "", null)).toHaveLength(2);
    expect(filterLibraryMaps(catalog, "", "dndavid").map((entry) => entry.slug)).toEqual(["forest-road"]);
    expect(filterLibraryMaps(catalog, "ravenloft", "dndavid")).toEqual([]);
    expect(filterLibraryMaps([], "x", null)).toEqual([]);
  });
});

describe("listLibraryPacks", () => {
  it("lists each pack once in catalog order", () => {
    expect(listLibraryPacks([...catalog, ...catalog])).toEqual(["dndavid", "castle-ravenloft"]);
    expect(listLibraryPacks([])).toEqual([]);
  });
});

describe("findQuickLibraryMaps", () => {
  const buildMap = (slug: string): LibraryMap => ({ ...catalog[0], slug, key: `library/maps/${slug}` });
  it("puts the typical locations first in a fixed order and fills up to five from the catalog start", () => {
    const maps = ["a-trap", "cavern", "b-road", "a-fork-in-the-road", "c-hill", "d-lake", "e-tower"].map(buildMap);
    expect(findQuickLibraryMaps(maps).map((entry) => entry.slug)).toEqual(["a-fork-in-the-road", "cavern", "a-trap", "b-road", "c-hill"]);
  });
  it("returns what there is for a small or empty catalog", () => {
    expect(findQuickLibraryMaps(catalog)).toHaveLength(2);
    expect(findQuickLibraryMaps([])).toEqual([]);
  });
});

describe("findAutoSceneName", () => {
  it("fills an empty name and keeps replacing its own previous suggestion", () => {
    expect(findAutoSceneName("  ", null, "Велика печера")).toBe("Велика печера");
    expect(findAutoSceneName("Велика печера", "Велика печера", "Руїни замку")).toBe("Руїни замку");
  });
  it("leaves a name the GM typed and trims long map names to the scene limit", () => {
    expect(findAutoSceneName("Таверна", null, "Велика печера")).toBeNull();
    expect(findAutoSceneName("Велика печера!", "Велика печера", "Руїни замку")).toBeNull();
    expect(findAutoSceneName("", null, "я".repeat(80))).toHaveLength(GAME_SCENE_LIMITS.name);
  });
});
