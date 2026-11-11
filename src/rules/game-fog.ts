import type { TokenPosition } from "./game-map";
import { fromStoredPoints, isPointNearStroke, parseStrokePoints, roundShare, toStoredPoints } from "./map-strokes";

/// Туман: спершу сховано все, далі прямокутники й мазки пензля по черзі відкривають або знову ховають частини мапи.
export type FogRect = { isRevealed: boolean; x: number; y: number; width: number; height: number };
/// radius — частка ширини мапи, як і x точок, тож мазок однаково товстий уздовж і впоперек.
export type FogStroke = { isRevealed: boolean; points: TokenPosition[]; radius: number };
export type FogArea = FogRect | FogStroke;
export type SceneFog = { areas: FogArea[] };
export type FogChange = { kind: "cover" } | { kind: "clear" } | { kind: "set"; fog: SceneFog | null } | { kind: "area"; area: FogArea };
type StoredFogRect = { r: boolean; x: number; y: number; w: number; h: number };
type StoredFogStroke = { r: boolean; p: Array<[number, number]>; d: number };

export const FOG_LIMITS = { areas: 300, minSide: 0.005, minRadius: 0.005, maxRadius: 0.2 } as const;
const WHOLE_MAP: FogRect = { isRevealed: true, x: 0, y: 0, width: 1, height: 1 };

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export const isFogStroke = (area: FogArea): area is FogStroke => "points" in area;

export function parseFogArea(raw: unknown): FogArea | null {
  if (typeof raw !== "object" || raw === null) return null;
  return "points" in raw ? parseFogStroke(raw as Record<string, unknown>) : parseFogRect(raw as Record<string, unknown>);
}

/// Прямокутник обрізається межами мапи; надто вузький — null, щоб випадковий дотик не лишав смужок.
function parseFogRect({ isRevealed, x, y, width, height }: Record<string, unknown>): FogRect | null {
  if (typeof isRevealed !== "boolean" || !isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(width) || !isFiniteNumber(height)) return null;
  const left = roundShare(Math.min(x, x + width));
  const top = roundShare(Math.min(y, y + height));
  const right = roundShare(Math.max(x, x + width));
  const bottom = roundShare(Math.max(y, y + height));
  if (right - left < FOG_LIMITS.minSide || bottom - top < FOG_LIMITS.minSide) return null;
  return { isRevealed, x: left, y: top, width: roundShare(right - left), height: roundShare(bottom - top) };
}

function parseFogStroke({ isRevealed, points, radius }: Record<string, unknown>): FogStroke | null {
  if (typeof isRevealed !== "boolean" || !isFiniteNumber(radius) || radius < FOG_LIMITS.minRadius || radius > FOG_LIMITS.maxRadius) return null;
  const parsed = parseStrokePoints(points);
  return parsed ? { isRevealed, points: parsed, radius: roundShare(radius) } : null;
}

export function parseSceneFog(raw: unknown): SceneFog | null {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as { areas?: unknown }).areas)) return null;
  const areas = ((raw as { areas: unknown[] }).areas).map(parseStoredFogArea).filter((area): area is FogArea => area !== null);
  return { areas: areas.slice(-FOG_LIMITS.areas) };
}

function parseStoredFogArea(stored: unknown): FogArea | null {
  const { r, x, y, w, h, p, d } = (stored ?? {}) as Partial<StoredFogRect & StoredFogStroke>;
  if (!Array.isArray(p)) return parseFogRect({ isRevealed: r, x, y, width: w, height: h });
  return parseFogStroke({ isRevealed: r, points: fromStoredPoints(p), radius: d });
}

export function serializeSceneFog(fog: SceneFog): { areas: Array<StoredFogRect | StoredFogStroke> } {
  return {
    areas: fog.areas.map((area) =>
      isFogStroke(area)
        ? { r: area.isRevealed, p: toStoredPoints(area.points), d: area.radius }
        : { r: area.isRevealed, x: area.x, y: area.y, w: area.width, h: area.height },
    ),
  };
}

export function parseFogChange(raw: unknown): FogChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, area, fog } = raw as Record<string, unknown>;
  if (kind === "cover" || kind === "clear") return { kind };
  if (kind === "set") return parseFogToSet(fog);
  const parsed = kind === "area" ? parseFogArea(area) : null;
  return parsed ? { kind: "area", area: parsed } : null;
}

/// Повернення туману, яким він був до останньої правки: кожна область перевіряється так само, як нова.
function parseFogToSet(raw: unknown): FogChange | null {
  if (raw === null) return { kind: "set", fog: null };
  const areas = typeof raw === "object" && Array.isArray((raw as { areas?: unknown }).areas) ? (raw as { areas: unknown[] }).areas : null;
  if (!areas || areas.length > FOG_LIMITS.areas) return null;
  const parsed = areas.map(parseFogArea);
  return parsed.every((area) => area !== null) ? { kind: "set", fog: { areas: parsed as FogArea[] } } : null;
}

const coversWholeMap = (area: FogArea) => !isFogStroke(area) && area.x === 0 && area.y === 0 && area.width === 1 && area.height === 1;

/// Без туману «сховати» частину мапи означає: усе відкрито, крім цієї області.
/// Прямокутник на всю мапу робить попередні зайвими, тож вони не займають місця в ліміті.
export function applyFogChange(fog: SceneFog | null, change: FogChange): SceneFog | null | "too_many" {
  if (change.kind === "clear") return null;
  if (change.kind === "cover") return { areas: [] };
  if (change.kind === "set") return change.fog;
  const previous = coversWholeMap(change.area) ? [] : (fog?.areas ?? [WHOLE_MAP]);
  const areas = [...previous, change.area];
  return areas.length > FOG_LIMITS.areas ? "too_many" : { areas };
}

export function isPointHidden(point: TokenPosition, fog: SceneFog | null, aspect: number): boolean {
  if (!fog) return false;
  for (let index = fog.areas.length - 1; index >= 0; index -= 1) {
    const area = fog.areas[index];
    if (isFogStroke(area) ? isPointNearStroke(point, area.points, area.radius, aspect) : isPointInRect(point, area)) return !area.isRevealed;
  }
  return true;
}

const isPointInRect = (point: TokenPosition, rect: FogRect) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
