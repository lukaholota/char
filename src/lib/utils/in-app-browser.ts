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

export const IN_APP_BROWSER_VARIANT_PARAM = "inapp_variant";
export const IN_APP_BROWSER_FALLBACK_VARIANT: InAppBrowserVariant = "contextual";

const VARIANTS: readonly InAppBrowserVariant[] = ["control", "contextual", "contextual-handoff"];

const HOST_TOKENS: ReadonlyArray<[InAppBrowserHost, RegExp]> = [
  ["telegram", /\bTelegram/i],
  ["threads", /\bBarcelona\b/],
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

export function findInAppBrowserVariant(...candidates: unknown[]): InAppBrowserVariant {
  return candidates.map(findKnownVariant).find((variant) => variant !== null) ?? IN_APP_BROWSER_FALLBACK_VARIANT;
}

export interface OpenInBrowserLink {
  browser: "safari" | "chrome";
  label: string;
  href: string;
}

export function buildOpenInBrowserLinks(pageUrl: string, { platform, host }: Pick<BrowserEnvironment, "platform" | "host">): OpenInBrowserLink[] {
  const url = parseWebUrl(pageUrl);
  if (!url) return [];
  const address = `${url.host}${url.pathname}${url.search}${url.hash}`;
  if (platform === "ios") {
    const chrome: OpenInBrowserLink = { browser: "chrome", label: "Відкрити в Chrome", href: `${url.protocol === "https:" ? "googlechromes" : "googlechrome"}://${address}` };
    // Threads silently ignores x-safari- (owner's iPhone 14 Pro Max, 2026-10-17); Safari there is reachable only via its «⋯» menu
    if (host === "threads") return [chrome];
    // a page cannot tell whether Chrome is installed, so Safari goes first
    return [{ browser: "safari", label: "Відкрити в Safari", href: `x-safari-${url.href}` }, chrome];
  }
  if (platform === "android") {
    // Android's Intent.parseUri splits at the last "#", so a "#draft=" fragment stays in the opened address.
    const scheme = url.protocol.slice(0, -1);
    const fallback = encodeURIComponent(url.href);
    return [{ browser: "chrome", label: "Відкрити в Chrome", href: `intent://${address}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end` }];
  }
  return [];
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

function parseWebUrl(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
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
