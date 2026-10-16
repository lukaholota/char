import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";
import { buildReturnUrl, detectBrowserEnvironment, readBrowserSignals, type InAppBrowserVariant } from "@/lib/utils/in-app-browser";

export type InAppPlacement = "auth_dialog" | "creator" | "preset" | "other";
export type ExternalBrowserMethod = "android_intent" | "ios_safari_scheme" | "system_share" | "instructions_only" | "other";
export type InAppDismissAction = "continue_here" | "close";

export function captureInAppWarningShown(placement: InAppPlacement, variant: InAppBrowserVariant): void {
  captureInAppBrowserEvent("in_app_browser_warning_shown", { placement, variant });
}

export function captureInAppWarningDismissed(placement: InAppPlacement, action: InAppDismissAction, variant: InAppBrowserVariant): void {
  captureInAppBrowserEvent("in_app_browser_warning_dismissed", { placement, action, variant });
}

export function captureExternalBrowserSelected(placement: InAppPlacement, method: ExternalBrowserMethod, variant: InAppBrowserVariant): void {
  captureInAppBrowserEvent("in_app_browser_external_selected", { placement, method, variant });
}

export function captureLinkCopied(placement: InAppPlacement, ok: boolean, variant: InAppBrowserVariant): void {
  captureInAppBrowserEvent("in_app_browser_link_copied", { placement, ok, variant });
}

export function buildInAppHandoffUrl(href: string): string {
  const returnUrl = buildReturnUrl(href);
  try {
    const url = new URL(returnUrl);
    url.searchParams.set("entry_source", detectBrowserEnvironment(readBrowserSignals()).host ?? "unknown");
    url.searchParams.set("entry_medium", "inapp_handoff");
    return url.toString();
  } catch {
    return returnUrl;
  }
}

function captureInAppBrowserEvent(event: string, properties: Record<string, unknown>): void {
  try {
    const environment = detectBrowserEnvironment(readBrowserSignals());
    capturePostHogEvent(event, {
      ...properties,
      browser_context: environment.context,
      in_app_browser_host: environment.host ?? "unknown",
      os: environment.platform,
    });
  } catch {
    return;
  }
}
