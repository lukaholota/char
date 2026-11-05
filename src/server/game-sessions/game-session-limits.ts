const ROLL_WINDOW_MS = 10_000;
const ROLLS_PER_WINDOW = 30;
const STREAMS_PER_USER = 8;

const rollTimesByUser = new Map<number, number[]>();
const rollStartTimesByUser = new Map<number, number[]>();
const tokenMoveTimesByUser = new Map<number, number[]>();
const openStreamsByUser = new Map<number, number>();

// shortcut: limits live in process memory, so blue/green slots count separately; move to Postgres if abuse shows up.
export function tryTakeRollSlot(userId: number, now = Date.now()): boolean {
  return tryTakeSlot(rollTimesByUser, userId, now);
}

export function tryTakeRollStartSlot(userId: number, now = Date.now()): boolean {
  return tryTakeSlot(rollStartTimesByUser, userId, now);
}

export function tryTakeTokenMoveSlot(userId: number, now = Date.now()): boolean {
  return tryTakeSlot(tokenMoveTimesByUser, userId, now);
}

function tryTakeSlot(timesByUser: Map<number, number[]>, userId: number, now: number): boolean {
  const recent = (timesByUser.get(userId) ?? []).filter((time) => now - time < ROLL_WINDOW_MS);
  if (recent.length >= ROLLS_PER_WINDOW) {
    timesByUser.set(userId, recent);
    return false;
  }
  recent.push(now);
  timesByUser.set(userId, recent);
  return true;
}

export function tryOpenStreamSlot(userId: number): (() => void) | null {
  const open = openStreamsByUser.get(userId) ?? 0;
  if (open >= STREAMS_PER_USER) return null;
  openStreamsByUser.set(userId, open + 1);
  let isReleased = false;
  return () => {
    if (isReleased) return;
    isReleased = true;
    const left = (openStreamsByUser.get(userId) ?? 1) - 1;
    if (left > 0) openStreamsByUser.set(userId, left);
    else openStreamsByUser.delete(userId);
  };
}
