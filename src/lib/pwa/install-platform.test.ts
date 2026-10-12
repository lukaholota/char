import { describe, expect, it } from "vitest";
import { findInstallPath } from "./install-platform";

const pixel = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const chromeIos = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1";

describe("install platform", () => {
  it.each([
    [pixel, true, "native-prompt"], [pixel, false, "android-menu"],
    [safari, false, "ios-safari"], [chromeIos, false, "ios-other-browser"],
    [safari.replace("iPhone", "iPad"), false, "ios-safari"],
    [safari.replace("Version/18.0", "FxiOS/130.0"), false, "ios-other-browser"],
    [safari + " Telegram/11.0", false, "in-app-browser"],
    [pixel + " Telegram/11.0", true, "in-app-browser"],
    [safari + " Instagram 350.0.0.0", false, "in-app-browser"],
    [safari + " [FBAN/FBIOS;FBAV/480.0]", false, "in-app-browser"],
    [pixel.replace("Android 14; Pixel 8", "Android 14; Pixel 8; wv"), false, "in-app-browser"],
    [pixel + " SamsungBrowser/26.0", true, "native-prompt"],
    ["Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0", false, "android-menu"],
  ] as const)("routes %s, prompt=%s to %s", (userAgent, hasInstallPrompt, path) => {
    expect(findInstallPath({ userAgent, hasInstallPrompt, isStandalone: false })).toBe(path);
  });
  it.each([pixel, safari, chromeIos, pixel + " Telegram/11.0"])("hides installation in standalone: %s", (userAgent) => {
    expect(findInstallPath({ userAgent, hasInstallPrompt: true, isStandalone: true })).toBe("installed");
  });
});
