export function isEmbeddedWebViewUserAgent(userAgent: string): boolean {
  const ua = userAgent || "";

  // Meta / in-app browsers
  const metaInApp = /(FBAN|FBAV|FB_IAB|FB4A|FBMD|Instagram|Threads)/i.test(ua);
  // Android WebView often includes "; wv" or Version/x.y without Chrome
  const androidWebView =
    /;\s?wv\b/i.test(ua) ||
    (/Android/i.test(ua) && /Version\//i.test(ua) && !/Chrome\//i.test(ua));
  // iOS WebView: AppleWebKit present but "Safari" token missing
  const iosWebView =
    /iP(hone|od|ad)/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua);

  return metaInApp || androidWebView || iosWebView;
}

export function isEmbeddedWebView(): boolean {
  if (typeof window === "undefined") return false;
  return isEmbeddedWebViewUserAgent(window.navigator.userAgent || "");
}
