export type TokenPosition = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };

export const TOKEN_ARROW_STEPS: Record<string, TokenPosition> = {
  ArrowLeft: { x: -0.02, y: 0 },
  ArrowRight: { x: 0.02, y: 0 },
  ArrowUp: { x: 0, y: -0.02 },
  ArrowDown: { x: 0, y: 0.02 },
};

const clampToMap = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;

/// Позиція токена — частка ширини й висоти мапи, тож не залежить від розміру екрана.
export function parseTokenPosition(raw: unknown): TokenPosition | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { x, y } = raw as Record<string, unknown>;
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: clampToMap(x), y: clampToMap(y) };
}

/// Точка поза мапою — null: так токен прибирають з мапи назад у ряд.
/// isQuarterTurned: мапу повернуто CSS на 90° за годинниковою стрілкою, rect — її рамка на екрані.
export function findTokenPositionInRect(point: { clientX: number; clientY: number }, rect: Rect, isQuarterTurned = false): TokenPosition | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = isQuarterTurned ? (point.clientY - rect.top) / rect.height : (point.clientX - rect.left) / rect.width;
  const y = isQuarterTurned ? (rect.left + rect.width - point.clientX) / rect.width : (point.clientY - rect.top) / rect.height;
  return x < 0 || x > 1 || y < 0 || y > 1 ? null : parseTokenPosition({ x, y });
}

export function shiftTokenPosition(position: TokenPosition | null, step: TokenPosition): TokenPosition {
  const from = position ?? { x: 0.5, y: 0.5 };
  return parseTokenPosition({ x: from.x + step.x, y: from.y + step.y })!;
}
