export type InstallPath = "installed" | "native-prompt" | "ios-safari" | "ios-other-browser" | "in-app-browser" | "android-menu";

export function findInstallPath({ userAgent, isStandalone, hasInstallPrompt }: {
  userAgent: string;
  isStandalone: boolean;
  hasInstallPrompt: boolean;
}): InstallPath | null {
  if (isStandalone) return "installed";
  if (!/Android|iPhone|iPad|iPod/i.test(userAgent)) return null;
  if (/Telegram|Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|; wv\)/i.test(userAgent)) return "in-app-browser";
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent) || !/Safari/i.test(userAgent) ? "ios-other-browser" : "ios-safari";
  }
  return hasInstallPrompt ? "native-prompt" : "android-menu";
}

export function findDisplayMode(): "browser" | "standalone" {
  if (typeof window === "undefined") return "browser";
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return iosNavigator.standalone || window.matchMedia?.("(display-mode: standalone)").matches ? "standalone" : "browser";
}
