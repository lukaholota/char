export type TokenTransform = { rotation: number; scale: number };
type ScreenPoint = { clientX: number; clientY: number };

export const DEFAULT_TOKEN_TRANSFORM: TokenTransform = { rotation: 0, scale: 100 };
export const TOKEN_SCALE_RANGE = { min: 10, max: 1000 } as const;
/// Крок у 5 дає пальцю влучити рівно в 0° чи 100%, не шукаючи пікселя.
const DRAG_STEP = 5;

export function parseTokenTransform(raw: unknown): TokenTransform | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { rotation, scale } = raw as Record<string, unknown>;
  if (!Number.isInteger(rotation) || !Number.isInteger(scale)) return null;
  const transform = { rotation: rotation as number, scale: scale as number };
  return isTokenTransformValid(transform) ? transform : null;
}

export function readTokenTransform(row: { tokenRotation: number; tokenScalePercent: number }): TokenTransform {
  const transform = { rotation: row.tokenRotation, scale: row.tokenScalePercent };
  return isTokenTransformValid(transform) ? transform : DEFAULT_TOKEN_TRANSFORM;
}

export function isDefaultTokenTransform(transform: TokenTransform): boolean {
  return transform.rotation === 0 && transform.scale === 100;
}

export function turnToken(transform: TokenTransform, degrees: number): TokenTransform {
  return { ...transform, rotation: normalizeRotation(transform.rotation + degrees) };
}

export function resizeToken(transform: TokenTransform, scale: number): TokenTransform {
  return { ...transform, scale: clampScale(Math.round(scale)) };
}

/// Кут між пальцем і центром до й після руху: поворот мапи на чверть цю різницю не змінює.
export function findDraggedRotation(start: number, centre: ScreenPoint, from: ScreenPoint, to: ScreenPoint): number {
  const findAngle = (point: ScreenPoint) => (Math.atan2(point.clientY - centre.clientY, point.clientX - centre.clientX) * 180) / Math.PI;
  return normalizeRotation(roundToStep(start + findAngle(to) - findAngle(from)));
}

/// Відстань пальця від центру росте — токен росте в тій самій пропорції.
export function findDraggedScale(start: number, centre: ScreenPoint, from: ScreenPoint, to: ScreenPoint): number {
  const findDistance = (point: ScreenPoint) => Math.hypot(point.clientX - centre.clientX, point.clientY - centre.clientY);
  const fromDistance = findDistance(from);
  if (fromDistance < 1) return start;
  return clampScale(roundToStep((start * findDistance(to)) / fromDistance));
}

function isTokenTransformValid({ rotation, scale }: TokenTransform): boolean {
  return rotation >= 0 && rotation <= 359 && scale >= TOKEN_SCALE_RANGE.min && scale <= TOKEN_SCALE_RANGE.max;
}

function normalizeRotation(degrees: number): number {
  return ((Math.round(degrees) % 360) + 360) % 360;
}

function clampScale(percent: number): number {
  return Math.min(TOKEN_SCALE_RANGE.max, Math.max(TOKEN_SCALE_RANGE.min, percent));
}

function roundToStep(value: number): number {
  return Math.round(value / DRAG_STEP) * DRAG_STEP;
}
