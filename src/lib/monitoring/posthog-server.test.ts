import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureServerPostHogEvent } from "./posthog-server";

const deferred = vi.hoisted(() => ({ callbacks: [] as Array<() => Promise<void>> }));
const auth = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after: (callback: () => Promise<void>) => { deferred.callbacks.push(callback); } }));
vi.mock("@/lib/auth", () => ({ auth }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "public-project-key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  vi.stubEnv("QA_CREDENTIALS_EMAIL", "qa-browser@char.holota.family");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  auth.mockReset();
  auth.mockResolvedValue({ user: { id: "7", email: "player@example.test" } });
  deferred.callbacks.length = 0;
});

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("PostHog server delivery", () => {
  it("returns synchronously without resolving auth or starting a network request", () => {
    expect(captureServerPostHogEvent("character_created", { pers_id: 12 })).toBeUndefined();
    expect(auth).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(deferred.callbacks).toHaveLength(1);
  });

  it("a hanging PostHog request never delays the user action", async () => {
    let completeDelivery!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise((resolve) => { completeDelivery = resolve; }));
    const outcome = captureServerPostHogEvent("character_copied", {}, { id: 7, email: "player@example.test" });
    expect(outcome).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    const backgroundWork = deferred.callbacks[0]();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    completeDelivery(new Response(null, { status: 200 }));
    await backgroundWork;
  });

  it("sends the authenticated actor without email or server GeoIP", async () => {
    captureServerPostHogEvent("character_leveled_up", { edition: "2024" });
    await deferred.callbacks[0]();
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://eu.i.posthog.com/capture/");
    const body = JSON.parse(String(options?.body));
    expect(body.properties).toMatchObject({ distinct_id: "7", edition: "2024", $geoip_disable: true, source: "server" });
    expect(JSON.stringify(body)).not.toContain("player@example.test");
  });

  it.each(["lukagolota1@gmail.com", "qa-browser@char.holota.family"])("does not send events for %s", async (email) => {
    captureServerPostHogEvent("custom_avatar_uploaded", {}, { id: 5, email });
    await deferred.callbacks[0]();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["development", "test"])("does not schedule any work in %s", (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    captureServerPostHogEvent("character_created", {});
    expect(deferred.callbacks).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("a delivery failure remains separate from a committed mutation", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(fetch).mockRejectedValue(new TypeError("Network unavailable"));
    captureServerPostHogEvent("character_created", {});
    await expect(deferred.callbacks[0]()).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith("PostHog delivery failed", "TypeError");
    warning.mockRestore();
  });
});
