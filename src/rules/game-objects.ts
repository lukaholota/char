import { buildMediaImageUrl } from "@/lib/media-url";
import type { TokenPosition } from "./game-map";
import { roundShare } from "./map-strokes";
import type { TokenTransform } from "./token-transform";

/// Обʼєкт — картинка, що лежить на мапі: без хітів, ініціативи й статблоку.
export type ObjectPlacement = { at: TokenPosition; widthCells: number; rotation: number; name: string | null; isHidden: boolean; sortOrder: number };
export type SceneObjectView = ObjectPlacement & { id: number; imageKey: string; imageUrl: string };
type SceneObjectRow = { id: number; imageKey: string; name: string | null; x: number; y: number; widthCells: number; rotation: number; isHidden: boolean; sortOrder: number };

export const OBJECT_LIMITS = { perScene: 100, nameLength: 40, widthCells: { min: 0.25, max: 10 } } as const;
/// Без сітки обʼєкт міряється умовною клітинкою в двадцяту частину ширини мапи.
export const CELLS_ACROSS_MAP_WITHOUT_GRID = 20;
const SORT_ORDER_LIMIT = 1_000_000;

const isShare = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const isInRange = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

export function parseObjectPlacement(raw: unknown): ObjectPlacement | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { at, widthCells, rotation, name, isHidden, sortOrder } = raw as Record<string, unknown>;
  const point = typeof at === "object" && at !== null ? (at as Record<string, unknown>) : {};
  if (!isShare(point.x) || !isShare(point.y)) return null;
  if (!isInRange(widthCells, OBJECT_LIMITS.widthCells.min, OBJECT_LIMITS.widthCells.max)) return null;
  if (!Number.isInteger(rotation) || !isInRange(rotation, 0, 359)) return null;
  if (!Number.isInteger(sortOrder) || !isInRange(sortOrder, -SORT_ORDER_LIMIT, SORT_ORDER_LIMIT)) return null;
  if (typeof isHidden !== "boolean") return null;
  const parsedName = parseObjectName(name);
  if (parsedName === undefined) return null;
  return { at: { x: roundShare(point.x), y: roundShare(point.y) }, widthCells: Math.round(widthCells * 100) / 100, rotation, name: parsedName, isHidden, sortOrder };
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
    }));
}

/// Ширина обʼєкта в частках ширини мапи: на сітці — клітинки, без неї — умовні клітинки.
export function findObjectWidthShare(widthCells: number, gridColumns: number | null): number {
  return widthCells / (gridColumns ?? CELLS_ACROSS_MAP_WITHOUT_GRID);
}

/// Ручки повороту й розміру токена працюють із відсотками: 100% — одна клітинка.
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
  const { at, widthCells, rotation, name, isHidden, sortOrder } = object;
  return { at, widthCells, rotation, name, isHidden, sortOrder };
}
