// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), identify: vi.fn(), reset: vi.fn(), capture: vi.fn(), register: vi.fn() }));
const session = vi.hoisted(() => ({ current: { data: null as { user: { id: string; email?: string; analyticsInternal?: boolean } } | null, status: "loading" } }));
const idle = vi.hoisted(() => ({ callbacks: [] as Array<() => void> }));
const route = vi.hoisted(() => ({ pathname: "/", edition: "2014", pinned: false }));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("next-auth/react", () => ({ useSession: () => session.current }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/components/ui/PersEditionPin", () => ({ useActiveEdition: () => route.edition, useIsEditionPinnedByPage: () => route.pinned, findPinnedRuleset: () => route.pinned ? `RULES_${route.edition}` : null }));
vi.mock("@/lib/run-when-idle", () => ({ runWhenIdle: (callback: () => void) => { idle.callbacks.push(callback); return () => undefined; } }));

async function runIdle() {
  idle.callbacks.splice(0).forEach((callback) => callback());
  await waitFor(() => expect(posthog.init).toHaveBeenCalled());
}

async function importPostHogModules() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  const { PostHogProvider } = await import("@/lib/monitoring/posthog-provider");
  const client = await import("@/lib/monitoring/posthog-client");
  return { PostHogProvider, ...client };
}

beforeEach(() => {
  Object.values(posthog).forEach((spy) => spy.mockClear());
  session.current = { data: null, status: "loading" };
  idle.callbacks.length = 0;
  route.pathname = "/";
  route.edition = "2014";
  route.pinned = false;
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

    expect(posthog.init).not.toHaveBeenCalled();
    await runIdle();
    await waitFor(() => expect(posthog.identify).toHaveBeenCalledWith("7", { is_internal: false }));
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it("після виходу скидає акаунт", async () => {
    const { PostHogProvider } = await importPostHogModules();
    session.current = { data: { user: { id: "7" } }, status: "authenticated" };
    const view = render(<PostHogProvider />);
    await runIdle();
    session.current = { data: null, status: "unauthenticated" };
    view.rerender(<PostHogProvider />);

    await waitFor(() => expect(posthog.reset).toHaveBeenCalledTimes(1));
    expect(posthog.identify).toHaveBeenCalledTimes(1);
  });

  it("подія, надіслана до ініціалізації, не губиться", async () => {
    const { capturePostHogEvent, configurePostHogIdentity } = await importPostHogModules();

    capturePostHogEvent("character_created", { classId: 3 });
    expect(posthog.capture).not.toHaveBeenCalled();
    configurePostHogIdentity({ userId: "7", isInternal: false });
    await runIdle();
    await waitFor(() => expect(posthog.capture).toHaveBeenCalledWith("character_created", expect.objectContaining({ classId: 3 }), { transport: "sendBeacon", send_instantly: true }));
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it("помилка SDK під час виходу не зриває основний флоу або решту подій", async () => {
    const { capturePostHogEvent, configurePostHogIdentity, flushPostHogOnExit } = await importPostHogModules();
    configurePostHogIdentity({ userId: "7", isInternal: false });
    await runIdle();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    posthog.capture.mockImplementationOnce(() => { throw new Error("SDK unavailable"); });
    capturePostHogEvent("search_opened");
    capturePostHogEvent("search_performed", { query_length: 4 });

    expect(flushPostHogOnExit).not.toThrow();
    expect(warning).toHaveBeenCalledWith("PostHog capture failed", "Error");
    expect(posthog.capture).toHaveBeenCalledWith("search_performed", expect.objectContaining({ query_length: 4 }), expect.objectContaining({ transport: "sendBeacon" }));
    warning.mockRestore();
  });

  it.each(["development", "test"])("не завантажує SDK і не надсилає події в %s", async (environment) => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", environment);
    const { capturePostHogEvent, configurePostHogIdentity, loadPostHog } = await import("@/lib/monitoring/posthog-client");
    configurePostHogIdentity({ userId: "7", isInternal: false });
    expect(capturePostHogEvent("search_opened")).toBeUndefined();
    expect(await loadPostHog()).toBeNull();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it.each([
    { id: "5", email: "lukagolota1@gmail.com" },
    { id: "967", email: "qa-browser@char.holota.family", analyticsInternal: true },
  ])("не завантажує SDK для внутрішнього акаунта $id", async (user) => {
    const { PostHogProvider, capturePostHogEvent } = await importPostHogModules();
    capturePostHogEvent("whats_new_shown");
    session.current = { data: { user }, status: "authenticated" };
    render(<PostHogProvider />);
    idle.callbacks.splice(0).forEach((callback) => callback());
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("не надсилає перегляди до завершення перевірки сесії", async () => {
    const { PostHogProvider } = await importPostHogModules();
    render(<PostHogProvider />);
    expect(idle.callbacks).toHaveLength(0);
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("передає редакцію персонажа для спільного маршруту /char", async () => {
    const { PostHogProvider } = await importPostHogModules();
    route.pathname = "/char/123";
    session.current.status = "unauthenticated";
    const view = render(<PostHogProvider />);
    await runIdle();
    expect(posthog.capture).not.toHaveBeenCalled();
    route.edition = "2024";
    route.pinned = true;
    view.rerender(<PostHogProvider />);
    await runIdle();
    await waitFor(() => expect(posthog.capture).toHaveBeenCalledWith("$pageview", expect.objectContaining({ edition: "2024", page_group: "char" }), expect.objectContaining({ transport: "sendBeacon" })));
  });
});
