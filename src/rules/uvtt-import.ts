import { FEET_PER_CELL, parseSceneGrid, type SceneGrid } from "./game-grid";
import { LIGHT_LIMITS, parseLightSource, parseSceneLighting, type LightSource, type SceneLighting } from "./game-lighting";
import type { TokenPosition } from "./game-map";
import { countWallSegments, parseWallLine, WALL_LIMITS, type WallLine } from "./game-walls";
import { roundShare } from "./map-strokes";

export const UVTT_FILE_PATTERN = /\.(dd2vtt|uvtt|df2vtt)$/i;
export const UVTT_FILE_EXTENSIONS = ".dd2vtt,.uvtt,.df2vtt";

/// Готова розкладка сцени: браузер дістає її з файлу, сервер перевіряє ще раз.
export type SceneLayout = { grid: SceneGrid; lighting: SceneLighting; walls: WallLine[]; lights: LightSource[] };
export type UvttScene = SceneLayout & { imageBase64: string };
export type UvttFailure = "bad_file" | "no_image" | "too_many_walls" | "too_many_lights";
type UvttResult = { ok: true; value: UvttScene } | { ok: false; error: UvttFailure };

type CellPoint = { x: number; y: number };
type UvttFile = { origin: CellPoint; size: CellPoint; lines: CellPoint[][]; portals: Array<{ bounds: CellPoint[]; isClosed: boolean }>; lights: Array<{ at: CellPoint; range: number }>; image: string };

const COLLINEAR_AREA = 1e-3;
const fail = (error: UvttFailure): UvttResult => ({ ok: false, error });

export function parseUvttScene(raw: unknown): UvttResult {
  const file = readUvttFile(raw);
  if (!file) return fail("bad_file");
  if (!file.image) return fail("no_image");
  const grid = parseSceneGrid({ columns: file.size.x, offsetX: -file.origin.x, offsetY: -file.origin.y });
  if (!grid) return fail("bad_file");
  const toShare = (point: CellPoint) => ({ x: clampShare((point.x - file.origin.x) / file.size.x), y: clampShare((point.y - file.origin.y) / file.size.y) });
  const walls = [...collectWalls(file.lines, toShare), ...collectDoors(file.portals, toShare)];
  if (countWallSegments(walls) > WALL_LIMITS.segmentsPerScene) return fail("too_many_walls");
  const lights = collectLights(file.lights, toShare);
  if (lights.length > LIGHT_LIMITS.perScene) return fail("too_many_lights");
  return { ok: true, value: { grid, lighting: lights.length ? "dark" : "off", walls, lights, imageBase64: file.image } };
}

/// Те саме, що перевіряє ручний редактор: розкладці з браузера сервер не вірить на слово.
export function parseSceneLayout(raw: unknown): SceneLayout | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { grid, lighting, walls, lights } = raw as Record<string, unknown>;
  if (!Array.isArray(walls) || !Array.isArray(lights) || lights.length > LIGHT_LIMITS.perScene || walls.length > WALL_LIMITS.segmentsPerScene) return null;
  const parsed = { grid: parseSceneGrid(grid), lighting: parseSceneLighting(lighting), walls: walls.map(parseWallLine), lights: lights.map(parseLightSource) };
  if (!parsed.grid || !parsed.lighting || !isEveryParsed(parsed.walls) || !isEveryParsed(parsed.lights)) return null;
  if (countWallSegments(parsed.walls) > WALL_LIMITS.segmentsPerScene) return null;
  return { grid: parsed.grid, lighting: parsed.lighting, walls: parsed.walls, lights: parsed.lights };
}

/// Поля немає — звичайна мапа; зіпсоване поле — відмова, а не сцена без стін.
export function readSceneLayoutField(raw: unknown): { ok: true; value: SceneLayout | null } | { ok: false } {
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  try {
    const layout = parseSceneLayout(JSON.parse(raw));
    return layout ? { ok: true, value: layout } : { ok: false };
  } catch {
    return { ok: false };
  }
}

const isEveryParsed = <T,>(values: Array<T | null>): values is T[] => values.every((value) => value !== null);
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const clampShare = (value: number) => roundShare(Math.min(1, Math.max(0, value)));

function readCellPoint(raw: unknown): CellPoint | null {
  const { x, y } = (raw ?? {}) as Record<string, unknown>;
  return isNumber(x) && isNumber(y) ? { x, y } : null;
}

