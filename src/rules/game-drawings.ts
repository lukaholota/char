import type { TokenPosition } from "./game-map";
import { fromStoredPoints, isPointNearStroke, parseStrokePoints } from "./map-strokes";

export const DRAWING_COLORS = ["red", "amber", "emerald", "sky", "violet", "white", "black"] as const;
export type DrawingColor = (typeof DRAWING_COLORS)[number];
/// Товщина — частка ширини мапи, як і в пензля туману: лінія не тоншає, коли мапу віддаляють.
export const DRAWING_WIDTHS = { fine: 0.0025, thin: 0.004, medium: 0.007, bold: 0.011, heavy: 0.018 } as const;
export type DrawingWidth = keyof typeof DRAWING_WIDTHS;

/// Крок між точками лінії не дрібніший за тонку (інакше тонка лінія швидко впреться в ліміт точок) і не крупніший за товсту.
export const findDrawingPointGap = (width: DrawingWidth) => Math.min(DRAWING_WIDTHS.bold, Math.max(DRAWING_WIDTHS.thin, DRAWING_WIDTHS[width]));
export type DrawingStroke = { color: DrawingColor; width: DrawingWidth; points: TokenPosition[] };
export type SceneDrawingView = DrawingStroke & { id: number; userId: number };

/// perSave дорівнює perScene: скасоване «Стерти все» повертає всі лінії одним запитом.
export const DRAWING_LIMITS = { perScene: 300, perSave: 300, eraserReach: 0.015 } as const;

const isDrawingColor = (value: unknown): value is DrawingColor => DRAWING_COLORS.includes(value as DrawingColor);
const isDrawingWidth = (value: unknown): value is DrawingWidth => typeof value === "string" && Object.hasOwn(DRAWING_WIDTHS, value);

export function parseDrawingStroke(raw: unknown): DrawingStroke | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { color, width, points } = raw as Record<string, unknown>;
  if (!isDrawingColor(color) || !isDrawingWidth(width)) return null;
  const parsed = parseStrokePoints(points);
  return parsed ? { color, width, points: parsed } : null;
}

export function parseDrawingStrokes(raw: unknown): DrawingStroke[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > DRAWING_LIMITS.perSave) return null;
  const parsed = raw.map(parseDrawingStroke);
  return parsed.every((stroke) => stroke !== null) ? (parsed as DrawingStroke[]) : null;
}

export function buildDrawingView(row: { id: number; userId: number; color: string; width: string; points: unknown }): SceneDrawingView[] {
  const stroke = parseDrawingStroke({ color: row.color, width: row.width, points: fromStoredPoints(row.points) });
  return stroke ? [{ ...stroke, id: row.id, userId: row.userId }] : [];
}

/// Кожен стирає свої лінії; майстер — будь-які.
export const canEraseDrawing = (drawing: { userId: number }, userId: number, isGm: boolean) => isGm || drawing.userId === userId;

export function findErasableDrawingIds(point: TokenPosition, drawings: SceneDrawingView[], aspect: number, userId: number, isGm: boolean): number[] {
  return drawings
    .filter((drawing) => canEraseDrawing(drawing, userId, isGm) && isPointNearStroke(point, drawing.points, DRAWING_WIDTHS[drawing.width] / 2 + DRAWING_LIMITS.eraserReach, aspect))
    .map((drawing) => drawing.id);
}
