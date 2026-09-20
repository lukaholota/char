import { isOfflineOperation, type OfflineOperation } from "@/lib/offline/operations";

export const OFFLINE_QUEUE_STORAGE_KEY = "char:offline-queue:v1";
export const OFFLINE_SYNC_ENDPOINT = "/api/offline-operations";

const MAX_QUEUED_OPERATIONS = 500;
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];
const NO_OPERATIONS: OfflineOperation[] = [];

export type OfflineSyncState = "idle" | "syncing" | "retrying" | "unauthorized";
export type OfflineSyncStatus = { state: OfflineSyncState; attempt: number; error: string | null };

const IDLE_STATUS: OfflineSyncStatus = { state: "idle", attempt: 0, error: null };

const queueListeners = new Set<() => void>();
const statusListeners = new Set<() => void>();
let cachedQueue: OfflineOperation[] | null = null;
let runningFlush: Promise<number> | null = null;
let syncStatus: OfflineSyncStatus = IDLE_STATUS;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function findStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readOfflineQueue(): OfflineOperation[] {
  if (cachedQueue) return cachedQueue;

  const storage = findStorage();
  if (!storage) return NO_OPERATIONS;

  try {
    const parsed: unknown = JSON.parse(storage.getItem(OFFLINE_QUEUE_STORAGE_KEY) ?? "[]");
    cachedQueue = Array.isArray(parsed) ? parsed.filter(isOfflineOperation) : NO_OPERATIONS;
  } catch {
    cachedQueue = NO_OPERATIONS;
  }

  return cachedQueue;
}

function saveOfflineQueue(operations: OfflineOperation[]): OfflineOperation[] {
  cachedQueue = operations;

  const storage = findStorage();
  try {
    storage?.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(operations));
  } catch {
    // Сховище переповнене або заблоковане — черга живе принаймні до перезавантаження.
  }

  for (const listener of queueListeners) listener();
  return operations;
}

export function queueOfflineOperation(operation: OfflineOperation): OfflineOperation[] {
  const queued = [...readOfflineQueue(), operation];
  return saveOfflineQueue(queued.slice(-MAX_QUEUED_OPERATIONS));
}

export function dropOfflineOperations(operationIds: string[]): OfflineOperation[] {
  const dropped = new Set(operationIds);
  return saveOfflineQueue(readOfflineQueue().filter((operation) => !dropped.has(operation.operationId)));
}

export function clearOfflineQueue(): OfflineOperation[] {
  return saveOfflineQueue([]);
}

export function subscribeToOfflineQueue(listener: () => void): () => void {
  queueListeners.add(listener);

  const rereadAfterOtherTab = (event: StorageEvent) => {
    if (event.key !== null && event.key !== OFFLINE_QUEUE_STORAGE_KEY) return;
    cachedQueue = null;
    listener();
  };
  window.addEventListener("storage", rereadAfterOtherTab);

  return () => {
    queueListeners.delete(listener);
    window.removeEventListener("storage", rereadAfterOtherTab);
  };
}

export function readOfflineSyncStatus(): OfflineSyncStatus {
  return syncStatus;
}

export function subscribeToOfflineSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => void statusListeners.delete(listener);
}

function setSyncStatus(next: OfflineSyncStatus): void {
  syncStatus = next;
  for (const listener of statusListeners) listener();
}

export function createOperationId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/// Одна відправка на вкладку за раз. Що лишилося в черзі після відповіді — піде повторно з
/// наростаючою паузою: зникла мережа, впав сервер або сесія протухла — без цього бейдж крутився б
/// «Надсилаю» до наступного перезавантаження.
export function flushOfflineQueue(): Promise<number> {
  if (runningFlush) return runningFlush;
  cancelScheduledRetry();

  runningFlush = sendQueuedOperations()
    .then((applied) => {
      settleAfterFlush(null);
      return applied;
    })
    .catch((error: unknown) => {
      settleAfterFlush(error);
      throw error;
    })
    .finally(() => {
      runningFlush = null;
    });
  return runningFlush;
}

function settleAfterFlush(error: unknown): void {
  if (readOfflineQueue().length === 0) {
    setSyncStatus(IDLE_STATUS);
    return;
  }

  const attempt = syncStatus.attempt + 1;
  const message = error instanceof Error ? error.message : null;
  setSyncStatus({
    state: error instanceof UnauthorizedSyncError ? "unauthorized" : "retrying",
    attempt,
    error: message,
  });
  scheduleRetry(attempt);
}

function scheduleRetry(attempt: number): void {
  if (typeof window === "undefined") return;
  cancelScheduledRetry();
  const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1];
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (navigator.onLine) flushOfflineQueue().catch(() => undefined);
    else scheduleRetry(attempt);
  }, delay);
}

function cancelScheduledRetry(): void {
  if (retryTimer === null) return;
  clearTimeout(retryTimer);
  retryTimer = null;
}

class UnauthorizedSyncError extends Error {}

async function sendQueuedOperations(): Promise<number> {
  const operations = readOfflineQueue();
  if (operations.length === 0) return 0;

  setSyncStatus({ ...syncStatus, state: "syncing" });

  const response = await fetch(OFFLINE_SYNC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations }),
  });

  const body: unknown = await response.json().catch(() => null);
  const applied = readIdList(body, "applied");
  const rejected = readIdList(body, "rejected");
  const resolved = [...applied, ...rejected];
  if (resolved.length > 0) dropOfflineOperations(resolved);

  if (response.status === 401) {
    throw new UnauthorizedSyncError(readSyncError(body) ?? "Сесія скінчилася — увійдіть знову");
  }
  if (!response.ok && resolved.length === 0) {
    throw new Error(readSyncError(body) ?? "Не вдалося синхронізувати зміни");
  }

  return applied.length;
}

function readIdList(body: unknown, key: "applied" | "rejected"): string[] {
  if (!body || typeof body !== "object" || !(key in body)) return [];
  const list = (body as Record<string, unknown>)[key];
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : [];
}

function readSyncError(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const { error } = body as { error?: unknown };
  return typeof error === "string" ? error : null;
}