function readCellPoints(raw: unknown): CellPoint[] | null {
  if (!Array.isArray(raw)) return null;
  const points = raw.map(readCellPoint);
  return isEveryParsed(points) ? points : null;
}

function readUvttFile(raw: unknown): UvttFile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { resolution, line_of_sight = [], objects_line_of_sight = [], portals = [], lights = [], image } = raw as Record<string, unknown>;
  const { map_origin = { x: 0, y: 0 }, map_size } = (resolution ?? {}) as Record<string, unknown>;
  const origin = readCellPoint(map_origin);
  const size = readCellPoint(map_size);
  if (!origin || !size || size.x <= 0 || size.y <= 0) return null;
  if (!Array.isArray(line_of_sight) || !Array.isArray(objects_line_of_sight) || !Array.isArray(portals) || !Array.isArray(lights)) return null;
  const lines = [...line_of_sight, ...objects_line_of_sight].map(readCellPoints);
  const doors = portals.map(readPortal);
  const lamps = lights.map(readLamp);
  if (!isEveryParsed(lines) || !isEveryParsed(doors) || !isEveryParsed(lamps)) return null;
  return { origin, size, lines, portals: doors, lights: lamps, image: typeof image === "string" ? image : "" };
}

function readPortal(raw: unknown) {
  const { bounds, closed = true } = (raw ?? {}) as Record<string, unknown>;
  const points = readCellPoints(bounds);
  return points?.length === 2 ? { bounds: points, isClosed: closed !== false } : null;
}

function readLamp(raw: unknown) {
  const { position, range } = (raw ?? {}) as Record<string, unknown>;
  const at = readCellPoint(position);
  return at && isNumber(range) ? { at, range } : null;
}

function collectWalls(lines: CellPoint[][], toShare: (point: CellPoint) => TokenPosition): WallLine[] {
  return lines
    .map(dropStraightPoints)
    .filter((line) => line.length > 1)
    .flatMap(splitLongLine)
    .map((points) => ({ kind: "wall" as const, isOpen: false, points: points.map(toShare) }));
}

function collectDoors(portals: UvttFile["portals"], toShare: (point: CellPoint) => TokenPosition): WallLine[] {
  return portals.map((portal) => ({ kind: "door" as const, isOpen: !portal.isClosed, points: portal.bounds.map(toShare) }));
}

/// Радіус файлу — у клітинках; ділимо навпіл на яскраве й тьмяне, колір та силу відкидаємо.
function collectLights(lamps: UvttFile["lights"], toShare: (point: CellPoint) => TokenPosition): LightSource[] {
  return lamps
    .map(({ at, range }) => ({ at, cells: Math.min(Math.round(range), LIGHT_LIMITS.feet / FEET_PER_CELL) }))
    .filter(({ cells }) => cells > 0)
    .map(({ at, cells }) => {
      const brightFeet = Math.round(cells / 2) * FEET_PER_CELL;
      return { at: toShare(at), brightFeet, dimFeet: cells * FEET_PER_CELL - brightFeet };
    });
}

/// Експортери ставлять точку на кожен виступ стіни; точки посеред прямої не міняють тінь, а ліміт їдять.
export function dropStraightPoints(line: CellPoint[]): CellPoint[] {
  const kept: CellPoint[] = [];
  for (const point of line) {
    const last = kept.at(-1);
    if (last && last.x === point.x && last.y === point.y) continue;
    const beforeLast = kept.at(-2);
    if (last && beforeLast && isStraightOn(beforeLast, last, point)) kept.pop();
    kept.push(point);
  }
  return kept;
}

/// Розворот назад теж лежить на прямій, але без середньої точки шматок стіни зник би.
function isStraightOn(from: CellPoint, middle: CellPoint, to: CellPoint) {
  const [first, second] = [{ x: middle.x - from.x, y: middle.y - from.y }, { x: to.x - middle.x, y: to.y - middle.y }];
  return Math.abs(first.x * second.y - first.y * second.x) < COLLINEAR_AREA && first.x * second.x + first.y * second.y > 0;
}

function splitLongLine(line: CellPoint[]): CellPoint[][] {
  const step = WALL_LIMITS.pointsPerWall - 1;
  const parts: CellPoint[][] = [];
  for (let start = 0; start < line.length - 1; start += step) parts.push(line.slice(start, start + step + 1));
  return parts;
}
