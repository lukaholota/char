import { MAP_VIEW_WIDTH, toViewPoint } from "./game-grid";
import type { TokenPosition } from "./game-map";
import { buildRectOutline, fromStoredPoints, isPointNearStroke, isSamePoint, parseStrokePoints } from "./map-strokes";
import { isPointInPolygon } from "./map-visibility";

export const DRAWING_COLORS = ["red", "orange", "amber", "emerald", "teal", "sky", "blue", "violet", "pink", "stone", "white", "black"] as const;
export type DrawingColor = (typeof DRAWING_COLORS)[number];
/// Товщина — частка ширини мапи, як і в пензля туману: лінія не тоншає, коли мапу віддаляють.
export const DRAWING_WIDTHS = { fine: 0.0025, thin: 0.004, medium: 0.007, bold: 0.011, heavy: 0.018 } as const;
export type DrawingWidth = keyof typeof DRAWING_WIDTHS;

/// Крок між точками лінії не дрібніший за тонку (інакше тонка лінія швидко впреться в ліміт точок) і не крупніший за товсту.
export const findDrawingPointGap = (width: DrawingWidth) => Math.min(DRAWING_WIDTHS.bold, Math.max(DRAWING_WIDTHS.thin, DRAWING_WIDTHS[width]));
/// line — від руки, rect — два протилежні кути, circle — центр і точка на колі, polygon — вершини ламаної.
export const DRAWING_SHAPES = ["line", "rect", "circle", "polygon"] as const;
export type DrawingShape = (typeof DRAWING_SHAPES)[number];
export type DrawingStroke = { shape: DrawingShape; isFilled: boolean; color: DrawingColor; width: DrawingWidth; points: TokenPosition[] };
export type SceneDrawingView = DrawingStroke & { id: number; userId: number };

/// perSave дорівнює perScene: скасоване «Стерти все» повертає всі лінії одним запитом.
export const DRAWING_LIMITS = { perScene: 300, perSave: 300, eraserReach: 0.015, polygonPoints: 40 } as const;

const isDrawingColor = (value: unknown): value is DrawingColor => DRAWING_COLORS.includes(value as DrawingColor);
const isDrawingWidth = (value: unknown): value is DrawingWidth => typeof value === "string" && Object.hasOwn(DRAWING_WIDTHS, value);
const isDrawingShape = (value: unknown): value is DrawingShape => DRAWING_SHAPES.includes(value as DrawingShape);

function hasShapePoints(shape: DrawingShape, points: TokenPosition[]): boolean {
  if (shape === "line") return true;
  if (shape === "polygon") return points.length >= 3 && points.length <= DRAWING_LIMITS.polygonPoints;
  if (points.length !== 2) return false;
  const [from, to] = points;
  return shape === "circle" ? !isSamePoint(from, to) : from.x !== to.x && from.y !== to.y;
}

export function parseDrawingStroke(raw: unknown): DrawingStroke | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { shape = "line", isFilled = false, color, width, points } = raw as Record<string, unknown>;
  if (!isDrawingShape(shape) || typeof isFilled !== "boolean" || !isDrawingColor(color) || !isDrawingWidth(width)) return null;
  const parsed = parseStrokePoints(points);
  return parsed && hasShapePoints(shape, parsed) ? { shape, isFilled: shape !== "line" && isFilled, color, width, points: parsed } : null;
}

export function parseDrawingStrokes(raw: unknown): DrawingStroke[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > DRAWING_LIMITS.perSave) return null;
  const parsed = raw.map(parseDrawingStroke);
  return parsed.every((stroke) => stroke !== null) ? (parsed as DrawingStroke[]) : null;
}

type DrawingRow = { id: number; userId: number; shape: string; isFilled: boolean; color: string; width: string; points: unknown };

export function buildDrawingView(row: DrawingRow): SceneDrawingView[] {
  const stroke = parseDrawingStroke({ shape: row.shape, isFilled: row.isFilled, color: row.color, width: row.width, points: fromStoredPoints(row.points) });
  return stroke ? [{ ...stroke, id: row.id, userId: row.userId }] : [];
}

/// Кожен стирає свої лінії; майстер — будь-які.
export const canEraseDrawing = (drawing: { userId: number }, userId: number, isGm: boolean) => isGm || drawing.userId === userId;

const CIRCLE_STEPS = 48;

/// Замкнений контур фігури в частках мапи — його малюємо і по ньому ж стирає гумка.
export function findShapeOutline({ shape, points }: Pick<DrawingStroke, "shape" | "points">, aspect: number): TokenPosition[] {
  const [first, second] = points;
  if (shape === "line" || !second) return points;
  if (shape === "polygon") return [...points, first];
  if (shape === "rect") return buildRectOutline(first, second);
  const [centre, edge] = [toViewPoint(first, aspect), toViewPoint(second, aspect)];
  const radius = Math.hypot(edge.x - centre.x, edge.y - centre.y);
  return Array.from({ length: CIRCLE_STEPS + 1 }, (_, step) => {
    const angle = (step / CIRCLE_STEPS) * Math.PI * 2;
    return { x: (centre.x + radius * Math.cos(angle)) / MAP_VIEW_WIDTH, y: ((centre.y + radius * Math.sin(angle)) * aspect) / MAP_VIEW_WIDTH };
  });
}

function isPointOnDrawing(point: TokenPosition, drawing: DrawingStroke, aspect: number): boolean {
  const outline = findShapeOutline(drawing, aspect);
  if (isPointNearStroke(point, outline, DRAWING_WIDTHS[drawing.width] / 2 + DRAWING_LIMITS.eraserReach, aspect)) return true;
  return drawing.isFilled && isPointInPolygon(toViewPoint(point, aspect), outline.map((each) => toViewPoint(each, aspect)));
}

export function findErasableDrawingIds(point: TokenPosition, drawings: SceneDrawingView[], aspect: number, userId: number, isGm: boolean): number[] {
  return drawings.filter((drawing) => canEraseDrawing(drawing, userId, isGm) && isPointOnDrawing(point, drawing, aspect)).map((drawing) => drawing.id);
}
