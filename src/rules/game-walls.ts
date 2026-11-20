import { MAP_VIEW_WIDTH, snapToHalfCell, toViewPoint, type MapFrame } from "./game-grid";
import type { TokenPosition } from "./game-map";
import { fromStoredPoints, isPointNearStroke, isSamePoint, parseStrokePoints, roundShare } from "./map-strokes";
import type { SightSegment } from "./map-visibility";

export const WALL_KINDS = ["wall", "door", "window"] as const;
export type WallKind = (typeof WALL_KINDS)[number];
/// none — відчиняє будь-хто, locked — лише майстер, secret — гравцям це стіна, доки майстер не змінить вид.
export const DOOR_LOCKS = ["none", "locked", "secret"] as const;
export type DoorLock = (typeof DOOR_LOCKS)[number];
export type WallLine = { kind: WallKind; isOpen: boolean; lock: DoorLock; isCurtained: boolean; points: TokenPosition[] };
export type SceneWallView = WallLine & { id: number };
export type Opening = Omit<WallLine, "points">;
export type OpeningChange = Partial<Omit<Opening, "kind">>;
export type OpeningChangeFailure = "forbidden" | "wall_gone" | "door_locked";
/// Будь-яка зміна стін — «прибрати ці, додати ці»: так розрізання дверима й скасування йдуть одним запитом.
export type WallEdit = { removedIds: number[]; added: WallLine[] };

/// reach — частка ширини мапи, у межах якої дотик чіпляється до стіни чи її кінця.
export const WALL_LIMITS = { segmentsPerScene: 400, pointsPerWall: 40, reach: 0.015 } as const;

const isWallKind = (value: unknown): value is WallKind => WALL_KINDS.includes(value as WallKind);
const isDoorLock = (value: unknown): value is DoorLock => DOOR_LOCKS.includes(value as DoorLock);
export const buildWall = (points: TokenPosition[]): WallLine => ({ kind: "wall", isOpen: false, lock: "none", isCurtained: false, points });
export const buildOpening = (kind: "door" | "window", lock: DoorLock = "none"): Opening => ({ kind, isOpen: false, lock: kind === "door" ? lock : "none", isCurtained: false });
const isId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

export function parseWallLine(raw: unknown): WallLine | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, isOpen, lock = "none", isCurtained = false, points } = raw as Record<string, unknown>;
  if (!isWallKind(kind) || typeof isOpen !== "boolean" || !isDoorLock(lock) || typeof isCurtained !== "boolean") return null;
  const parsed = parseStrokePoints(points);
  if (!parsed || parsed.length < 2 || parsed.length > (kind === "wall" ? WALL_LIMITS.pointsPerWall : 2)) return null;
  return { kind, isOpen: kind !== "wall" && isOpen, lock: kind === "door" ? lock : "none", isCurtained: kind === "window" && isCurtained, points: parsed };
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

type WallRow = { id: number; kind: string; isOpen: boolean; doorLock: string; isCurtained: boolean; points: unknown };

export function buildWallView(row: WallRow): SceneWallView[] {
  const line = parseWallLine({ kind: row.kind, isOpen: row.isOpen, lock: row.doorLock, isCurtained: row.isCurtained, points: fromStoredPoints(row.points) });
  return line ? [{ ...line, id: row.id }] : [];
}

export function buildSceneWallViews(rows: WallRow[], isGm: boolean): SceneWallView[] {
  const walls = rows.flatMap(buildWallView);
  return isGm ? walls : walls.flatMap(maskSecretDoor);
}

/// Таємні двері в даних гравця — звичайна стіна, поки зачинені; відчинені просто зникають.
function maskSecretDoor(wall: SceneWallView): SceneWallView[] {
  if (wall.kind !== "door" || wall.lock !== "secret") return [wall];
  return wall.isOpen ? [] : [{ ...buildWall(wall.points), id: wall.id }];
}

