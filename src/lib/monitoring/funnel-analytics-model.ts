import { stripPrivateUrlParams } from "@/lib/monitoring/posthog-context";

export const ANALYTICS_SCHEMA_VERSION = 1;

export type BrowserContext = "regular_browser" | "embedded_browser" | "unknown";
export type InAppBrowserHost = "telegram" | "threads" | "instagram" | "facebook" | "other" | "unknown";
export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export type AuthMethod = "google_redirect" | "one_tap";
export type CreationPath = "manual" | "ready_preset" | "build_assembly";

export type EntryAttribution = {
  entry_source: string;
  entry_medium: string;
  entry_campaign: string | null;
  landing_path: string;
};

export type OAuthReturnContext = {
  distinctId: string | null;
  sessionId: string | null;
  creationAttemptId: string | null;
  entry: EntryAttribution;
  method: AuthMethod;
};

export const OAUTH_RETURN_PARAM = "ph_ctx";
const OAUTH_RETURN_MAX_AGE_MS = 30 * 60 * 1000;
const ID_PATTERN = /^[0-9a-zA-Z-]{8,64}$/;
const OAUTH_HOST_PATTERN = /^accounts\.google\.[a-z.]+$/i;
const IN_APP_HOSTS: InAppBrowserHost[] = ["telegram", "threads", "instagram", "facebook", "other", "unknown"];

export function findBrowserContext(input: { userAgent: string; hasTelegramWebviewProxy: boolean }): { browser_context: BrowserContext; in_app_browser_host: InAppBrowserHost | null } {
  const ua = input.userAgent;
  if (!ua) return { browser_context: "unknown", in_app_browser_host: "unknown" };
  const host = findInAppHost(ua, input.hasTelegramWebviewProxy);
  if (host) return { browser_context: "embedded_browser", in_app_browser_host: host };
  if (isGenericWebView(ua)) return { browser_context: "embedded_browser", in_app_browser_host: "other" };
  return { browser_context: "regular_browser", in_app_browser_host: null };
}

function findInAppHost(ua: string, hasTelegramWebviewProxy: boolean): InAppBrowserHost | null {
  if (/\bBarcelona\b/.test(ua)) return "threads";
  if (/\bInstagram\b/.test(ua)) return "instagram";
  if (/\b(FBAN|FBAV|FB_IAB|FB4A)\b/.test(ua)) return "facebook";
  if (hasTelegramWebviewProxy || /\bTelegram(-Android|Bot)?\b/i.test(ua)) return "telegram";
  return null;
}

function isGenericWebView(ua: string): boolean {
  const isAndroidWebView = /Android/.test(ua) && /;\s?wv\)/.test(ua);
  const isIosWebView = /iP(hone|od|ad)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua);
  return isAndroidWebView || isIosWebView;
}

export function findDeviceType(userAgent: string): DeviceType {
  if (!userAgent) return "unknown";
  if (/iPad|Tablet|Android(?!.*Mobile)/.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/.test(userAgent)) return "mobile";
  return "desktop";
}

export function findEntryAttribution(input: { href: string; referrer: string }): EntryAttribution {
  const url = new URL(input.href);
  const params = url.searchParams;
  const landing_path = url.pathname;
  const tagged = params.get("utm_source") ?? params.get("entry_source");
  if (tagged) {
    return { entry_source: tagged, entry_medium: params.get("utm_medium") ?? params.get("entry_medium") ?? "unknown", entry_campaign: params.get("utm_campaign") ?? params.get("entry_campaign"), landing_path };
  }
  const referrerHost = findUrlHost(input.referrer);
  if (!referrerHost) return { entry_source: "direct", entry_medium: "none", entry_campaign: null, landing_path };
  if (OAUTH_HOST_PATTERN.test(referrerHost)) return { entry_source: "unknown", entry_medium: "oauth_return", entry_campaign: null, landing_path };
  if (referrerHost === url.host) return { entry_source: "internal", entry_medium: "none", entry_campaign: null, landing_path };
  return { entry_source: referrerHost, entry_medium: "referral", entry_campaign: null, landing_path };
}

