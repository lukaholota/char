// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OfflineOperation } from "@/lib/offline/operations";

const STORAGE_KEY = "char:offline-queue:v1";

// Раннер (vitest на bun) не дає jsdom робочого localStorage — підставляємо мінімальне сховище.
function installMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, String(value)),
    removeItem: (key) => void entries.delete(key),
    clear: () => entries.clear(),
  };

  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
  return storage;
}

function damageOperation(operationId: string): OfflineOperation {
  return {
    kind: "hp",
    mode: "damage",
    amount: 7,
    operationId,
    persId: 42,
    createdAt: "2026-08-30T00:00:00.000Z",
  };
}

async function loadQueueModule() {
  vi.resetModules();
  return import("@/lib/offline/queue");
}

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KR22.6 — черга офлайн-операцій у localStorage", () => {
  it("переживає перезавантаження сторінки", async () => {
    const beforeReload = await loadQueueModule();
    beforeReload.queueOfflineOperation(damageOperation("op-before-reload-1"));

    const afterReload = await loadQueueModule();
    expect(afterReload.readOfflineQueue().map((operation) => operation.operationId)).toEqual([
      "op-before-reload-1",
    ]);
  });

  it("не піднімає зі сховища зіпсовані записи", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([damageOperation("op-valid-00001"), { kind: "rest" }, "сміття"]),
    );

    const queue = await loadQueueModule();
    expect(queue.readOfflineQueue().map((operation) => operation.operationId)).toEqual(["op-valid-00001"]);
  });

  it("прибирає з черги те, що сервер підтвердив, і лишає решту", async () => {
    const queue = await loadQueueModule();
    queue.queueOfflineOperation(damageOperation("op-applied-00001"));
    queue.queueOfflineOperation(damageOperation("op-rejected-0001"));
    queue.queueOfflineOperation(damageOperation("op-pending-00001"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ applied: ["op-applied-00001"], rejected: ["op-rejected-0001"] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(queue.flushOfflineQueue()).resolves.toBe(1);
    expect(queue.readOfflineQueue().map((operation) => operation.operationId)).toEqual(["op-pending-00001"]);
  });

  it("тримає чергу, поки сервер недосяжний", async () => {
    const queue = await loadQueueModule();
    queue.queueOfflineOperation(damageOperation("op-offline-00001"));

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));

    await expect(queue.flushOfflineQueue()).rejects.toThrow();
    expect(queue.readOfflineQueue()).toHaveLength(1);

    const afterReload = await loadQueueModule();
    expect(afterReload.readOfflineQueue()).toHaveLength(1);
  });

  it("повідомляє підписників про зміну черги", async () => {
    const queue = await loadQueueModule();
    const listener = vi.fn();
    const unsubscribe = queue.subscribeToOfflineQueue(listener);

    queue.queueOfflineOperation(damageOperation("op-notify-000001"));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    queue.queueOfflineOperation(damageOperation("op-notify-000002"));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("Офлайн-аудит 2026-09-18 — черга сама повторює відправку", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("після невдачі планує повтор із паузою, а після успіху повертається в спокій", async () => {
    const queue = await loadQueueModule();
    queue.queueOfflineOperation(damageOperation("op-retry-000001"));

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("сервер не відповів"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ applied: ["op-retry-000001"], rejected: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(queue.flushOfflineQueue()).rejects.toThrow();
    expect(queue.readOfflineSyncStatus()).toMatchObject({ state: "retrying", attempt: 1 });

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queue.readOfflineQueue()).toHaveLength(0);
    expect(queue.readOfflineSyncStatus()).toMatchObject({ state: "idle", attempt: 0 });
  });

  it("на 401 каже, що треба увійти знову, і не викидає черги", async () => {
    const queue = await loadQueueModule();
    queue.queueOfflineOperation(damageOperation("op-unauth-00001"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Не авторизовано" }), { status: 401 })),
    );

    await expect(queue.flushOfflineQueue()).rejects.toThrow();
    expect(queue.readOfflineSyncStatus().state).toBe("unauthorized");
    expect(queue.readOfflineQueue()).toHaveLength(1);
  });

  it("операції, які сервер ні застосував, ні відхилив, лишаються й ідуть повторно", async () => {
    const queue = await loadQueueModule();
    queue.queueOfflineOperation(damageOperation("op-transient-001"));

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ applied: [], rejected: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(queue.flushOfflineQueue()).resolves.toBe(0);
    expect(queue.readOfflineSyncStatus().state).toBe("retrying");

    await vi.advanceTimersByTimeAsync(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
