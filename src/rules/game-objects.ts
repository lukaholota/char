import { buildMediaImageUrl } from "@/lib/media-url";
import { parseFloorId, type FloorId } from "./game-floors";
import type { TokenPosition } from "./game-map";
import { roundShare } from "./map-strokes";
import type { TokenTransform } from "./token-transform";

/// Обʼєкт — картинка, що лежить на мапі: без хітів, ініціативи й статблоку.
/// floor — поверх, на якому лежить обʼєкт (null — основна мапа); aspect — ширина картинки до висоти, для сліду плану поверху.
export type ObjectPlacement = { at: TokenPosition; widthCells: number; rotation: number; name: string | null; isHidden: boolean; sortOrder: number; floor: FloorId; aspect: number; appearance?: ObjectAppearance };
export type SceneObjectView = ObjectPlacement & { id: number; imageKey: string; imageUrl: string };
type SceneObjectRow = { id: number; imageKey: string; name: string | null; x: number; y: number; widthCells: number; rotation: number; isHidden: boolean; sortOrder: number; floor: number | null; aspect: number; appearance?: unknown };

export type ObjectAppearance = { brightness: number; contrast: number; hue: number; opacity: number };
export const DEFAULT_OBJECT_APPEARANCE: ObjectAppearance = { brightness: 100, contrast: 100, hue: 0, opacity: 100 };
export const OBJECT_APPEARANCE_LIMITS = {
  brightness: { min: 0, max: 200, step: 5 },
  contrast: { min: 0, max: 200, step: 5 },
  hue: { min: -180, max: 180, step: 5 },
  opacity: { min: 0, max: 100, step: 5 },
} as const;

/// План поверху буває завширшки з усю мапу, тож межа ширини — як у найширшої сітки.
export const OBJECT_LIMITS = { perScene: 100, nameLength: 40, widthCells: { min: 0.25, max: 300 }, aspect: { min: 0.05, max: 20 } } as const;
/// Без сітки обʼєкт міряється умовною клітинкою в двадцяту частину ширини мапи.
export const CELLS_ACROSS_MAP_WITHOUT_GRID = 20;

/// Вставлена копія каменя чи дерева трохи інша за розміром і поворотом, тож купа однакових предметів не виглядає штампом.
export function scatterObjectPlacement(placement: ObjectPlacement, random: () => number = Math.random): ObjectPlacement {
  const width = Math.round(placement.widthCells * (0.8 + random() * 0.45) * 100) / 100;
  return { ...placement, widthCells: Math.min(OBJECT_LIMITS.widthCells.max, Math.max(OBJECT_LIMITS.widthCells.min, width)), rotation: Math.floor(random() * 360) };
}
const SORT_ORDER_LIMIT = 1_000_000;

const isShare = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const isInRange = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

export function parseObjectPlacement(raw: unknown): ObjectPlacement | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { at, widthCells, rotation, name, isHidden, sortOrder, floor = null, aspect = 1, appearance } = raw as Record<string, unknown>;
  const point = typeof at === "object" && at !== null ? (at as Record<string, unknown>) : {};
  if (!isShare(point.x) || !isShare(point.y)) return null;
  if (!isInRange(widthCells, OBJECT_LIMITS.widthCells.min, OBJECT_LIMITS.widthCells.max)) return null;
  if (!Number.isInteger(rotation) || !isInRange(rotation, 0, 359)) return null;
  if (!Number.isInteger(sortOrder) || !isInRange(sortOrder, -SORT_ORDER_LIMIT, SORT_ORDER_LIMIT)) return null;
  if (typeof isHidden !== "boolean") return null;
  const parsedName = parseObjectName(name);
  const parsedFloor = parseFloorId(floor);
  if (parsedName === undefined || parsedFloor === undefined || !isInRange(aspect, OBJECT_LIMITS.aspect.min, OBJECT_LIMITS.aspect.max)) return null;
  const parsedAppearance = parseObjectAppearance(appearance);
  if (parsedAppearance === null) return null;
  return { at: { x: roundShare(point.x), y: roundShare(point.y) }, widthCells: Math.round(widthCells * 100) / 100, rotation, name: parsedName, isHidden, sortOrder, floor: parsedFloor, aspect: Math.round(aspect * 1000) / 1000, ...(parsedAppearance ? { appearance: parsedAppearance } : {}) };
}

