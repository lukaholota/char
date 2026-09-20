export const HOMEBREW_ENTRIES_PER_DAY = 20;

const HOUR_MS = 60 * 60 * 1000;

export function findEntryLimitStart(now: Date): Date {
  return new Date(now.getTime() - 24 * HOUR_MS);
}
