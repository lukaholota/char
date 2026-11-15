import { parseTokenPosition, shiftTokenPosition, type TokenPosition } from "@/rules/game-map";

export type ShareRect = { x: number; y: number; width: number; height: number };
export type GroupMove = { id: number; at: TokenPosition | null };
export type PositionMove = { id: number; at: TokenPosition };
export type MapTokenMoves = { heroes: GroupMove[]; creatures: PositionMove[] };
type PlacedItem = { key: string; position: TokenPosition };

export const GROUP_MOVE_LIMIT = 200;

export function isPointInRect(point: TokenPosition, rect: ShareRect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function collectKeysInRect(items: readonly PlacedItem[], rect: ShareRect): string[] {
  return items.filter((item) => isPointInRect(item.position, rect)).map((item) => item.key);
}

/// Уся група зсувається на той самий крок; край мапи зупиняє кожен токен окремо.
export function shiftGroup<T extends PlacedItem>(items: readonly T[], step: TokenPosition): (T & { next: TokenPosition })[] {
  return items.map((item) => ({ ...item, next: shiftTokenPosition(item.position, step) }));
}

const isId = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;

export function parseGroupMoves(raw: unknown, canRemove: boolean): GroupMove[] | null {
  if (!Array.isArray(raw) || raw.length > GROUP_MOVE_LIMIT) return null;
  const moves: GroupMove[] = [];
  for (const entry of raw) {
    const { id, at } = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    const isRemoval = at === null && canRemove;
    const position = isRemoval ? null : parseTokenPosition(at);
    if (!isId(id) || (!isRemoval && !position)) return null;
    moves.push({ id, at: position });
  }
  return new Set(moves.map((move) => move.id)).size === moves.length ? moves : null;
}

export function parseMapTokenMoves(raw: unknown): MapTokenMoves | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { heroes, creatures } = raw as Record<string, unknown>;
  const parsed = { heroes: parseGroupMoves(heroes, true), creatures: parseGroupMoves(creatures, false) };
  return parsed.heroes && parsed.creatures ? { heroes: parsed.heroes, creatures: keepPlaced(parsed.creatures) } : null;
}

export function parsePositionMoves(raw: unknown): PositionMove[] | null {
  const moves = parseGroupMoves(raw, false);
  return moves && keepPlaced(moves);
}

const keepPlaced = (moves: GroupMove[]): PositionMove[] => moves.flatMap((move) => (move.at ? [{ id: move.id, at: move.at }] : []));