function parseObjectAppearance(raw: unknown): ObjectAppearance | null | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object") return null;
  const { brightness, contrast, hue, opacity } = raw as Record<string, unknown>;
  const limits = OBJECT_APPEARANCE_LIMITS;
  if (!isInRange(brightness, limits.brightness.min, limits.brightness.max) || !isInRange(contrast, limits.contrast.min, limits.contrast.max) || !isInRange(hue, limits.hue.min, limits.hue.max) || !isInRange(opacity, limits.opacity.min, limits.opacity.max)) return null;
  return { brightness, contrast, hue, opacity };
}

function parseObjectName(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length > OBJECT_LIMITS.nameLength) return undefined;
  return trimmed || null;
}

/// Схований обʼєкт гравцю не віддається зовсім: у відповіді сервера його немає.
export function buildSceneObjectViews(rows: SceneObjectRow[], isGm: boolean): SceneObjectView[] {
  return rows
    .filter((row) => isGm || !row.isHidden)
    .toSorted((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
    .map((row) => ({
      id: row.id,
      imageKey: row.imageKey,
      imageUrl: buildMediaImageUrl(row.imageKey, "full"),
      at: { x: row.x, y: row.y },
      widthCells: row.widthCells,
      rotation: row.rotation,
      name: row.name,
      isHidden: row.isHidden,
      sortOrder: row.sortOrder,
      floor: row.floor,
      aspect: row.aspect,
      appearance: parseObjectAppearance(row.appearance) ?? undefined,
    }));
}

/// Ширина обʼєкта в частках ширини мапи: на сітці — клітинки, без неї — умовні клітинки.
export function findObjectWidthShare(widthCells: number, gridColumns: number | null): number {
  return widthCells / (gridColumns ?? CELLS_ACROSS_MAP_WITHOUT_GRID);
}

/// Ручки повороту й розміру токена працюють із відсотками: 100% — одна клітинка.
export const OBJECT_SCALE_RANGE = { min: OBJECT_LIMITS.widthCells.min * 100, max: OBJECT_LIMITS.widthCells.max * 100 } as const;

export function toObjectTransform(object: Pick<ObjectPlacement, "rotation" | "widthCells">): TokenTransform {
  return { rotation: object.rotation, scale: Math.round(object.widthCells * 100) };
}

export function applyObjectTransform<T extends ObjectPlacement>(object: T, transform: TokenTransform): T {
  const widthCells = Math.min(OBJECT_LIMITS.widthCells.max, Math.max(OBJECT_LIMITS.widthCells.min, transform.scale / 100));
  return { ...object, rotation: transform.rotation, widthCells };
}

export function findFrontSortOrder(objects: Pick<ObjectPlacement, "sortOrder">[]): number {
  return Math.min(SORT_ORDER_LIMIT, Math.max(0, ...objects.map((object) => object.sortOrder + 1)));
}

export function findBackSortOrder(objects: Pick<ObjectPlacement, "sortOrder">[]): number {
  return Math.max(-SORT_ORDER_LIMIT, Math.min(0, ...objects.map((object) => object.sortOrder - 1)));
}

export function toObjectPlacement(object: ObjectPlacement): ObjectPlacement {
  const { at, widthCells, rotation, name, isHidden, sortOrder, floor, aspect, appearance } = object;
  return { at, widthCells, rotation, name, isHidden, sortOrder, floor, aspect, ...(appearance ? { appearance } : {}) };
}