const isSightBlocking = (wall: WallLine) => wall.kind === "wall" || (wall.kind === "door" && !wall.isOpen) || (wall.kind === "window" && wall.isCurtained);
const isMoveBlocking = (wall: WallLine) => wall.kind === "wall" || !wall.isOpen;
export const collectSightLines = (walls: WallLine[]) => walls.filter(isSightBlocking).map((wall) => wall.points);
export const collectMoveLines = (walls: WallLine[]) => walls.filter(isMoveBlocking).map((wall) => wall.points);

export function parseOpeningChange(raw: unknown): OpeningChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { isOpen, lock, isCurtained } = raw as Record<string, unknown>;
  if ((isOpen !== undefined && typeof isOpen !== "boolean") || (lock !== undefined && !isDoorLock(lock)) || (isCurtained !== undefined && typeof isCurtained !== "boolean")) return null;
  if (lock !== undefined && isCurtained !== undefined) return null;
  const change: OpeningChange = { ...(isOpen !== undefined && { isOpen }), ...(lock !== undefined && { lock }), ...(isCurtained !== undefined && { isCurtained }) };
  return Object.keys(change).length ? change : null;
}

/// Вид дверей буває лише в дверей, штора — лише у вікна. Гравець лише відчиняє й зачиняє звичайні двері; таємні для нього — стіна.
export function findOpeningChangeFailure(opening: { kind: string; lock: string }, change: OpeningChange, isGm: boolean): OpeningChangeFailure | null {
  const isOpenOnly = change.lock === undefined && change.isCurtained === undefined;
  if (!isGm && !isOpenOnly) return "forbidden";
  const fitsKind = opening.kind === "door" ? change.isCurtained === undefined : opening.kind === "window" && isGm && change.lock === undefined;
  if (!fitsKind) return "wall_gone";
  if (isGm || opening.lock === "none") return null;
  return opening.lock === "locked" ? "door_locked" : "wall_gone";
}

const OPENING_SIDE_SHARE = 0.006;
/// Дві точки по обидва боки від середини дверей: двері видно, якщо видно хоч один бік.
export const findOpeningMiddle = ([from, to]: TokenPosition[]) => ({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });

export function findOpeningSides(points: TokenPosition[], aspect: number): TokenPosition[] {
  const [from, to] = points;
  const middle = findOpeningMiddle(points);
  const dx = to.x - from.x;
  const dy = (to.y - from.y) / aspect;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: (-dy / length) * OPENING_SIDE_SHARE, y: (dx / length) * OPENING_SIDE_SHARE * aspect };
  return [{ x: middle.x + normal.x, y: middle.y + normal.y }, { x: middle.x - normal.x, y: middle.y - normal.y }];
}

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

/// Обидва кінці дверей чи вікна на одній стіні — стіна розпадається на дві частини, отвір стає між ними; інакше він стоїть окремо.
export function cutOpening(walls: SceneWallView[], opening: Opening, from: TokenPosition, to: TokenPosition, aspect: number): WallEdit | null {
  const host = walls.find((wall) => wall.kind === "wall" && isPointNearStroke(from, wall.points, WALL_LIMITS.reach, aspect) && isPointNearStroke(to, wall.points, WALL_LIMITS.reach, aspect));
  if (!host) return isSamePoint(from, to) ? null : { removedIds: [], added: [{ ...opening, points: [from, to] }] };
  const [start, end] = [findPlaceOnLine(from, host.points, aspect), findPlaceOnLine(to, host.points, aspect)].toSorted((left, right) => left.index + left.share - (right.index + right.share));
  if (isSamePoint(start.at, end.at)) return null;
  const before = [...host.points.slice(0, start.index + 1), start.at];
  const after = [end.at, ...host.points.slice(end.index + 1)];
  const parts = [before, after].map(dropRepeatedPoints).filter((points) => points.length >= 2);
  return { removedIds: [host.id], added: [...parts.map(buildWall), { ...opening, points: [start.at, end.at] }] };
}

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
