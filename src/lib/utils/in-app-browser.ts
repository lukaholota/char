export type BrowserContext = "regular_browser" | "embedded_browser" | "unknown";
export type InAppBrowserHost = "telegram" | "threads" | "instagram" | "facebook" | "other";
export type DevicePlatform = "ios" | "android" | "other";
export type InAppBrowserVariant = "control" | "contextual" | "contextual-handoff";

export interface BrowserSignals {
  userAgent: string;
  hasTelegramWebviewProxy: boolean;
  isStandalone: boolean;
}

export interface BrowserEnvironment {
  context: BrowserContext;
  host: InAppBrowserHost | null;
  platform: DevicePlatform;
}

export const IN_APP_BROWSER_FLAG_KEY = "inapp-browser-handoff";
export const IN_APP_BROWSER_VARIANT_PARAM = "inapp_variant";
export const IN_APP_BROWSER_FALLBACK_VARIANT: InAppBrowserVariant = "contextual";

const VARIANTS: readonly InAppBrowserVariant[] = ["control", "contextual", "contextual-handoff"];

const HOST_TOKENS: ReadonlyArray<[InAppBrowserHost, RegExp]> = [
  ["telegram", /\bTelegram/i],
  ["threads", /\bBarcelona\b|\bThreads\b/i],
  ["instagram", /\bInstagram\b/i],
  ["facebook", /FBAN|FBAV|FB_IAB|FB4A|FBMD|FBIOS/],
];

export function detectBrowserEnvironment(signals: BrowserSignals): BrowserEnvironment {
  const platform = findPlatform(signals.userAgent);
  const host = findInAppHost(signals);
  if (host) return { context: "embedded_browser", host, platform };
  if (isGenericWebView(signals, platform)) return { context: "embedded_browser", host: "other", platform };
  if (isAmbiguousAndroidBrowser(signals.userAgent, platform)) return { context: "unknown", host: null, platform };
  return { context: "regular_browser", host: null, platform };
}

export function readBrowserSignals(): BrowserSignals {
  if (typeof window === "undefined") return { userAgent: "", hasTelegramWebviewProxy: false, isStandalone: false };
  const telegramWindow = window as Window & { TelegramWebviewProxy?: unknown; TelegramWebviewProxyProto?: unknown; TelegramWebview?: unknown };
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: window.navigator.userAgent || "",
    hasTelegramWebviewProxy: Boolean(telegramWindow.TelegramWebviewProxy ?? telegramWindow.TelegramWebviewProxyProto ?? telegramWindow.TelegramWebview),
    isStandalone: Boolean(iosNavigator.standalone) || Boolean(window.matchMedia?.("(display-mode: standalone)").matches),
  };
}

export function isEmbeddedBrowser(environment: BrowserEnvironment): boolean {
  return environment.context === "embedded_browser";
}

export function findInAppBrowserVariant(override: string | null | undefined, flagValue: unknown): InAppBrowserVariant {
  return findKnownVariant(override) ?? findKnownVariant(flagValue) ?? IN_APP_BROWSER_FALLBACK_VARIANT;
}

export function buildChromeIntentUrl(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const scheme = url.protocol.slice(0, -1);
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    return null;
  }
}

export function buildReturnUrl(href: string): string {
  try {
    const url = new URL(href);
    if (url.pathname === "/char/home") return `${url.origin}/char`;
    url.searchParams.delete(IN_APP_BROWSER_VARIANT_PARAM);
    url.hash = "";
    return url.toString();
  } catch {
    return href;
  }
}

function findPlatform(userAgent: string): DevicePlatform {
  if (/iP(hone|od|ad)/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

function findInAppHost(signals: BrowserSignals): InAppBrowserHost | null {
  if (signals.hasTelegramWebviewProxy) return "telegram";
  return HOST_TOKENS.find(([, pattern]) => pattern.test(signals.userAgent))?.[0] ?? null;
}

function isGenericWebView({ userAgent, isStandalone }: BrowserSignals, platform: DevicePlatform): boolean {
  if (platform === "android") return /;\s?wv\)/i.test(userAgent);
  if (platform === "ios") return !isStandalone && /AppleWebKit/i.test(userAgent) && !/Safari\//i.test(userAgent);
  return false;
}

function isAmbiguousAndroidBrowser(userAgent: string, platform: DevicePlatform): boolean {
  return platform === "android" && /Version\//i.test(userAgent) && !/Chrome\//i.test(userAgent);
}

function findKnownVariant(value: unknown): InAppBrowserVariant | null {
  return VARIANTS.find((variant) => variant === value) ?? null;
}
