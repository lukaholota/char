// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { CaptureResult, CapturedNetworkRequest } from "posthog-js";

import { sharedPostHogOptions } from "./posthog-options";
import { isSessionReplayRoute, maskReplayUrl, sessionReplayOptions } from "./session-replay";

describe("isSessionReplayRoute", () => {
  it.each([
    "/char/create",
    "/char/create/",
    "/2024/char",
    "/char/presets",
    "/char/42/levelup",
    "/no-ai/char/create",
    "/no-ai/2024/char",
    "/no-ai/char/7/levelup",
  ])("records %s", (pathname) => {
    expect(isSessionReplayRoute(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/char",
    "/char/home",
    "/2024/char/home",
    "/char/42",
    "/char/42/print",
    "/char/share/abc123",
    "/char/share/abc123/print",
    "/char/folder/share/abc123",
    "/no-ai/char/share/abc123",
    "/api/auth/callback/google",
    "/qa-sign-in",
    "/spells",
    "/char/create-something",
    "/char/abc/levelup",
  ])("never records %s", (pathname) => {
    expect(isSessionReplayRoute(pathname)).toBe(false);
  });
});

describe("maskReplayUrl", () => {
  it("drops the fragment, OAuth and private params but keeps the rest", () => {
    expect(maskReplayUrl("https://char.holota.family/char/create?ph_ctx=abc&utm_source=threads&code=x&state=y#draft=zzz"))
      .toBe("https://char.holota.family/char/create?utm_source=threads");
  });

  it("hides share tokens in the path", () => {
    expect(maskReplayUrl("https://char.holota.family/char/share/SECRET/print?token=t")).toBe("https://char.holota.family/char/share/[token]/print");
    expect(maskReplayUrl("/char/folder/share/SECRET")).toBe("/char/folder/share/[token]");
  });

  it("leaves plain URLs untouched", () => {
    expect(maskReplayUrl("/char/presets")).toBe("/char/presets");
    expect(maskReplayUrl("https://char.holota.family/2024/char?entry_source=threads")).toBe("https://char.holota.family/2024/char?entry_source=threads");
  });
});

describe("replay options", () => {
  it("mask inputs and private text, and never keep network headers or bodies", () => {
    expect(sharedPostHogOptions).toMatchObject({ disable_session_recording: true, enable_recording_console_log: false, capture_performance: false });
    expect(sessionReplayOptions).toMatchObject({ maskAllInputs: true, maskTextSelector: "[data-ph-mask]", recordHeaders: false, recordBody: false });
    expect(sharedPostHogOptions.session_recording).toBe(sessionReplayOptions);
  });

  it("strips headers, bodies and tokens from a captured request", () => {
    const request = {
      name: "https://char.holota.family/api/auth/callback/google?code=SECRET&state=S",
      entryType: "resource", startTime: 0, duration: 1,
      requestBody: "{\"name\":\"Мирон\"}", responseBody: "{}", requestHeaders: { cookie: "x" }, responseHeaders: { a: "b" },
    } as CapturedNetworkRequest;

    const masked = sessionReplayOptions.maskCapturedNetworkRequestFn?.(request);

    expect(masked).toMatchObject({ name: "https://char.holota.family/api/auth/callback/google", requestBody: undefined, responseBody: undefined, requestHeaders: undefined, responseHeaders: undefined });
  });

  it("masks link targets in recorded attributes", () => {
    expect(sessionReplayOptions.maskAttributeFn?.("href", "https://char.holota.family/char/create?ph_ctx=a#draft=b")).toBe("https://char.holota.family/char/create");
    expect(sessionReplayOptions.maskAttributeFn?.("class", "ph_ctx=a")).toBe("ph_ctx=a");
  });

  it("lets replay snapshots through before_send without page properties", () => {
    const beforeSend = sharedPostHogOptions.before_send as (event: CaptureResult) => CaptureResult | null;
    const snapshot = { uuid: "1", event: "$snapshot", properties: { $snapshot_data: [] } } as unknown as CaptureResult;

    expect(beforeSend(snapshot)).toBe(snapshot);
    expect(snapshot.properties).toEqual({ $snapshot_data: [] });
  });
});

it("the real SDK keeps replay off until started and survives start/stop without remote config", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))));
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init("phc_test_replay", { ...sharedPostHogOptions, api_host: "https://posthog.invalid", advanced_disable_flags: true });

    expect(posthog.config.disable_session_recording).toBe(true);
    expect(posthog.config.session_recording.maskAllInputs).toBe(true);
    expect(() => posthog.startSessionRecording()).not.toThrow();
    expect(posthog.config.disable_session_recording).toBe(false);
    expect(() => posthog.stopSessionRecording()).not.toThrow();
    expect(posthog.config.disable_session_recording).toBe(true);
    expect(posthog.sessionRecordingStarted()).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
