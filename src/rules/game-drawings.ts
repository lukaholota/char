import { MAP_VIEW_WIDTH, toViewPoint } from "./game-grid";
import type { TokenPosition } from "./game-map";
import { parseHexColor } from "./map-colors";
import { buildRectOutline, fromStoredPoints, isPointNearStroke, isSamePoint, parseStrokePoints, roundShare, toStoredPoints } from "./map-strokes";
import { isPointInPolygon } from "./map-visibility";

/// Нові лінії мають колір #rrggbb зі спектру; назви — від ліній, намальованих до 22.11.
export const LEGACY_DRAWING_COLORS: Record<string, string> = {
  red: "#f87171", orange: "#fb923c", amber: "#fcd34d", emerald: "#34d399", teal: "#5eead4", sky: "#38bdf8",
  blue: "#3b82f6", violet: "#a78bfa", pink: "#f472b6", stone: "#a8a29e", white: "#ffffff", black: "#000000",
};
export const findDrawingHex = (color: string) => LEGACY_DRAWING_COLORS[color] ?? color;
/// Товщина — частка ширини мапи, як і в пензля туману: лінія не тоншає, коли мапу віддаляють.
export const DRAWING_WIDTHS = { fine: 0.0025, thin: 0.004, medium: 0.007, bold: 0.011, heavy: 0.018 } as const;
export type DrawingWidth = keyof typeof DRAWING_WIDTHS;

/// Крок між точками лінії не дрібніший за тонку (інакше тонка лінія швидко впреться в ліміт точок) і не крупніший за товсту.
export const findDrawingPointGap = (width: DrawingWidth) => Math.min(DRAWING_WIDTHS.bold, Math.max(DRAWING_WIDTHS.thin, DRAWING_WIDTHS[width]));
/// line — від руки, rect — два протилежні кути, circle — центр і точка на колі, polygon — вершини ламаної,
/// text — лівий верхній кут і точка під ним на висоту рядка: так рух і зміна розміру однакові для всіх фігур.
export const DRAWING_SHAPES = ["line", "rect", "circle", "polygon", "text"] as const;
export type DrawingShape = (typeof DRAWING_SHAPES)[number];
export const DRAWING_FONTS = ["plain", "antique", "hand", "ornate"] as const;
export type DrawingFont = (typeof DRAWING_FONTS)[number];
export const TEXT_EFFECTS = ["none", "outline", "shadow", "glow"] as const;
export type TextEffect = (typeof TEXT_EFFECTS)[number];
/// Висота рядка — частка ширини мапи.
export const DRAWING_TEXT_SIZES = { small: 0.025, medium: 0.04, large: 0.07 } as const;
export type DrawingTextSize = keyof typeof DRAWING_TEXT_SIZES;
export type DrawingLabel = { text: string; font: DrawingFont; effect: TextEffect };
export type DrawingStroke = { shape: DrawingShape; isFilled: boolean; fillOpacity: number; color: string; width: DrawingWidth; points: TokenPosition[]; label: DrawingLabel | null };
export type SceneDrawingView = DrawingStroke & { id: number; userId: number };

/// perSave дорівнює perScene: скасоване «Стерти все» повертає всі лінії одним запитом.
export const DRAWING_LIMITS = { perScene: 300, perSave: 300, eraserReach: 0.015, polygonPoints: 40, textLength: 200, textLines: 6 } as const;
export const SOLID_FILL = 1;
export const SEE_THROUGH_FILL = 0.4;
const MIN_RESIZE_SCALE = 0.05;
const TEXT_CHAR_WIDTH = 0.6;
const TEXT_LINE_HEIGHT = 1.2;

const parseDrawingColor = (value: unknown) => (typeof value === "string" && Object.hasOwn(LEGACY_DRAWING_COLORS, value) ? value : parseHexColor(value));
const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T => list.includes(value as T);
const parseFillOpacity = (value: unknown) => (typeof value === "number" && value >= 0.1 && value <= 1 ? Math.round(value * 100) / 100 : null);
const isDrawingWidth = (value: unknown): value is DrawingWidth => typeof value === "string" && Object.hasOwn(DRAWING_WIDTHS, value);

function hasShapePoints(shape: DrawingShape, points: TokenPosition[]): boolean {
  if (shape === "line") return true;
  if (shape === "polygon") return points.length >= 3 && points.length <= DRAWING_LIMITS.polygonPoints;
  if (shape === "text") return points.length === 2 && points[1].y > points[0].y;
  if (points.length !== 2) return false;
  const [from, to] = points;
  return shape === "circle" ? !isSamePoint(from, to) : from.x !== to.x && from.y !== to.y;
}

