"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useIsOnline } from "@/hooks/useIsOnline";
import type { OfflineOperation } from "@/lib/offline/operations";
import {
  flushOfflineQueue,
  queueOfflineOperation,
  readOfflineQueue,
  readOfflineSyncStatus,
  subscribeToOfflineQueue,
  subscribeToOfflineSyncStatus,
  type OfflineSyncStatus,
} from "@/lib/offline/queue";

const NO_OPERATIONS: OfflineOperation[] = [];
const IDLE_STATUS: OfflineSyncStatus = { state: "idle", attempt: 0, error: null };

export type OfflineCommitOutcome<TResult> = { queued: true } | { queued: false; result: TResult };

export function useOfflineQueue() {
  const queuedOperations = useSyncExternalStore(
    subscribeToOfflineQueue,
    readOfflineQueue,
    () => NO_OPERATIONS,
  );
  const syncStatus = useSyncExternalStore(subscribeToOfflineSyncStatus, readOfflineSyncStatus, () => IDLE_STATUS);
  const isOnline = useIsOnline();

  const flush = useCallback(() => {
    flushOfflineQueue().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isOnline) flush();
  }, [isOnline, flush]);

  useEffect(() => {
    const flushWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine && readOfflineQueue().length > 0) flush();
    };
    document.addEventListener("visibilitychange", flushWhenVisible);
    window.addEventListener("focus", flushWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenVisible);
      window.removeEventListener("focus", flushWhenVisible);
    };
  }, [flush]);

  const commitOperation = useCallback(
    async <TResult>(
      operation: OfflineOperation,
      sendToServer: () => Promise<TResult>,
    ): Promise<OfflineCommitOutcome<TResult>> => {
      const mustPreserveQueueOrder = readOfflineQueue().length > 0;
      if (!navigator.onLine || mustPreserveQueueOrder) {
        queueOfflineOperation(operation);
        flush();
        return { queued: true };
      }

      try {
        return { queued: false, result: await sendToServer() };
      } catch {
        queueOfflineOperation(operation);
        return { queued: true };
      }
    },
    [flush],
  );

  return {
    isOnline,
    pendingCount: queuedOperations.length,
    syncStatus,
    commitOperation,
    flush,
  };
}
