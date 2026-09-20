// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";

async function loadGuard() {
  vi.resetModules();
  return import("@/lib/offline/action-guard");
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
}

const actionInit = (): RequestInit => ({ method: "POST", headers: { "next-action": "abc123" }, body: "[]" });

describe("Офлайн-аудит 2026-09-18 — серверна дія без мережі не доходить до Next", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = vi.fn(async () => new Response("ok")) as unknown as typeof fetch;
    window.fetch = originalFetch;
    vi.mocked(toast.error).mockClear();
  });

  afterEach(() => {
    setOnline(true);
  });

  it("без мережі серверна дія відхиляється впізнаваною помилкою й показує пояснення", async () => {
    const guard = await loadGuard();
    guard.installOfflineActionGuard();
    setOnline(false);

    await expect(window.fetch("/char/42", actionInit())).rejects.toSatisfy(guard.isOfflineActionError);
    expect(originalFetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("звичайні GET-запити й запити черги без мережі проходять до справжнього fetch", async () => {
    const guard = await loadGuard();
    guard.installOfflineActionGuard();
    setOnline(false);

    await window.fetch("/api/offline-operations", { method: "POST", body: "{}" });
    await window.fetch("/spells/1");
    expect(originalFetch).toHaveBeenCalledTimes(2);
  });

  it("з мережею серверна дія йде як завжди", async () => {
    const guard = await loadGuard();
    guard.installOfflineActionGuard();
    setOnline(true);

    await expect(window.fetch("/char/42", actionInit())).resolves.toBeInstanceOf(Response);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("обірваний звʼязок посеред дії теж стає впізнаваною помилкою", async () => {
    window.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const guard = await loadGuard();
    guard.installOfflineActionGuard();
    setOnline(true);

    await expect(window.fetch("/char/42", actionInit())).rejects.toSatisfy(guard.isOfflineActionError);
  });
});
