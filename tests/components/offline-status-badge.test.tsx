// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { OfflineOperation } from "@/lib/offline/operations";

afterEach(cleanup);

// Раннер (vitest на bun) не дає jsdom робочого localStorage — підставляємо мінімальне сховище.
function installMemoryStorage() {
  const entries = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
}

function setConnection(isOnline: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: isOnline });
}

function unsyncedDamage(operationId: string): OfflineOperation {
  return {
    kind: "hp",
    mode: "damage",
    amount: 5,
    operationId,
    persId: 42,
    createdAt: "2026-08-30T00:00:00.000Z",
  };
}

async function renderBadgeWith(queued: OfflineOperation[]) {
  vi.resetModules();
  const queue = await import("@/lib/offline/queue");
  for (const operation of queued) queue.queueOfflineOperation(operation);

  const { default: OfflineStatusBadge } = await import(
    "@/lib/components/characterSheet/OfflineStatusBadge"
  );
  render(<OfflineStatusBadge />);
}

beforeEach(() => {
  installMemoryStorage();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KR22.6 — видимий стан незбережених правок", () => {
  it("мовчить, коли є мережа і черга порожня", async () => {
    setConnection(true);
    await renderBadgeWith([]);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("офлайн показує, скільки правок ще не поїхало", async () => {
    setConnection(false);
    await renderBadgeWith([unsyncedDamage("op-badge-0000001"), unsyncedDamage("op-badge-0000002")]);

    expect(screen.getByRole("status").textContent).toContain("Офлайн");
    expect(screen.getByRole("status").textContent).toContain("2");
  });

  it("з мережею і непорожньою чергою показує, що зміни надсилаються", async () => {
    setConnection(true);
    await renderBadgeWith([unsyncedDamage("op-badge-0000003")]);

    expect(screen.getByRole("status").textContent).toContain("Надсилаю");
  });
});
