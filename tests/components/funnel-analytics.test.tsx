// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ANON_ID = "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";
const SESSION_ID = "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c";

const posthog = vi.hoisted(() => ({
  init: vi.fn(), identify: vi.fn(), reset: vi.fn(), capture: vi.fn(), register: vi.fn(),
  get_distinct_id: vi.fn(), get_session_id: vi.fn(),
}));
const session = vi.hoisted(() => ({ current: { data: null as { user: { id: string; email?: string } } | null, status: "loading" } }));
const idle = vi.hoisted(() => ({ callbacks: [] as Array<() => void> }));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("next-auth/react", () => ({ useSession: () => session.current }));
vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));
vi.mock("@/components/ui/PersEditionPin", () => ({ useActiveEdition: () => "2014", useIsEditionPinnedByPage: () => false, findPinnedRuleset: () => null }));
vi.mock("@/lib/run-when-idle", () => ({ runWhenIdle: (callback: () => void) => { idle.callbacks.push(callback); return () => undefined; } }));

async function runIdle() {
  idle.callbacks.splice(0).forEach((callback) => callback());
  await waitFor(() => expect(posthog.init).toHaveBeenCalled());
  await Promise.resolve();
}

async function openPage(href: string, referrer: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  window.history.replaceState(null, "", href);
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
  const { PostHogProvider } = await import("@/lib/monitoring/posthog-provider");
  const funnel = await import("@/lib/monitoring/funnel-analytics");
  return { PostHogProvider, funnel };
}

function capturedEvents() {
  return posthog.capture.mock.calls.map(([event, properties]) => ({ event: event as string, properties: properties as Record<string, unknown> }));
}

function findEvent(name: string) {
  return capturedEvents().find(({ event }) => event === name);
}

