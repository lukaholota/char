import { MAP_LIBRARY_KEY_PREFIX, type LibraryMap } from "@/lib/refs/map-library";

export const GAME_SCENE_LIMITS = { perRoom: 20, name: 60 } as const;

export type GameSceneListItem = { id: number; name: string; hasMap: boolean; isActive: boolean };

export function parseSceneName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name && name.length <= GAME_SCENE_LIMITS.name ? name : null;
}

/// Гравець бачить лише активну сцену; майстер — ту, яку відкрив, а без відкритої — активну.
export function findViewedSceneId(viewer: { isGm: boolean; activeSceneId: number | null; openSceneId: number | null }): number | null {
  return viewer.isGm ? (viewer.openSceneId ?? viewer.activeSceneId) : viewer.activeSceneId;
}

export function buildSceneListItems(scenes: readonly { id: number; name: string; mapImageKey: string | null }[], activeSceneId: number | null): GameSceneListItem[] {
  return scenes.map((scene) => ({ id: scene.id, name: scene.name, hasMap: scene.mapImageKey !== null, isActive: scene.id === activeSceneId }));
}

export function findLibraryMap(slug: unknown, catalog: readonly LibraryMap[]): LibraryMap | null {
  return typeof slug === "string" ? (catalog.find((entry) => entry.slug === slug) ?? null) : null;
}

export function filterLibraryMaps(catalog: readonly LibraryMap[], query: string, pack: string | null): LibraryMap[] {
  const needle = query.trim().toLowerCase();
  return catalog.filter(
    (entry) => (pack === null || entry.pack === pack) && (needle === "" || entry.name.toLowerCase().includes(needle) || entry.originalName.toLowerCase().includes(needle)),
  );
}

const QUICK_LIBRARY_SLUGS = ["a-fork-in-the-road", "camp-and-inn", "cavern", "heart-of-the-dungeon", "castle-ruins"];
const QUICK_LIBRARY_SIZE = QUICK_LIBRARY_SLUGS.length;

/// Перші мапи в діалозі сцени — типові локації; якщо їх немає в каталозі, добираємо з початку.
export function findQuickLibraryMaps(catalog: readonly LibraryMap[]): LibraryMap[] {
  const picked = QUICK_LIBRARY_SLUGS.flatMap((slug) => catalog.find((entry) => entry.slug === slug) ?? []);
  const rest = catalog.filter((entry) => !picked.includes(entry));
  return [...picked, ...rest].slice(0, QUICK_LIBRARY_SIZE);
}

/// Назву мапи підставляємо, лише поки майстер не ввів свою.
export function findAutoSceneName(currentName: string, lastAutoName: string | null, mapName: string): string | null {
  const isUntouched = currentName.trim() === "" || currentName === lastAutoName;
  return isUntouched ? mapName.slice(0, GAME_SCENE_LIMITS.name) : null;
}

export function listLibraryPacks(catalog: readonly LibraryMap[]): string[] {
  return [...new Set(catalog.map((entry) => entry.pack))];
}

export function isLibraryMapKey(key: string): boolean {
  return key.startsWith(MAP_LIBRARY_KEY_PREFIX);
}

/// Видаляти з R2 можна лише те, що завантажили в цю кімнату: бібліотечні мапи спільні для всіх кімнат.
export function isRoomUploadedMapKey(sessionId: number, key: string): boolean {
  return key.startsWith(`games/${sessionId}/map/`) && !key.includes("..");
}

export type SceneMapSource = { kind: "none" } | { kind: "upload"; file: unknown } | { kind: "library"; slug: string };

export function parseSceneMapSource(form: { get(name: string): unknown }): SceneMapSource {
  const slug = form.get("library");
  if (typeof slug === "string" && slug) return { kind: "library", slug };
  const file = form.get("file");
  return file instanceof Blob ? { kind: "upload", file } : { kind: "none" };
}
