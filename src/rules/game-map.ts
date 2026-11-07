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

/// Частки мапи без обрізання: інструменти (лінійка, туман) тягнуть і за край мапи.
/// isQuarterTurned: мапу повернуто CSS на 90° за годинниковою стрілкою, rect — її рамка на екрані.
export function findMapShareInRect(point: { clientX: number; clientY: number }, rect: Rect, isQuarterTurned = false): TokenPosition | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return isQuarterTurned
    ? { x: (point.clientY - rect.top) / rect.height, y: (rect.left + rect.width - point.clientX) / rect.width }
    : { x: (point.clientX - rect.left) / rect.width, y: (point.clientY - rect.top) / rect.height };
}

/// Точка поза мапою — null: так токен прибирають з мапи назад у ряд.
export function findTokenPositionInRect(point: { clientX: number; clientY: number }, rect: Rect, isQuarterTurned = false): TokenPosition | null {
  const share = findMapShareInRect(point, rect, isQuarterTurned);
  return !share || share.x < 0 || share.x > 1 || share.y < 0 || share.y > 1 ? null : parseTokenPosition(share);
}

export function shiftTokenPosition(position: TokenPosition | null, step: TokenPosition): TokenPosition {
  const from = position ?? { x: 0.5, y: 0.5 };
  return parseTokenPosition({ x: from.x + step.x, y: from.y + step.y })!;
}
