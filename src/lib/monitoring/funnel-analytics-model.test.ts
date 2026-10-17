import { describe, expect, it } from "vitest";
import {
  buildCreationAnalyticsProperties, buildInAppHandoffHref, buildOAuthCallbackPath, dropOAuthReferrers, findBrowserContext, findDeviceType, findEntryAttribution,
  readOAuthReturnContext, type OAuthReturnContext,
} from "./funnel-analytics-model";

const UA = {
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iosThreads: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Barcelona 359.0.0.26.89 (iPhone15,2; iOS 18_1; uk_UA; uk; scale=3.00; 1179x2556; IABMV/1; 677406101)",
  androidThreads: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Barcelona 359.0.0.26.89 Android",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0",
  facebook: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36",
  iosWebView: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
};

const NOW = Date.UTC(2026, 9, 16, 19);
const context: OAuthReturnContext = {
  distinctId: "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
  sessionId: "0192a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c",
  creationAttemptId: "4f6c1d8e-2a3b-4c5d-9e8f-7a6b5c4d3e2f",
  entry: { entry_source: "l.threads.com", entry_medium: "referral", entry_campaign: null, landing_path: "/char/create" },
  method: "google_redirect",
};

describe("browser context", () => {
  it.each([
    [UA.iosThreads, false, "embedded_browser", "threads"],
    [UA.androidThreads, false, "embedded_browser", "threads"],
    [UA.instagram, false, "embedded_browser", "instagram"],
    [UA.facebook, false, "embedded_browser", "facebook"],
    [UA.iosSafari, true, "embedded_browser", "telegram"],
    [UA.androidChrome, true, "embedded_browser", "telegram"],
    [UA.androidWebView, false, "embedded_browser", "other"],
    [UA.iosWebView, false, "embedded_browser", "other"],
    [UA.iosSafari, false, "regular_browser", null],
    [UA.androidChrome, false, "regular_browser", null],
    [UA.desktop, false, "regular_browser", null],
    ["", false, "unknown", "unknown"],
  ])("%s · telegram proxy %s → %s / %s", (userAgent, hasTelegramWebviewProxy, browserContext, host) => {
    expect(findBrowserContext({ userAgent, hasTelegramWebviewProxy, isStandalone: false })).toEqual({ browser_context: browserContext, in_app_browser_host: host });
  });

  it("does not take the word Threads alone as proof of an in-app browser", () => {
    expect(findBrowserContext({ userAgent: `${UA.iosSafari} Threads`, hasTelegramWebviewProxy: false, isStandalone: false }).in_app_browser_host).toBeNull();
  });

  it("splits phones, tablets and desktops", () => {
    expect([findDeviceType(UA.iosSafari), findDeviceType(UA.androidChrome), findDeviceType(UA.ipad), findDeviceType(UA.desktop), findDeviceType("")]).toEqual(["mobile", "mobile", "tablet", "desktop", "unknown"]);
  });
});

describe("entry attribution", () => {
  it("prefers UTM tags, then the in-app handoff tag, then the referrer", () => {
    expect(findEntryAttribution({ href: "https://char.holota.family/char/create?utm_source=chatgpt.com&utm_campaign=x", referrer: "https://l.threads.com/" }))
      .toEqual({ entry_source: "chatgpt.com", entry_medium: "unknown", entry_campaign: "x", landing_path: "/char/create" });
    expect(findEntryAttribution({ href: "https://char.holota.family/char?entry_source=threads&entry_medium=inapp_handoff", referrer: "" }))
      .toEqual({ entry_source: "threads", entry_medium: "inapp_handoff", entry_campaign: null, landing_path: "/char" });
    expect(findEntryAttribution({ href: "https://char.holota.family/", referrer: "https://l.threads.com/" }).entry_source).toBe("l.threads.com");
    expect(findEntryAttribution({ href: "https://char.holota.family/", referrer: "" }).entry_source).toBe("direct");
  });

  it("never treats the Google sign-in page as a new source", () => {
    expect(findEntryAttribution({ href: "https://char.holota.family/char/create", referrer: "https://accounts.google.com/" }))
      .toEqual({ entry_source: "unknown", entry_medium: "oauth_return", entry_campaign: null, landing_path: "/char/create" });
    const properties: Record<string, unknown> = { $referrer: "https://accounts.google.com.ua/", $referring_domain: "accounts.google.com.ua", $initial_referring_domain: "accounts.google.com", $session_entry_referrer: "https://l.threads.com/" };
    dropOAuthReferrers(properties);
    expect(properties).toEqual({ $session_entry_referrer: "https://l.threads.com/" });
  });

  it("the copied handoff link carries the host and drops private params", () => {
    const href = buildInAppHandoffHref("https://char.holota.family/char/create?persName=Arya&step=3#top", "threads");
    expect(new URL(href).searchParams.get("persName")).toBeNull();
    expect(href).toBe("https://char.holota.family/char/create?step=3&entry_source=threads&entry_medium=inapp_handoff#top");
  });
});

describe("OAuth round-trip context", () => {
  const NONCE = "9b1f2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";

  it("survives the Google redirect and leaves a clean address", () => {
    const callback = buildOAuthCallbackPath("/char/create?step=2", context, NONCE, NOW);
    const result = readOAuthReturnContext(`https://char.holota.family${callback}`, NONCE, NOW + 60_000);
    expect(result.context).toEqual(context);
    expect(result.cleanHref).toBe("https://char.holota.family/char/create?step=2");
  });

  it("ignores the context without the tab's nonce, when stale, or when damaged, but still cleans the address", () => {
    const href = `https://char.holota.family${buildOAuthCallbackPath("/char", context, NONCE, NOW)}`;
    expect(readOAuthReturnContext(href, null, NOW)).toEqual({ context: null, cleanHref: "https://char.holota.family/char" });
    expect(readOAuthReturnContext(href, "0a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d", NOW).context).toBeNull();
    expect(readOAuthReturnContext(href, NONCE, NOW + 31 * 60_000).context).toBeNull();
    expect(readOAuthReturnContext("https://char.holota.family/char?ph_ctx=%%%", NONCE, NOW).context).toBeNull();
    expect(readOAuthReturnContext("https://char.holota.family/char", NONCE, NOW)).toEqual({ context: null, cleanHref: null });
  });

  it("server creation properties accept only short ids", () => {
    expect(buildCreationAnalyticsProperties({ creationAttemptId: context.creationAttemptId, sessionId: context.sessionId, email: "a@b.c" }))
      .toEqual({ creation_attempt_id: context.creationAttemptId, $session_id: context.sessionId });
    expect(buildCreationAnalyticsProperties({ creationAttemptId: "x".repeat(500), sessionId: "a@b.c" })).toEqual({});
    expect(buildCreationAnalyticsProperties(undefined)).toEqual({});
  });
});