function findUrlHost(value: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).host || null;
  } catch {
    return null;
  }
}

export function buildInAppHandoffHref(href: string, host: InAppBrowserHost | null): string {
  try {
    const url = new URL(stripPrivateUrlParams(href));
    url.searchParams.delete(OAUTH_RETURN_PARAM);
    url.searchParams.set("entry_source", host ?? "unknown");
    url.searchParams.set("entry_medium", "inapp_handoff");
    return url.toString();
  } catch {
    return href;
  }
}

export function buildOAuthCallbackPath(callbackPath: string, context: OAuthReturnContext, nonce: string, now: number): string {
  const encoded = encodeBase64Url(JSON.stringify({ d: context.distinctId, s: context.sessionId, a: context.creationAttemptId, e: context.entry, m: context.method, n: nonce, t: now }));
  const [pathAndQuery, hash] = callbackPath.split("#", 2);
  const separator = pathAndQuery.includes("?") ? "&" : "?";
  return `${pathAndQuery}${separator}${OAUTH_RETURN_PARAM}=${encoded}${hash === undefined ? "" : `#${hash}`}`;
}

export function readOAuthReturnContext(href: string, savedNonce: string | null, now: number): { context: OAuthReturnContext | null; cleanHref: string | null } {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { context: null, cleanHref: null };
  }
  const raw = url.searchParams.get(OAUTH_RETURN_PARAM);
  if (raw === null) return { context: null, cleanHref: null };
  url.searchParams.delete(OAUTH_RETURN_PARAM);
  const cleanHref = url.toString();
  if (!isId(savedNonce)) return { context: null, cleanHref };
  return { context: parseOAuthReturnContext(raw, savedNonce, now), cleanHref };
}

function parseOAuthReturnContext(raw: string, savedNonce: string, now: number): OAuthReturnContext | null {
  try {
    const value = JSON.parse(decodeBase64Url(raw)) as Record<string, unknown>;
    if (value.n !== savedNonce) return null;
    if (typeof value.t !== "number" || now - value.t > OAUTH_RETURN_MAX_AGE_MS || now < value.t) return null;
    const entry = parseEntry(value.e);
    if (!entry) return null;
    return {
      distinctId: isId(value.d) ? value.d : null,
      sessionId: isId(value.s) ? value.s : null,
      creationAttemptId: isId(value.a) ? value.a : null,
      entry,
      method: value.m === "one_tap" ? "one_tap" : "google_redirect",
    };
  } catch {
    return null;
  }
}

function parseEntry(value: unknown): EntryAttribution | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (!isShortText(entry.entry_source) || !isShortText(entry.entry_medium) || !isShortText(entry.landing_path)) return null;
  return { entry_source: entry.entry_source, entry_medium: entry.entry_medium, entry_campaign: isShortText(entry.entry_campaign) ? entry.entry_campaign : null, landing_path: entry.landing_path };
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isShortText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

export function isInAppBrowserHost(value: unknown): value is InAppBrowserHost {
  return typeof value === "string" && (IN_APP_HOSTS as string[]).includes(value);
}

const OAUTH_REFERRER_KEYS = ["$referrer", "$referring_domain", "$session_entry_referrer", "$session_entry_referring_domain", "$initial_referrer", "$initial_referring_domain"];

export function dropOAuthReferrers(properties: Record<string, unknown>): void {
  for (const key of OAUTH_REFERRER_KEYS) {
    const value = properties[key];
    if (typeof value !== "string") continue;
    const host = findUrlHost(value) ?? value;
    if (OAUTH_HOST_PATTERN.test(host)) delete properties[key];
  }
}

function encodeBase64Url(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(text: string): string {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function buildCreationAnalyticsProperties(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const properties: Record<string, string> = {};
  if (isId(input.creationAttemptId)) properties.creation_attempt_id = input.creationAttemptId;
  if (isId(input.sessionId)) properties.$session_id = input.sessionId;
  return properties;
}
