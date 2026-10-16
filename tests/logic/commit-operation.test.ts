// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import type { OfflineOperation } from "@/lib/offline/operations";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));

import { toast } from "sonner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { installOfflineActionGuard } from "@/lib/offline/action-guard";
import { clearOfflineQueue, OFFLINE_SYNC_ENDPOINT, readOfflineQueue } from "@/lib/offline/queue";

// Раннер (vitest на bun) не дає jsdom робочого localStorage — підставляємо мінімальне сховище.
function installMemoryStorage(): void {
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
}

const damage: OfflineOperation = {
  kind: "hp",
  mode: "damage",
  amount: 4,
  operationId: "op-dropped-damage-1",
  persId: 42,
  createdAt: "2026-10-16T09:00:00.000Z",
};

const callServerAction = () =>
  window.fetch("/char/42", { method: "POST", headers: { "next-action": "abc123" }, body: "[]" }).then(() => ({ success: true }));

let network: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function applyEverySyncedOperation(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (String(input) !== OFFLINE_SYNC_ENDPOINT) return Promise.reject(new TypeError("Load failed"));
  const { operations } = JSON.parse(String(init?.body)) as { operations: OfflineOperation[] };
  return Promise.resolve(Response.json({ applied: operations.map((operation) => operation.operationId), rejected: [] }));
}

beforeAll(() => {
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => network(input, init)) as typeof fetch;
  installOfflineActionGuard();
});

beforeEach(() => {
  installMemoryStorage();
  clearOfflineQueue();
  network = vi.fn(applyEverySyncedOperation);
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.info).mockClear();
});

afterEach(cleanup);

describe("Sentry JAVASCRIPT-NEXTJS-1A — зміна з листа, на якій обірвався звʼязок", () => {
  it("стає в чергу, одразу йде повторно й показує один правдивий тост", async () => {
    const { result } = renderHook(() => useOfflineQueue());

    await expect(result.current.commitOperation(damage, callServerAction)).resolves.toEqual({ queued: true });

    expect(network).toHaveBeenCalledWith(OFFLINE_SYNC_ENDPOINT, expect.objectContaining({ method: "POST" }));
    await vi.waitFor(() => expect(readOfflineQueue()).toEqual([]));

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledTimes(1);
    const [guardToast, keptToast] = [vi.mocked(toast.error).mock.calls[0], vi.mocked(toast.info).mock.calls[0]];
    expect(keptToast[1]).toEqual(guardToast[1]);
    expect(String(keptToast[0])).toContain("збережено на пристрої");
    expect(String(keptToast[0])).not.toMatch(/спробуйте ще раз/i);
  });

  it("сервер, що відповів помилкою, лишає зміну в черзі на звичайний повтор без тосту", async () => {
    const { result } = renderHook(() => useOfflineQueue());

    await expect(result.current.commitOperation(damage, () => Promise.reject(new Error("Internal Server Error")))).resolves.toEqual({ queued: true });

    expect(network).not.toHaveBeenCalled();
    expect(readOfflineQueue().map((operation) => operation.operationId)).toEqual([damage.operationId]);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("пряма відправка отримує ідентифікатор тієї самої операції, що стала б у чергу", async () => {
    const { result } = renderHook(() => useOfflineQueue());
    const sendToServer = vi.fn(async (_operationId: string) => ({ success: true }));

    await expect(result.current.commitOperation(damage, sendToServer)).resolves.toEqual({ queued: false, result: { success: true } });
    expect(sendToServer).toHaveBeenCalledWith(damage.operationId);
  });
});
