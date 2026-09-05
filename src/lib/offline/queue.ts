import { isOfflineOperation, type OfflineOperation } from "@/lib/offline/operations";

export const OFFLINE_QUEUE_STORAGE_KEY = "char:offline-queue:v1";
export const OFFLINE_SYNC_ENDPOINT = "/api/offline-operations";

const MAX_QUEUED_OPERATIONS = 500;
const NO_OPERATIONS: OfflineOperation[] = [];

const listeners = new Set<() => void>();
let cachedQueue: OfflineOperation[] | null = null;
let runningFlush: Promise<number> | null = null;

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

  for (const listener of listeners) listener();
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
  listeners.add(listener);

  const rereadAfterOtherTab = (event: StorageEvent) => {
    if (event.key !== null && event.key !== OFFLINE_QUEUE_STORAGE_KEY) return;
    cachedQueue = null;
    listener();
  };
  window.addEventListener("storage", rereadAfterOtherTab);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", rereadAfterOtherTab);
  };
}

export function createOperationId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function flushOfflineQueue(): Promise<number> {
  if (runningFlush) return runningFlush;

  runningFlush = sendQueuedOperations().finally(() => {
    runningFlush = null;
  });
  return runningFlush;
}

async function sendQueuedOperations(): Promise<number> {
  const operations = readOfflineQueue();
  if (operations.length === 0) return 0;

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
