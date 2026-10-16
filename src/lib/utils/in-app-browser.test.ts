import { describe, expect, it } from "vitest";
import {
  buildChromeIntentUrl,
  buildReturnUrl,
  detectBrowserEnvironment,
  findInAppBrowserVariant,
  type BrowserEnvironment,
} from "@/lib/utils/in-app-browser";

const IOS_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IOS_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1";
const IOS_HOME_SCREEN_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const THREADS_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 337.0.0.22.95 (iPhone15,3; iOS 17_5; uk_UA; uk; scale=3.00; 1290x2796; 615203047)";
const THREADS_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.134 Mobile Safari/537.36 Barcelona 340.0.0.29.109 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; uk_UA; 618324011)";
const INSTAGRAM_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.31.95 (iPhone14,5; iOS 17_4; uk_UA; uk; scale=3.00; 1170x2532; 595213917)";
const INSTAGRAM_ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 Instagram 334.0.0.42.95 Android (33/13; 450dpi; 1080x2400; samsung; SM-A536B; a53x; s5e8825; uk_UA; 604247856)";
const FACEBOOK_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.97;FBBV/618520213;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/uk_UA;FBOP/80]";
const FACEBOOK_ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.42.109;]";
const TELEGRAM_IOS = IOS_SAFARI;
const TELEGRAM_ANDROID = "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.63 Mobile Safari/537.36";
const TELEGRAM_MINI_APP = "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.63 Mobile Safari/537.36 Telegram-Android/12.0.1 (Google Pixel 8; Android 14; SDK 34; HIGH)";
const GENERIC_ANDROID_WEBVIEW = "Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36";
const OLD_ANDROID_BROWSER = "Mozilla/5.0 (Linux; U; Android 4.4.2; uk-ua; GT-I9500 Build/KOT49H) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30";

function detect(userAgent: string, extra: { hasTelegramWebviewProxy?: boolean; isStandalone?: boolean } = {}): BrowserEnvironment {
  return detectBrowserEnvironment({ userAgent, hasTelegramWebviewProxy: false, isStandalone: false, ...extra });
}

describe("detectBrowserEnvironment", () => {
  it.each([
    ["Safari на iPhone", IOS_SAFARI, {}, { context: "regular_browser", host: null, platform: "ios" }],
    ["Chrome на iPhone", IOS_CHROME, {}, { context: "regular_browser", host: null, platform: "ios" }],
    ["застосунок з головного екрана iPhone", IOS_HOME_SCREEN_APP, { isStandalone: true }, { context: "regular_browser", host: null, platform: "ios" }],
    ["Chrome на Android", ANDROID_CHROME, {}, { context: "regular_browser", host: null, platform: "android" }],
    ["Chrome на компʼютері", DESKTOP_CHROME, {}, { context: "regular_browser", host: null, platform: "other" }],
    ["Threads на iPhone", THREADS_IOS, {}, { context: "embedded_browser", host: "threads", platform: "ios" }],
    ["Threads на Android", THREADS_ANDROID, {}, { context: "embedded_browser", host: "threads", platform: "android" }],
    ["Instagram на iPhone", INSTAGRAM_IOS, {}, { context: "embedded_browser", host: "instagram", platform: "ios" }],
    ["Instagram на Android", INSTAGRAM_ANDROID, {}, { context: "embedded_browser", host: "instagram", platform: "android" }],
    ["Facebook на iPhone", FACEBOOK_IOS, {}, { context: "embedded_browser", host: "facebook", platform: "ios" }],
    ["Facebook на Android", FACEBOOK_ANDROID, {}, { context: "embedded_browser", host: "facebook", platform: "android" }],
    ["Telegram на iPhone з Safari-подібним UA", TELEGRAM_IOS, { hasTelegramWebviewProxy: true }, { context: "embedded_browser", host: "telegram", platform: "ios" }],
    ["Telegram на Android з очищеним UA", TELEGRAM_ANDROID, { hasTelegramWebviewProxy: true }, { context: "embedded_browser", host: "telegram", platform: "android" }],
    ["Telegram Mini App", TELEGRAM_MINI_APP, {}, { context: "embedded_browser", host: "telegram", platform: "android" }],
    ["невідомий WebView на Android", GENERIC_ANDROID_WEBVIEW, {}, { context: "embedded_browser", host: "other", platform: "android" }],
    ["невідомий WebView на iPhone", IOS_HOME_SCREEN_APP, {}, { context: "embedded_browser", host: "other", platform: "ios" }],
    ["старий браузер Android", OLD_ANDROID_BROWSER, {}, { context: "unknown", host: null, platform: "android" }],
    ["порожній UA", "", {}, { context: "regular_browser", host: null, platform: "other" }],
  ] as const)("%s", (_label, userAgent, extra, expected) => {
    expect(detect(userAgent, extra)).toEqual(expected);
  });
});

describe("findInAppBrowserVariant", () => {
  it("без запиту бере неблокуюче попередження", () => {
    expect(findInAppBrowserVariant(null, null)).toBe("contextual");
  });

  it("бере перше відоме значення", () => {
    expect(findInAppBrowserVariant("control", "contextual-handoff")).toBe("control");
    expect(findInAppBrowserVariant(null, "contextual-handoff")).toBe("contextual-handoff");
  });

  it("пропускає невідомі значення", () => {
    expect(findInAppBrowserVariant("bogus", "control")).toBe("control");
    expect(findInAppBrowserVariant(true, "test")).toBe("contextual");
  });
});

describe("buildChromeIntentUrl", () => {
  it("веде на ту саму сторінку в Chrome з параметрами", () => {
    expect(buildChromeIntentUrl("https://char.holota.family/char/create?preset=wizard&from=threads")).toBe(
      "intent://char.holota.family/char/create?preset=wizard&from=threads#Intent;scheme=https;package=com.android.chrome;end"
    );
  });

  it("не будує посилання для інших схем", () => {
    expect(buildChromeIntentUrl("javascript:alert(1)")).toBeNull();
    expect(buildChromeIntentUrl("not a url")).toBeNull();
  });
});

describe("buildReturnUrl", () => {
  it("зберігає поточний шлях і параметри", () => {
    expect(buildReturnUrl("https://char.holota.family/2024/char?from=abc")).toBe("https://char.holota.family/2024/char?from=abc");
  });

  it("прибирає службовий параметр варіанта й якір", () => {
    expect(buildReturnUrl("https://char.holota.family/char/create?inapp_variant=control&preset=x#top")).toBe(
      "https://char.holota.family/char/create?preset=x"
    );
  });

  it("домашню сторінку персонажів веде в конструктор", () => {
    expect(buildReturnUrl("https://char.holota.family/char/home")).toBe("https://char.holota.family/char");
  });
});
