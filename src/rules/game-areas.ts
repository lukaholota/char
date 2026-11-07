import { parseTokenPosition, type TokenPosition } from "./game-map";
import { FEET_PER_CELL, findFeetVector, findViewUnitsPerFoot, moveByFeet, toViewPoint, type MapFrame } from "./game-grid";

export const AREA_SHAPES = ["circle", "cone", "line", "square"] as const;
export type AreaShape = (typeof AREA_SHAPES)[number];
export const AREA_LIMITS = { perScene: 30, label: 80, minFeet: 5, maxFeet: 500 } as const;
export const LINE_WIDTH_FEET = 5;

/// circle — сфера, циліндр чи радіус від точки; cone — трикутник 5e, ширина кінця дорівнює довжині;
/// line — смуга 5 футів завширшки; square — куб, що росте від середини грані в точці origin.
/// angle — напрямок у градусах на екрані: 0 — праворуч, 90 — вниз.
export type AreaPlacement = { shape: AreaShape; sizeFeet: number; origin: TokenPosition; angle: number; label: string | null };
export type SceneAreaView = AreaPlacement & { id: number; userId: number };

export const AREA_SHAPE_LABELS: Record<AreaShape, string> = { circle: "Коло", cone: "Конус", line: "Лінія", square: "Куб" };

export function isAreaShape(value: unknown): value is AreaShape {
  return typeof value === "string" && (AREA_SHAPES as readonly string[]).includes(value);
}

export function normalizeAngle(angle: number): number {
  const wrapped = ((angle % 360) + 360) % 360;
  return Math.round(wrapped * 10) / 10 % 360;
}

export function parseAreaPlacement(raw: unknown): AreaPlacement | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { shape, sizeFeet, origin, angle = 0, label = null } = raw as Record<string, unknown>;
  const position = parseTokenPosition(origin);
  if (!isAreaShape(shape) || !position) return null;
  if (typeof sizeFeet !== "number" || !Number.isInteger(sizeFeet) || sizeFeet < AREA_LIMITS.minFeet || sizeFeet > AREA_LIMITS.maxFeet) return null;
  if (typeof angle !== "number" || !Number.isFinite(angle)) return null;
  if (label !== null && typeof label !== "string") return null;
  const cleanLabel = label?.replace(/\s+/g, " ").trim().slice(0, AREA_LIMITS.label) || null;
  return { shape, sizeFeet, origin: position, angle: normalizeAngle(angle), label: cleanLabel };
}

function findDirection(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

/// Відстань уздовж напрямку й убік від нього — у футах від точки origin.
function splitAlongDirection(point: TokenPosition, area: AreaPlacement, frame: MapFrame) {
  const vector = findFeetVector(area.origin, point, frame);
  const direction = findDirection(area.angle);
  return { along: vector.x * direction.x + vector.y * direction.y, across: Math.abs(vector.x * direction.y - vector.y * direction.x), distance: Math.hypot(vector.x, vector.y) };
}

const EDGE_FEET = 0.01;

export function isPointInArea(point: TokenPosition, area: AreaPlacement, frame: MapFrame): boolean {
  const { along, across, distance } = splitAlongDirection(point, area, frame);
  const size = area.sizeFeet + EDGE_FEET;
  if (area.shape === "circle") return distance <= size;
  if (along < -EDGE_FEET || along > size) return false;
  if (area.shape === "cone") return across <= along / 2 + EDGE_FEET;
  if (area.shape === "line") return across <= LINE_WIDTH_FEET / 2 + EDGE_FEET;
  return across <= area.sizeFeet / 2 + EDGE_FEET;
}

/// Центри клітинок, які займає токен: велика істота потрапляє в область, щойно туди потрапила хоч одна її клітинка.
export function findTokenFootprint(center: TokenPosition, sizeCells: number, frame: MapFrame): TokenPosition[] {
  const half = (sizeCells - 1) / 2;
  const points: TokenPosition[] = [];
  for (let column = 0; column < sizeCells; column += 1)
    for (let row = 0; row < sizeCells; row += 1) points.push(moveByFeet(center, { x: (column - half) * FEET_PER_CELL, y: (row - half) * FEET_PER_CELL }, frame));
  return points;
}

export function isTokenInArea(center: TokenPosition, sizeCells: number, area: AreaPlacement, frame: MapFrame): boolean {
  return findTokenFootprint(center, Math.max(1, Math.round(sizeCells)), frame).some((point) => isPointInArea(point, area, frame));
}

/// Контур області для SVG-шару 100 × 100/aspect.
export function buildAreaPath(area: AreaPlacement, frame: MapFrame): string {
  const unit = findViewUnitsPerFoot(frame);
  const origin = toViewPoint(area.origin, frame.aspect);
  const size = area.sizeFeet * unit;
  if (area.shape === "circle") return `M${origin.x - size} ${origin.y}a${size} ${size} 0 1 0 ${size * 2} 0a${size} ${size} 0 1 0 ${-size * 2} 0Z`;
  const direction = findDirection(area.angle);
  const side = { x: -direction.y, y: direction.x };
  const halfWidth = area.shape === "cone" ? size / 2 : area.shape === "line" ? (LINE_WIDTH_FEET * unit) / 2 : size / 2;
  const startHalf = area.shape === "cone" ? 0 : halfWidth;
  const at = (along: number, across: number) => `${(origin.x + direction.x * along + side.x * across).toFixed(3)} ${(origin.y + direction.y * along + side.y * across).toFixed(3)}`;
  return `M${at(0, -startHalf)}L${at(size, -halfWidth)}L${at(size, halfWidth)}L${at(0, startHalf)}Z`;
}

/// Кінець області вздовж напрямку — там стоїть ручка повороту.
export function findAreaTip(area: AreaPlacement, frame: MapFrame): TokenPosition {
  const direction = findDirection(area.angle);
  return moveByFeet(area.origin, { x: direction.x * area.sizeFeet, y: direction.y * area.sizeFeet }, frame);
}

export function findAngleTowards(origin: TokenPosition, point: TokenPosition, frame: MapFrame): number {
  const vector = findFeetVector(origin, point, frame);
  return normalizeAngle((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
}

/// Куб на сітці стоїть рівно, конус і лінія — з кроком 15°, щоб зручно цілитися пальцем.
export function snapAreaAngle(shape: AreaShape, angle: number): number {
  const step = shape === "square" ? 90 : shape === "circle" ? 360 : 15;
  return normalizeAngle(Math.round(angle / step) * step);
}