function parseDrawingLabel(raw: unknown): DrawingLabel | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { text, font, effect } = raw as Record<string, unknown>;
  if (typeof text !== "string" || !isOneOf(DRAWING_FONTS, font) || !isOneOf(TEXT_EFFECTS, effect)) return null;
  const trimmed = text.replace(/\r\n?/g, "\n").trim();
  if (!trimmed || trimmed.length > DRAWING_LIMITS.textLength || trimmed.split("\n").length > DRAWING_LIMITS.textLines) return null;
  return { text: trimmed, font, effect };
}

export function parseDrawingStroke(raw: unknown): DrawingStroke | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { shape = "line", isFilled = false, fillOpacity = SOLID_FILL, color, width, points, label = null } = raw as Record<string, unknown>;
  const [parsedColor, parsedOpacity, parsedLabel] = [parseDrawingColor(color), parseFillOpacity(fillOpacity), parseDrawingLabel(label)];
  if (!isOneOf(DRAWING_SHAPES, shape) || typeof isFilled !== "boolean" || !parsedColor || parsedOpacity === null || !isDrawingWidth(width)) return null;
  if ((shape === "text") !== (parsedLabel !== null)) return null;
  const parsed = parseStrokePoints(points);
  if (!parsed || !hasShapePoints(shape, parsed)) return null;
  return { shape, isFilled: shape !== "line" && shape !== "text" && isFilled, fillOpacity: parsedOpacity, color: parsedColor, width, points: parsed, label: parsedLabel };
}

export function parseDrawingStrokes(raw: unknown): DrawingStroke[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > DRAWING_LIMITS.perSave) return null;
  const parsed = raw.map(parseDrawingStroke);
  return parsed.every((stroke) => stroke !== null) ? (parsed as DrawingStroke[]) : null;
}

type DrawingRow = { id: number; userId: number; shape: string; isFilled: boolean; fillOpacity: number; color: string; width: string; points: unknown; text: string | null; font: string | null; textEffect: string | null };

export function buildDrawingView(row: DrawingRow): SceneDrawingView[] {
  const label = row.text === null ? null : { text: row.text, font: row.font, effect: row.textEffect };
  const stroke = parseDrawingStroke({ shape: row.shape, isFilled: row.isFilled, fillOpacity: row.fillOpacity, color: row.color, width: row.width, points: fromStoredPoints(row.points), label });
  return stroke ? [{ ...stroke, id: row.id, userId: row.userId }] : [];
}

export const toDrawingColumns = ({ label, points, ...stroke }: DrawingStroke) => ({ ...stroke, points: toStoredPoints(points), text: label?.text ?? null, font: label?.font ?? null, textEffect: label?.effect ?? null });

/// Кожен стирає й рухає свої лінії; майстер — будь-які.
export const canEditDrawing = (drawing: { userId: number }, userId: number, isGm: boolean) => isGm || drawing.userId === userId;

const CIRCLE_STEPS = 48;

const toSharePoint = (view: { x: number; y: number }, aspect: number): TokenPosition => ({ x: view.x / MAP_VIEW_WIDTH, y: (view.y * aspect) / MAP_VIEW_WIDTH });

export const findTextFontSize = ([top, bottom]: TokenPosition[], aspect: number) => toViewPoint(bottom, aspect).y - toViewPoint(top, aspect).y;

/// Ширину тексту оцінюємо за кількістю літер: сервер і гумка не знають, як шрифт ляже в браузері.
function buildTextOutline(points: TokenPosition[], text: string, aspect: number): TokenPosition[] {
  const size = findTextFontSize(points, aspect);
  const lines = text.split("\n");
  const corner = toViewPoint(points[0], aspect);
  const far = { x: corner.x + Math.max(...lines.map((line) => line.length)) * TEXT_CHAR_WIDTH * size, y: corner.y + lines.length * TEXT_LINE_HEIGHT * size };
  return buildRectOutline(points[0], toSharePoint(far, aspect));
}

export function buildTextPoints(at: TokenPosition, size: DrawingTextSize, aspect: number): TokenPosition[] {
  const height = DRAWING_TEXT_SIZES[size] * aspect;
  const top = Math.max(0, Math.min(at.y, 1 - height));
  return [{ x: roundShare(at.x), y: roundShare(top) }, { x: roundShare(at.x), y: roundShare(top + height) }];
}

