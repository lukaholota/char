import { MAP_VIEW_WIDTH, snapToHalfCell, toViewPoint, type MapFrame } from "./game-grid";
import type { TokenPosition } from "./game-map";
import { fromStoredPoints, isPointNearStroke, parseStrokePoints, roundShare } from "./map-strokes";
import type { SightSegment } from "./map-visibility";

export const WALL_KINDS = ["wall", "door"] as const;
export type WallKind = (typeof WALL_KINDS)[number];
export type WallLine = { kind: WallKind; isOpen: boolean; points: TokenPosition[] };
export type SceneWallView = WallLine & { id: number };
/// Будь-яка зміна стін — «прибрати ці, додати ці»: так розрізання дверима й скасування йдуть одним запитом.
export type WallEdit = { removedIds: number[]; added: WallLine[] };

/// reach — частка ширини мапи, у межах якої дотик чіпляється до стіни чи її кінця.
export const WALL_LIMITS = { segmentsPerScene: 400, pointsPerWall: 40, reach: 0.015 } as const;

const isWallKind = (value: unknown): value is WallKind => WALL_KINDS.includes(value as WallKind);
const isId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

export function parseWallLine(raw: unknown): WallLine | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, isOpen, points } = raw as Record<string, unknown>;
  if (!isWallKind(kind) || typeof isOpen !== "boolean") return null;
  const parsed = parseStrokePoints(points);
  if (!parsed || parsed.length < 2 || parsed.length > (kind === "door" ? 2 : WALL_LIMITS.pointsPerWall)) return null;
  return { kind, isOpen: kind === "door" && isOpen, points: parsed };
}

export function parseWallEdit(raw: unknown): WallEdit | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { removedIds, added } = raw as Record<string, unknown>;
  if (!Array.isArray(removedIds) || !Array.isArray(added) || removedIds.length > WALL_LIMITS.segmentsPerScene || added.length > WALL_LIMITS.segmentsPerScene) return null;
  if (!removedIds.every(isId) || removedIds.length + added.length === 0) return null;
  const lines = added.map(parseWallLine);
  if (!lines.every((line) => line !== null) || countWallSegments(lines as WallLine[]) > WALL_LIMITS.segmentsPerScene) return null;
  return { removedIds, added: lines as WallLine[] };
}

export const countWallSegments = (walls: Array<{ points: unknown[] }>) => walls.reduce((total, wall) => total + Math.max(0, wall.points.length - 1), 0);

export function buildWallView(row: { id: number; kind: string; isOpen: boolean; points: unknown }): SceneWallView[] {
  const line = parseWallLine({ kind: row.kind, isOpen: row.isOpen, points: fromStoredPoints(row.points) });
  return line ? [{ ...line, id: row.id }] : [];
}

/// Гравцям — лише зачинені лінії без kind і без дверей: таємні двері в даних нічим не відрізняються від стіни.
export function buildSceneWallViews(rows: Array<{ id: number; kind: string; isOpen: boolean; points: unknown }>, isGm: boolean): { walls: SceneWallView[]; sightLines: TokenPosition[][] } {
  const walls = rows.flatMap(buildWallView);
  return isGm ? { walls, sightLines: [] } : { walls: [], sightLines: collectClosedLines(walls) };
}

export const collectClosedLines = (walls: WallLine[]) => walls.filter((wall) => !wall.isOpen).map((wall) => wall.points);

export function collectSightSegments(lines: TokenPosition[][], aspect: number): SightSegment[] {
  return lines.flatMap((points) => {
    const view = points.map((point) => toViewPoint(point, aspect));
    return view.slice(1).map((to, index) => ({ from: view[index], to }));
  });
}

/// Спершу до кінця наявної стіни — так кімнати замикаються без щілин; далі до пів клітинки, без сітки — як є.
export function snapWallPoint(point: TokenPosition, walls: WallLine[], frame: MapFrame | null, aspect: number): TokenPosition {
  const at = toViewPoint(point, aspect);
  const reach = WALL_LIMITS.reach * MAP_VIEW_WIDTH;
  const nearest = walls
    .flatMap((wall) => wall.points)
    .map((end) => ({ end, distance: Math.hypot(toViewPoint(end, aspect).x - at.x, toViewPoint(end, aspect).y - at.y) }))
    .filter(({ distance }) => distance <= reach)
    .toSorted((left, right) => left.distance - right.distance)[0];
  if (nearest) return nearest.end;
  return frame ? snapToHalfCell(point, frame) : point;
}

export const findWallIdsNearPoint = (point: TokenPosition, walls: SceneWallView[], aspect: number) => walls.filter((wall) => isPointNearStroke(point, wall.points, WALL_LIMITS.reach, aspect)).map((wall) => wall.id);

/// Обидва кінці дверей на одній стіні — стіна розпадається на дві частини, двері стають між ними; інакше двері стоять окремо.
export function cutDoor(walls: SceneWallView[], from: TokenPosition, to: TokenPosition, aspect: number): WallEdit | null {
  const host = walls.find((wall) => wall.kind === "wall" && isPointNearStroke(from, wall.points, WALL_LIMITS.reach, aspect) && isPointNearStroke(to, wall.points, WALL_LIMITS.reach, aspect));
  if (!host) return isSamePoint(from, to) ? null : { removedIds: [], added: [{ kind: "door", isOpen: false, points: [from, to] }] };
  const [start, end] = [findPlaceOnLine(from, host.points, aspect), findPlaceOnLine(to, host.points, aspect)].toSorted((left, right) => left.index + left.share - (right.index + right.share));
  if (isSamePoint(start.at, end.at)) return null;
  const before = [...host.points.slice(0, start.index + 1), start.at];
  const after = [end.at, ...host.points.slice(end.index + 1)];
  const parts = [before, after].map(dropRepeatedPoints).filter((points) => points.length >= 2);
  return { removedIds: [host.id], added: [...parts.map((points): WallLine => ({ kind: "wall", isOpen: false, points })), { kind: "door", isOpen: false, points: [start.at, end.at] }] };
}

const isSamePoint = (left: TokenPosition, right: TokenPosition) => Math.abs(left.x - right.x) < 1e-6 && Math.abs(left.y - right.y) < 1e-6;
const dropRepeatedPoints = (points: TokenPosition[]) => points.filter((point, index) => index === 0 || !isSamePoint(point, points[index - 1]));

function findPlaceOnLine(point: TokenPosition, points: TokenPosition[], aspect: number) {
  const at = toViewPoint(point, aspect);
  const places = points.slice(1).map((next, index) => {
    const from = toViewPoint(points[index], aspect);
    const to = toViewPoint(next, aspect);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    const share = lengthSquared ? Math.min(1, Math.max(0, ((at.x - from.x) * dx + (at.y - from.y) * dy) / lengthSquared)) : 0;
    const distance = Math.hypot(at.x - (from.x + share * dx), at.y - (from.y + share * dy));
    const shareAt = { x: roundShare(points[index].x + share * (next.x - points[index].x)), y: roundShare(points[index].y + share * (next.y - points[index].y)) };
    return { index, share, distance, at: shareAt };
  });
  return places.toSorted((left, right) => left.distance - right.distance)[0];
}
