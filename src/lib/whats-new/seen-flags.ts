const SEEN_FLAG_PREFIX = "char:seen:";

/// Ключі, які сайт пише сам під час звичайного користування. Будь-який із них означає, що
/// людина тут не вперше, — і саме цим «що нового» відрізняє свого від новачка, якому
/// розповідати про зміни нема сенсу.
const RETURNING_VISITOR_PREFIXES = ["char:", "catalog-homebrew:", "pers_details_open"] as const;

export type FlagStorage = Pick<Storage, "getItem" | "setItem" | "key" | "length">;

export function findFlagStorage(): FlagStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isFlagSeen(storage: FlagStorage | null, flagKey: string): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(SEEN_FLAG_PREFIX + flagKey) !== null;
  } catch {
    return false;
  }
}

export function markFlagSeen(storage: FlagStorage | null, flagKey: string): void {
  if (!storage) return;
  try {
    storage.setItem(SEEN_FLAG_PREFIX + flagKey, new Date().toISOString());
  } catch {
    return;
  }
}

export function hasReturningVisitorSignal(storage: FlagStorage | null): boolean {
  if (!storage) return false;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && RETURNING_VISITOR_PREFIXES.some((prefix) => key.startsWith(prefix))) return true;
    }
    return false;
  } catch {
    return false;
  }
}
