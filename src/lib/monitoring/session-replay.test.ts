// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { CaptureResult, CapturedNetworkRequest } from "posthog-js";

import { sharedPostHogOptions } from "./posthog-options";
import { record } from "posthog-js/dist/rrweb";

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
    expect(sessionReplayOptions).toMatchObject({ maskAllInputs: true, maskTextSelector: "*", blockClass: "ph-no-capture", recordHeaders: false, recordBody: false });
    expect(sessionReplayOptions.maskAttributeFn).toBeUndefined();
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

it("the real recorder keeps the creator readable and hides private text and the next page", async () => {
  window.history.replaceState(null, "", "/char/42/levelup");
  const levelUp = document.createElement("main");
  levelUp.innerHTML = "<p>Чарівник</p><span data-ph-mask>Ви вже увійшли як player@example.com</span>";
  document.body.append(levelUp);
  const events: unknown[] = [];
  const { maskAllInputs, maskTextSelector, maskTextFn, blockClass } = sessionReplayOptions;
  const stop = record({ emit: (event) => events.push(event), maskAllInputs, maskTextSelector: maskTextSelector ?? undefined, maskTextFn: (text, element) => maskTextFn?.(text, element ?? undefined) ?? text, blockClass });
  const recorded = () => JSON.stringify(events);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const sheet = document.createElement("main");
  sheet.innerHTML = '<h1>Мирон Сміливий</h1><div class="ph-no-capture"><img alt="Портрет: Мирон Сміливий" src="https://media.example/portrait.webp"></div>';
  levelUp.replaceWith(sheet);
  window.history.pushState(null, "", "/char/42");
  await vi.waitFor(() => expect(recorded()).toContain("***** ********"));
  stop?.();
  sheet.remove();
  window.history.replaceState(null, "", "/");

  expect(recorded()).toContain("Чарівник");
  expect(recorded()).not.toContain("player@example.com");
  expect(recorded()).not.toContain("Мирон");
  expect(recorded()).not.toContain("portrait.webp");
});
