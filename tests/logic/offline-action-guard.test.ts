// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import * as Sentry from "@sentry/nextjs";
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

describe("Sentry JAVASCRIPT-NEXTJS-1A — «Звʼязок обірвався» з увімкненою мережею", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-28T12:01:41Z"));
    setOnline(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("подія в Sentry каже, скільки сайт мовчав до дії і чим обірвався запит", async () => {
    window.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") throw new TypeError("Failed to fetch");
      return new Response("ok");
    }) as unknown as typeof fetch;
    const guard = await loadGuard();
    guard.installOfflineActionGuard();

    await window.fetch("/char/42?_rsc=1");
    vi.advanceTimersByTime(10_000);
    await window.fetch("https://eu.i.posthog.com/flags/");
    vi.advanceTimersByTime(19_000);
    await expect(window.fetch("/char/42", actionInit())).rejects.toSatisfy(guard.isOfflineActionError);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [error, hint] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(guard.isOfflineActionError(error)).toBe(true);
    expect(hint).toMatchObject({
      contexts: {
        action_failure: {
          cause: "TypeError: Failed to fetch",
          msSinceActionStart: 0,
          msSinceLastOriginResponse: 29_000,
          onLine: true,
        },
      },
    });
  });
});

describe("Sentry JAVASCRIPT-NEXTJS-C — дія з вкладки, відкритої до деплою", () => {
  beforeEach(() => {
    vi.mocked(toast.warning).mockClear();
    setOnline(true);
  });

  it("сервер не впізнав дію — людина бачить, що треба оновити сторінку", async () => {
    window.fetch = vi.fn(
      async () => new Response("", { status: 404, headers: { "x-nextjs-action-not-found": "1" } }),
    ) as unknown as typeof fetch;
    const guard = await loadGuard();
    guard.installOfflineActionGuard();

    await window.fetch("/char/42", actionInit());
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it("звичайна відповідь на дію тосту не показує", async () => {
    window.fetch = vi.fn(async () => new Response("ok")) as unknown as typeof fetch;
    const guard = await loadGuard();
    guard.installOfflineActionGuard();

    await window.fetch("/char/42", actionInit());
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
