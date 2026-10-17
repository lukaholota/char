// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(), identify: vi.fn(), reset: vi.fn(), capture: vi.fn(), register: vi.fn(),
  startSessionRecording: vi.fn(), stopSessionRecording: vi.fn(),
}));
const session = vi.hoisted(() => ({ current: { data: null as { user: { id: string; email?: string } } | null, status: "unauthenticated" } }));
const idle = vi.hoisted(() => ({ callbacks: [] as Array<() => void> }));
const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("next-auth/react", () => ({ useSession: () => session.current }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/components/ui/PersEditionPin", () => ({ useActiveEdition: () => "2014", useIsEditionPinnedByPage: () => false, findPinnedRuleset: () => null }));
vi.mock("@/lib/run-when-idle", () => ({ runWhenIdle: (callback: () => void) => { idle.callbacks.push(callback); return () => undefined; } }));

async function renderProvider() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  const { PostHogProvider } = await import("@/lib/monitoring/posthog-provider");
  const view = render(<PostHogProvider />);
  return { rerender: () => view.rerender(<PostHogProvider />) };
}

async function loadSdk() {
  idle.callbacks.splice(0).forEach((callback) => callback());
  await waitFor(() => expect(posthog.init).toHaveBeenCalled());
}

beforeEach(() => {
  vi.resetModules();
  vi.doMock("posthog-js", () => ({ default: posthog }));
  Object.values(posthog).forEach((spy) => spy.mockReset());
  session.current = { data: null, status: "unauthenticated" };
  idle.callbacks.length = 0;
  route.pathname = "/";
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("session replay", () => {
  it.each(["/char/create", "/2024/char", "/char/presets", "/char/12/levelup", "/no-ai/char/create"])("starts on %s once the SDK loads", async (pathname) => {
    route.pathname = pathname;
    await renderProvider();
    expect(posthog.startSessionRecording).not.toHaveBeenCalled();

    await loadSdk();

    expect(posthog.init).toHaveBeenCalledWith("key", expect.objectContaining({ disable_session_recording: true }));
    expect(posthog.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(posthog.startSessionRecording).toHaveBeenCalledWith();
  });

  it.each(["/", "/char/share/token123", "/char/folder/share/token123", "/char/42", "/qa-sign-in"])("stays off on %s", async (pathname) => {
    route.pathname = pathname;
    await renderProvider();
    await loadSdk();

    expect(posthog.startSessionRecording).not.toHaveBeenCalled();
  });

  it("stops when the player leaves the creator and starts again on return", async () => {
    route.pathname = "/char/create";
    const view = await renderProvider();
    await loadSdk();

    route.pathname = "/char/42";
    view.rerender();
    expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(1);

    route.pathname = "/char/share/token123";
    view.rerender();
    expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(1);

    route.pathname = "/char/42/levelup";
    view.rerender();
    expect(posthog.startSessionRecording).toHaveBeenCalledTimes(2);
  });

  it("stops when an internal account signs in on a recorded page", async () => {
    route.pathname = "/char/create";
    const view = await renderProvider();
    await loadSdk();
    expect(posthog.startSessionRecording).toHaveBeenCalledTimes(1);

    session.current = { data: { user: { id: "5", email: "lukagolota1@gmail.com" } }, status: "authenticated" };
    view.rerender();

    await waitFor(() => expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(1));
  });

  it("a failing replay call does not break the page or events", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    posthog.startSessionRecording.mockImplementation(() => { throw new Error("recorder missing"); });
    route.pathname = "/char/create";
    await renderProvider();

    await loadSdk();

    expect(warning).toHaveBeenCalledWith("PostHog replay failed", "Error");
    expect(posthog.capture).toHaveBeenCalledWith("$pageview", expect.anything(), { send_instantly: true });
    warning.mockRestore();
  });

  it("a blocked SDK leaves the creator working", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    route.pathname = "/char/create";
    vi.resetModules();
    vi.doMock("posthog-js", () => Promise.reject(new TypeError("Failed to fetch dynamically imported module")));
    const view = await renderProvider();

    idle.callbacks.splice(0).forEach((callback) => callback());
    await waitFor(() => expect(warning).toHaveBeenCalledWith("PostHog unavailable", expect.any(String)));
    route.pathname = "/char/presets";
    expect(() => view.rerender()).not.toThrow();

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.startSessionRecording).not.toHaveBeenCalled();
    warning.mockRestore();
  });
});
