import type { TokenPosition } from "./game-map";

/// Туман: спершу сховано все, далі прямокутники по черзі відкривають або знову ховають частини мапи.
export type FogArea = { isRevealed: boolean; x: number; y: number; width: number; height: number };
export type SceneFog = { areas: FogArea[] };
export type FogChange = { kind: "cover" } | { kind: "clear" } | { kind: "undo" } | { kind: "area"; area: FogArea };
type StoredFogArea = { r: boolean; x: number; y: number; w: number; h: number };

export const FOG_LIMITS = { areas: 300, minSide: 0.005 } as const;
const WHOLE_MAP: FogArea = { isRevealed: true, x: 0, y: 0, width: 1, height: 1 };

const roundShare = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;

/// Прямокутник обрізається межами мапи; надто вузький — null, щоб випадковий дотик не лишав смужок.
export function parseFogArea(raw: unknown): FogArea | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { isRevealed, x, y, width, height } = raw as Record<string, unknown>;
  if (typeof isRevealed !== "boolean" || ![x, y, width, height].every((value) => typeof value === "number" && Number.isFinite(value))) return null;
  const left = roundShare(Math.min(x as number, (x as number) + (width as number)));
  const top = roundShare(Math.min(y as number, (y as number) + (height as number)));
  const right = roundShare(Math.max(x as number, (x as number) + (width as number)));
  const bottom = roundShare(Math.max(y as number, (y as number) + (height as number)));
  if (right - left < FOG_LIMITS.minSide || bottom - top < FOG_LIMITS.minSide) return null;
  return { isRevealed, x: left, y: top, width: roundShare(right - left), height: roundShare(bottom - top) };
}

export function parseSceneFog(raw: unknown): SceneFog | null {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { areas?: unknown }).areas)) return null;
  const areas = ((raw as { areas: unknown[] }).areas)
    .map((stored) => {
      const { r, x, y, w, h } = (stored ?? {}) as Partial<StoredFogArea>;
      return parseFogArea({ isRevealed: r, x, y, width: w, height: h });
    })
    .filter((area): area is FogArea => area !== null);
  return { areas: areas.slice(-FOG_LIMITS.areas) };
}

export function serializeSceneFog(fog: SceneFog): { areas: StoredFogArea[] } {
  return { areas: fog.areas.map((area) => ({ r: area.isRevealed, x: area.x, y: area.y, w: area.width, h: area.height })) };
}

export function parseFogChange(raw: unknown): FogChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, area } = raw as Record<string, unknown>;
  if (kind === "cover" || kind === "clear" || kind === "undo") return { kind };
  const parsed = kind === "area" ? parseFogArea(area) : null;
  return parsed ? { kind: "area", area: parsed } : null;
}

const coversWholeMap = (area: FogArea) => area.x === 0 && area.y === 0 && area.width === 1 && area.height === 1;

/// Без туману «сховати» частину мапи означає: усе відкрито, крім цього прямокутника.
/// Прямокутник на всю мапу робить попередні зайвими, тож вони не займають місця в ліміті.
export function applyFogChange(fog: SceneFog | null, change: FogChange): SceneFog | null | "too_many" {
  if (change.kind === "clear") return null;
  if (change.kind === "cover") return { areas: [] };
  if (change.kind === "undo") return fog ? { areas: fog.areas.slice(0, -1) } : null;
  const previous = coversWholeMap(change.area) ? [] : (fog?.areas ?? [WHOLE_MAP]);
  const areas = [...previous, change.area];
  return areas.length > FOG_LIMITS.areas ? "too_many" : { areas };
}

export function isPointHidden(point: TokenPosition, fog: SceneFog | null): boolean {
  if (!fog) return false;
  for (let index = fog.areas.length - 1; index >= 0; index -= 1) {
    const area = fog.areas[index];
    if (point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height) return !area.isRevealed;
  }
  return true;
}
