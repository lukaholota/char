import { MAP_VIEW_WIDTH, toViewPoint } from "./game-grid";
import type { TokenPosition } from "./game-map";

/// Мазок — ламана в частках мапи; товщину рахуємо в частках ширини, тож у координатах шару 100 × 100/aspect.
export const STROKE_POINT_LIMIT = 400;

type ViewPoint = { x: number; y: number };

export const roundShare = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function parseStrokePoints(raw: unknown): TokenPosition[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > STROKE_POINT_LIMIT) return null;
  const points: TokenPosition[] = [];
  for (const point of raw) {
    const { x, y } = (point ?? {}) as Record<string, unknown>;
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
    points.push({ x: roundShare(x), y: roundShare(y) });
  }
  return points;
}

/// У базі точки лежать парами [x, y]: так мазок займає вдвічі менше місця.
export const toStoredPoints = (points: TokenPosition[]) => points.map((point): [number, number] => [point.x, point.y]);
export const fromStoredPoints = (stored: unknown) => (Array.isArray(stored) ? stored.map((pair) => (Array.isArray(pair) ? { x: pair[0], y: pair[1] } : null)) : null);

/// Палець шле десятки точок за мить: нову беремо лише тоді, коли вона відійшла від попередньої на minGap частки ширини.
export function appendStrokePoint(points: TokenPosition[], point: TokenPosition, minGap: number, aspect: number): TokenPosition[] {
  const last = points.at(-1);
  if (!last) return [point];
  if (points.length >= STROKE_POINT_LIMIT) return points;
  return findViewDistance(toViewPoint(last, aspect), toViewPoint(point, aspect)) >= minGap * MAP_VIEW_WIDTH ? [...points, point] : points;
}

export function isPointNearStroke(point: TokenPosition, points: TokenPosition[], reach: number, aspect: number): boolean {
  const at = toViewPoint(point, aspect);
  const view = points.map((each) => toViewPoint(each, aspect));
  return view.some((from, index) => findDistanceToSegment(at, from, view[index + 1] ?? from) <= reach * MAP_VIEW_WIDTH);
}

/// Одна точка — це дотик: короткий відрізок, щоб круглі кінці намалювали крапку.
export function buildStrokePath(points: TokenPosition[], aspect: number): string {
  const view = points.map((point) => toViewPoint(point, aspect));
  const [first, ...rest] = view;
  if (!first) return "";
  const tail = rest.length > 0 ? rest : [{ x: first.x + 0.01, y: first.y }];
  return `M${first.x} ${first.y}${tail.map((point) => `L${point.x} ${point.y}`).join("")}`;
}

const findViewDistance = (from: ViewPoint, to: ViewPoint) => Math.hypot(to.x - from.x, to.y - from.y);

function findDistanceToSegment(at: ViewPoint, from: ViewPoint, to: ViewPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const share = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((at.x - from.x) * dx + (at.y - from.y) * dy) / lengthSquared));
  return findViewDistance(at, { x: from.x + share * dx, y: from.y + share * dy });
}
