// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), identify: vi.fn(), reset: vi.fn(), capture: vi.fn() }));
const session = vi.hoisted(() => ({ current: { data: null as { user: { id: string } } | null, status: "loading" } }));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("next-auth/react", () => ({ useSession: () => session.current }));

async function importPostHogModules() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  const { PostHogProvider } = await import("@/lib/monitoring/posthog-provider");
  const { capturePostHogEvent } = await import("@/lib/monitoring/posthog-client");
  return { PostHogProvider, capturePostHogEvent };
}

beforeEach(() => {
  Object.values(posthog).forEach((spy) => spy.mockClear());
  session.current = { data: null, status: "loading" };
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

/// posthog-js важить ~230 КБ і до 2026-09-21 вантажився на старті кожної сторінки.
describe("PostHog", () => {
  it("ініціалізується раз і привʼязує події до залогіненого акаунта", async () => {
    const { PostHogProvider } = await importPostHogModules();
    session.current = { data: { user: { id: "7" } }, status: "authenticated" };

    render(<PostHogProvider />);

    await waitFor(() => expect(posthog.identify).toHaveBeenCalledWith("7"));
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it("після виходу скидає акаунт", async () => {
    const { PostHogProvider } = await importPostHogModules();
    session.current = { data: null, status: "unauthenticated" };

    render(<PostHogProvider />);

    await waitFor(() => expect(posthog.reset).toHaveBeenCalledTimes(1));
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it("подія, надіслана до ініціалізації, не губиться", async () => {
    const { capturePostHogEvent } = await importPostHogModules();

    capturePostHogEvent("character_created", { classId: 3 });

    await waitFor(() => expect(posthog.capture).toHaveBeenCalledWith("character_created", { classId: 3 }));
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });
});