beforeEach(() => {
  Object.values(posthog).forEach((spy) => spy.mockReset());
  posthog.get_distinct_id.mockReturnValue(ANON_ID);
  posthog.get_session_id.mockReturnValue(SESSION_ID);
  session.current = { data: null, status: "loading" };
  idle.callbacks.length = 0;
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

async function signInFromCreator(): Promise<{ callbackPath: string; attemptId: unknown }> {
  const { PostHogProvider, funnel } = await openPage("/char/create?utm_source=threads&utm_campaign=launch", "https://l.threads.com/");
  session.current = { data: null, status: "unauthenticated" };
  render(<PostHogProvider />);
  funnel.captureCreationStarted("2014");
  await runIdle();
  funnel.captureAuthRequested("creator_submit");
  const callbackPath = funnel.prepareGoogleAuthRedirect("/char/create", "creator_submit");
  return { callbackPath, attemptId: findEvent("character_creation_started")?.properties.creation_attempt_id };
}

describe("creation funnel analytics", () => {
  it("sends start, sign-in request and sign-in start in order, before the redirect", async () => {
    await signInFromCreator();

    const funnelEvents = capturedEvents().map(({ event }) => event).filter((event) => event !== "$pageview");
    expect(funnelEvents).toEqual(["character_creation_started", "auth_requested", "auth_started"]);
    expect(findEvent("auth_started")?.properties).toMatchObject({ method: "google_redirect", trigger: "creator_submit", analytics_schema_version: 1 });
    expect(posthog.register).toHaveBeenCalledWith(expect.objectContaining({ entry_source: "threads", entry_campaign: "launch", landing_path: "/char/create", browser_context: "regular_browser", is_signed_in: false }));
  });

  it.each([
    ["Google", "https://accounts.google.com/"],
    ["our own origin after a silent Google sign-in", "http://localhost:3000/char/create"],
    ["no", ""],
  ])("after the Google return with %s referrer keeps the anonymous person, the session, the attempt and the original source", async (_label, referrer) => {
    const { callbackPath, attemptId } = await signInFromCreator();
    cleanup();
    Object.values(posthog).forEach((spy) => spy.mockClear());

    const { PostHogProvider, funnel } = await openPage(callbackPath, referrer);
    session.current = { data: { user: { id: "7", email: "player@example.test" } }, status: "authenticated" };
    const view = render(<PostHogProvider />);
    await waitFor(() => expect(window.location.search).toBe(""));
    funnel.captureCreationStarted("2014");
    await runIdle();
    view.rerender(<PostHogProvider />);

    expect(posthog.init).toHaveBeenCalledWith("key", expect.objectContaining({ bootstrap: { distinctID: ANON_ID, sessionID: SESSION_ID } }));
    expect(posthog.identify).toHaveBeenCalledWith("7", { is_internal: false });
    expect(capturedEvents().filter(({ event }) => event === "auth_completed")).toHaveLength(1);
    expect(findEvent("character_creation_started")?.properties).toMatchObject({ creation_attempt_id: attemptId, is_auth_return: true });
    expect(posthog.register).toHaveBeenCalledWith(expect.objectContaining({ entry_source: "threads", entry_medium: "unknown", entry_campaign: "launch" }));
    const { sharedPostHogOptions } = await import("@/lib/monitoring/posthog-options");
    const prepareEvent = sharedPostHogOptions.before_send as (event: { uuid: string; event: string; properties: Record<string, unknown> }) => { properties: Record<string, unknown> } | null;
    expect(capturedEvents().every(({ event, properties }) => !String(prepareEvent({ uuid: "u", event, properties: { ...properties } })?.properties.$current_url).includes("ph_ctx"))).toBe(true);
    expect(funnel.findCreationAnalytics()).toEqual({ creationAttemptId: attemptId, sessionId: SESSION_ID });
  });

  async function returnFromGoogle(callbackPath: string) {
    cleanup();
    Object.values(posthog).forEach((spy) => spy.mockClear());
    const { PostHogProvider } = await openPage(callbackPath, "https://accounts.google.com/");
    session.current = { data: { user: { id: "7" } }, status: "authenticated" };
    render(<PostHogProvider />);
    await runIdle();
    return {
      isBootstrapped: posthog.init.mock.calls.some(([, options]) => (options as { bootstrap?: unknown }).bootstrap !== undefined),
      completedCount: capturedEvents().filter(({ event }) => event === "auth_completed").length,
    };
  }

  it("ignores a return link opened in another tab", async () => {
    const { callbackPath } = await signInFromCreator();
    sessionStorage.clear();

    expect(await returnFromGoogle(callbackPath)).toEqual({ isBootstrapped: false, completedCount: 0 });
  });

  it("accepts the return context only once", async () => {
    const { callbackPath } = await signInFromCreator();

    expect(await returnFromGoogle(callbackPath)).toEqual({ isBootstrapped: true, completedCount: 1 });
    expect(await returnFromGoogle(callbackPath)).toEqual({ isBootstrapped: false, completedCount: 0 });
  });

  it("counts the first meaningful step once per attempt and starts a new attempt after creation", async () => {
    const { PostHogProvider, funnel } = await openPage("/char/create", "");
    session.current = { data: { user: { id: "7" } }, status: "authenticated" };
    render(<PostHogProvider />);
    funnel.captureCreationStarted("2014");
    funnel.captureCreationFirstChoice("2014");
    funnel.captureCreationFirstChoice("2014");
    funnel.finishCreationAttempt();
    funnel.captureCreationStarted("2014");
    await runIdle();

    expect(capturedEvents().filter(({ event }) => event === "character_creation_first_choice")).toHaveLength(1);
    const attempts = capturedEvents().filter(({ event }) => event === "character_creation_started").map(({ properties }) => properties.creation_attempt_id);
    expect(new Set(attempts).size).toBe(2);
    expect(capturedEvents().some(({ event }) => event === "character_created")).toBe(false);
  });

  it("a blocked or broken SDK does not break the creator or sign-in", async () => {
    posthog.init.mockImplementation(() => { throw new Error("blocked"); });
    const { PostHogProvider, funnel } = await openPage("/char/create", "");
    session.current = { data: null, status: "unauthenticated" };
    render(<PostHogProvider />);
    idle.callbacks.splice(0).forEach((callback) => callback());

    expect(() => {
      funnel.captureCreationStarted("2014");
      funnel.captureCreationFirstChoice("2014");
      funnel.captureCreationFailed("2014", "server");
      funnel.captureInAppWarningShown("auth_dialog");
      funnel.captureLinkCopied("auth_dialog", false);
    }).not.toThrow();
    expect(funnel.prepareGoogleAuthRedirect("/char/create", "creator_submit")).toMatch(/^\/char\/create\?ph_ctx=/);
    expect(funnel.findCreationAnalytics().sessionId).toBeNull();
  });

  it("sends no email or private character text after the SDK's before_send", async () => {
    const { PostHogProvider, funnel } = await openPage("/char/create?persName=Arya", "");
    const { sharedPostHogOptions } = await import("@/lib/monitoring/posthog-options");
    session.current = { data: { user: { id: "7", email: "player@example.test" } }, status: "authenticated" };
    render(<PostHogProvider />);
    funnel.captureCreationStarted("2024");
    funnel.captureInAppWarningShown("creator");
    funnel.captureExternalBrowserSelected("creator", "android_intent");
    await runIdle();

    const prepareEvent = sharedPostHogOptions.before_send as (event: { uuid: string; event: string; properties: Record<string, unknown> }) => unknown;
    const prepared = capturedEvents().map(({ event, properties }) => prepareEvent({ uuid: "u", event, properties: { ...properties } }));
    expect(prepared.every(Boolean)).toBe(true);
    const sent = JSON.stringify([prepared, posthog.register.mock.calls, posthog.identify.mock.calls]);
    expect(sent).not.toContain("player@example.test");
    expect(sent).not.toContain("Arya");
    expect(funnel.buildInAppHandoffUrl("https://char.holota.family/char/create?persName=Arya")).toBe("https://char.holota.family/char/create?entry_source=unknown&entry_medium=inapp_handoff");
  });
});
