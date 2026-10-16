import { capturePostHogEvent, configurePostHogBootstrap, findPostHogIds, flushPostHogOnExit, isPostHogEnabled, registerPostHogSuperProperties } from "@/lib/monitoring/posthog-client";
import {
  ANALYTICS_SCHEMA_VERSION, buildInAppHandoffHref, buildOAuthCallbackPath, findBrowserContext, findDeviceType, findEntryAttribution, readOAuthReturnContext,
  type AuthMethod, type CreationPath, type EntryAttribution, type InAppBrowserHost, type OAuthReturnContext,
} from "@/lib/monitoring/funnel-analytics-model";

export type InAppPlacement = "auth_dialog" | "creator" | "preset" | "other";
export type ExternalBrowserMethod = "android_intent" | "ios_safari_scheme" | "system_share" | "instructions_only" | "other";
export type InAppDismissAction = "continue_here" | "close";
export type AuthTrigger = "creator_submit" | "preset_submit" | "nav" | "discussion" | "homebrew" | "other";
export type AuthFailureReason = "provider_error" | "network" | "no_credential" | "returned_signed_out";
export type CreationFailureReason = "server" | "network";
type Edition = "2014" | "2024";

export type FunnelEventProperties = {
  character_creation_started: { edition: Edition; creation_path: CreationPath; creation_attempt_id: string; is_auth_return: boolean };
  character_creation_first_choice: { edition: Edition; creation_path: CreationPath; creation_attempt_id: string };
  character_create_failed: { edition: Edition; creation_path: CreationPath; creation_attempt_id: string | null; reason: CreationFailureReason };
  auth_requested: { trigger: AuthTrigger };
  auth_started: { method: AuthMethod; trigger: AuthTrigger | null };
  auth_completed: { method: AuthMethod };
  auth_failed: { method: AuthMethod; reason: AuthFailureReason };
  inapp_warning_shown: { placement: InAppPlacement };
  inapp_warning_dismissed: { placement: InAppPlacement; action: InAppDismissAction };
  inapp_external_browser_selected: { placement: InAppPlacement; method: ExternalBrowserMethod };
  inapp_link_copied: { placement: InAppPlacement; ok: boolean };
};

type FunnelEventName = keyof FunnelEventProperties;
type PageContext = { entry: EntryAttribution; inAppHost: InAppBrowserHost | null };

let pageContext: PageContext | null = null;
let authReturn: OAuthReturnContext | null = null;
let isAuthReturnReported = false;
let creationAttemptId: string | null = null;
let firstChoiceAttemptId: string | null = null;

function captureFunnelEvent<Name extends FunnelEventName>(event: Name, properties: FunnelEventProperties[Name]): void {
  try {
    startFunnelPageContext();
    capturePostHogEvent(event, { analytics_schema_version: ANALYTICS_SCHEMA_VERSION, ...properties });
  } catch (error) {
    console.warn("Analytics event failed", error instanceof Error ? error.name : "unknown");
  }
}

export function startFunnelPageContext(): void {
  if (pageContext || typeof window === "undefined") return;
  const { context, cleanHref } = readOAuthReturnContext(window.location.href, document.referrer, Date.now());
  if (cleanHref) window.setTimeout(() => window.history.replaceState(null, "", cleanHref), 0);
  authReturn = context;
  if (context?.creationAttemptId) creationAttemptId = context.creationAttemptId;
  if (context?.distinctId) configurePostHogBootstrap({ distinctID: context.distinctId, ...(context.sessionId ? { sessionID: context.sessionId } : {}) });
  const entry = context?.entry ?? findEntryAttribution({ href: window.location.href, referrer: document.referrer });
  const browser = findBrowserContext({ userAgent: window.navigator.userAgent ?? "", hasTelegramWebviewProxy: "TelegramWebviewProxy" in window });
  pageContext = { entry, inAppHost: browser.in_app_browser_host };
  registerPostHogSuperProperties({ ...entry, ...browser, device_type: findDeviceType(window.navigator.userAgent ?? "") });
}

function ensureCreationAttemptId(): string {
  creationAttemptId ??= typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return creationAttemptId;
}

export function captureCreationStarted(edition: Edition, creationPath: CreationPath = "manual"): void {
  captureFunnelEvent("character_creation_started", { edition, creation_path: creationPath, creation_attempt_id: ensureCreationAttemptId(), is_auth_return: authReturn !== null });
}

export function captureCreationFirstChoice(edition: Edition, creationPath: CreationPath = "manual"): void {
  const attemptId = ensureCreationAttemptId();
  if (firstChoiceAttemptId === attemptId) return;
  firstChoiceAttemptId = attemptId;
  captureFunnelEvent("character_creation_first_choice", { edition, creation_path: creationPath, creation_attempt_id: attemptId });
}

export function captureCreationFailed(edition: Edition, reason: CreationFailureReason, creationPath: CreationPath = "manual"): void {
  captureFunnelEvent("character_create_failed", { edition, creation_path: creationPath, creation_attempt_id: creationAttemptId, reason });
}

export function findCreationAnalytics(): { creationAttemptId: string | null; sessionId: string | null } {
  return { creationAttemptId, sessionId: findPostHogIds().sessionId };
}

export function finishCreationAttempt(): void {
  creationAttemptId = null;
}

export function captureAuthRequested(trigger: AuthTrigger): void {
  captureFunnelEvent("auth_requested", { trigger });
}

export function prepareGoogleAuthRedirect(callbackPath: string, trigger: AuthTrigger | null): string {
  captureFunnelEvent("auth_started", { method: "google_redirect", trigger });
  if (!isPostHogEnabled()) return callbackPath;
  try {
    startFunnelPageContext();
    const ids = findPostHogIds();
    const entry = pageContext?.entry ?? findEntryAttribution({ href: window.location.href, referrer: "" });
    return buildOAuthCallbackPath(callbackPath, { distinctId: ids.distinctId, sessionId: ids.sessionId, creationAttemptId, entry, method: "google_redirect" }, Date.now());
  } catch {
    return callbackPath;
  } finally {
    flushPostHogOnExit();
  }
}

export function captureAuthStarted(method: AuthMethod): void {
  captureFunnelEvent("auth_started", { method, trigger: null });
}

export function captureAuthCompleted(method: AuthMethod): void {
  captureFunnelEvent("auth_completed", { method });
}

export function captureAuthFailed(method: AuthMethod, reason: AuthFailureReason): void {
  captureFunnelEvent("auth_failed", { method, reason });
}

export function reportAuthReturn(userId: string | null): void {
  if (!authReturn || isAuthReturnReported) return;
  isAuthReturnReported = true;
  if (userId) captureAuthCompleted(authReturn.method);
  else captureAuthFailed(authReturn.method, "returned_signed_out");
}

export function captureInAppWarningShown(placement: InAppPlacement): void {
  captureFunnelEvent("inapp_warning_shown", { placement });
}

export function captureInAppWarningDismissed(placement: InAppPlacement, action: InAppDismissAction): void {
  captureFunnelEvent("inapp_warning_dismissed", { placement, action });
}

export function captureExternalBrowserSelected(placement: InAppPlacement, method: ExternalBrowserMethod): void {
  captureFunnelEvent("inapp_external_browser_selected", { placement, method });
}

export function captureLinkCopied(placement: InAppPlacement, ok: boolean): void {
  captureFunnelEvent("inapp_link_copied", { placement, ok });
}

export function buildInAppHandoffUrl(href: string): string {
  startFunnelPageContext();
  return buildInAppHandoffHref(href, pageContext?.inAppHost ?? "unknown");
}