/// Замкнений контур фігури в частках мапи — його малюємо і по ньому ж стирає гумка.
export function findShapeOutline({ shape, points, label }: Pick<DrawingStroke, "shape" | "points"> & { label?: DrawingLabel | null }, aspect: number): TokenPosition[] {
  const [first, second] = points;
  if (shape === "text" && label && second) return buildTextOutline(points, label.text, aspect);
  if (shape === "line" || !second) return points;
  if (shape === "polygon") return [...points, first];
  if (shape === "rect") return buildRectOutline(first, second);
  const [centre, edge] = [toViewPoint(first, aspect), toViewPoint(second, aspect)];
  const radius = Math.hypot(edge.x - centre.x, edge.y - centre.y);
  return Array.from({ length: CIRCLE_STEPS + 1 }, (_, step) => {
    const angle = (step / CIRCLE_STEPS) * Math.PI * 2;
    return toSharePoint({ x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) }, aspect);
  });
}

function isPointOnDrawing(point: TokenPosition, drawing: DrawingStroke, aspect: number): boolean {
  const outline = findShapeOutline(drawing, aspect);
  if (isPointNearStroke(point, outline, DRAWING_WIDTHS[drawing.width] / 2 + DRAWING_LIMITS.eraserReach, aspect)) return true;
  return (drawing.isFilled || drawing.shape === "text") && isPointInPolygon(toViewPoint(point, aspect), outline.map((each) => toViewPoint(each, aspect)));
}

export function findErasableDrawingIds(point: TokenPosition, drawings: SceneDrawingView[], aspect: number, userId: number, isGm: boolean): number[] {
  return drawings.filter((drawing) => canEditDrawing(drawing, userId, isGm) && isPointOnDrawing(point, drawing, aspect)).map((drawing) => drawing.id);
}

/// Верхня — намальована останньою.
export function findEditableDrawingAt(point: TokenPosition, drawings: SceneDrawingView[], aspect: number, userId: number, isGm: boolean): SceneDrawingView | null {
  return drawings.findLast((drawing) => canEditDrawing(drawing, userId, isGm) && isPointOnDrawing(point, drawing, aspect)) ?? null;
}

export function findDrawingBounds(drawing: DrawingStroke, aspect: number): { from: TokenPosition; to: TokenPosition } {
  const outline = findShapeOutline(drawing, aspect);
  const [xs, ys] = [outline.map((point) => point.x), outline.map((point) => point.y)];
  return { from: { x: Math.min(...xs), y: Math.min(...ys) }, to: { x: Math.max(...xs), y: Math.max(...ys) } };
}

/// Зсув обмежений так, щоб жодна точка не вийшла за мапу: фігура впирається в край, а не сплющується.
export function moveDrawingPoints(points: TokenPosition[], from: TokenPosition, at: TokenPosition): TokenPosition[] {
  const [xs, ys] = [points.map((point) => point.x), points.map((point) => point.y)];
  const dx = Math.min(1 - Math.max(...xs), Math.max(-Math.min(...xs), at.x - from.x));
  const dy = Math.min(1 - Math.max(...ys), Math.max(-Math.min(...ys), at.y - from.y));
  return points.map((point) => ({ x: roundShare(point.x + dx), y: roundShare(point.y + dy) }));
}

/// Пропорційно від протилежного кута; null — фігура вийшла б за мапу чи стала б крихітною.
export function resizeDrawingPoints(points: TokenPosition[], anchor: TokenPosition, handle: TokenPosition, at: TokenPosition, aspect: number): TokenPosition[] | null {
  const [origin, reach, target] = [anchor, handle, at].map((point) => toViewPoint(point, aspect));
  const [rx, ry] = [reach.x - origin.x, reach.y - origin.y];
  const lengthSquared = rx * rx + ry * ry;
  if (lengthSquared === 0) return null;
  const scale = ((target.x - origin.x) * rx + (target.y - origin.y) * ry) / lengthSquared;
  if (scale < MIN_RESIZE_SCALE) return null;
  const scaled = points.map((point) => {
    const view = toViewPoint(point, aspect);
    return toSharePoint({ x: origin.x + (view.x - origin.x) * scale, y: origin.y + (view.y - origin.y) * scale }, aspect);
  });
  return scaled.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) ? scaled.map((point) => ({ x: roundShare(point.x), y: roundShare(point.y) })) : null;
}
