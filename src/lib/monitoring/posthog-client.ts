import { findDisplayMode } from "@/lib/pwa/install-platform";
import type { PostHog } from "posthog-js";

import { sharedPostHogOptions } from "@/lib/monitoring/posthog-options";
import { findPinnedRuleset } from "@/components/ui/PersEditionPin";
import { buildPostHogPageProperties } from "@/lib/monitoring/posthog-context";
import { isSessionReplayRoute } from "@/lib/monitoring/session-replay";
import { runWhenIdle } from "@/lib/run-when-idle";

// Поза продом PostHog вимкнений — той самий запобіжник, що в Sentry
// (src/lib/monitoring/sentry-options.ts): події з `bun dev` ще не бачив жоден користувач,
// вони зʼїдали б безкоштовну квоту і змішувалися б у панелі зі справжніми.
const isEnabled = process.env.NODE_ENV === "production";

let postHogLoad: Promise<PostHog | null> | null = null;
type AnalyticsIdentity = { userId: string | null; isInternal: boolean };
let currentIdentity: AnalyticsIdentity | null = null;
let identifiedUserId: string | null = null;
let client: PostHog | null = null;
const pendingEvents: Array<{ event: string; properties?: Record<string, unknown> }> = [];
let isFlushScheduled = false;
let bootstrapIds: { distinctID: string; sessionID?: string } | null = null;
let superProperties: Record<string, unknown> = {};
let replayPathname: string | null = null;
let isReplayRecording = false;

export function isPostHogEnabled(): boolean {
  return isEnabled;
}

export function configurePostHogBootstrap(ids: { distinctID: string; sessionID?: string }): void {
  if (!client) bootstrapIds = ids;
}

export function registerPostHogSuperProperties(properties: Record<string, unknown>): void {
  superProperties = { ...superProperties, ...properties };
  if (client) syncPostHogIdentity(client);
}

export function findPostHogIds(): { distinctId: string | null; sessionId: string | null } {
  try {
    return { distinctId: client?.get_distinct_id() ?? null, sessionId: client?.get_session_id() ?? null };
  } catch {
    return { distinctId: null, sessionId: null };
  }
}

// SDK failures are recoverable here: analytics is best effort and must not fail user actions.
export function configurePostHogIdentity(identity: AnalyticsIdentity): void {
  currentIdentity = identity;
  if (client) {
    syncPostHogIdentity(client);
    syncSessionReplay(client);
  }
  if (identity.isInternal) pendingEvents.length = 0;
  if (isEnabled && !identity.isInternal) schedulePostHogFlush();
}

export function loadPostHog(): Promise<PostHog | null> {
  if (!isEnabled || !currentIdentity || currentIdentity.isInternal) return Promise.resolve(null);
  postHogLoad ??= importAndInitPostHog().catch((error: unknown) => {
    console.warn("PostHog unavailable", error instanceof Error ? error.name : "unknown");
    return null;
  });
  return postHogLoad;
}

export function updateSessionReplayRoute(pathname: string): void {
  replayPathname = pathname;
  if (client) syncSessionReplay(client);
}

function syncSessionReplay(posthog: PostHog): void {
  const shouldRecord = !currentIdentity?.isInternal && isSessionReplayRoute(replayPathname ?? window.location.pathname);
  if (shouldRecord === isReplayRecording) return;
  try {
    if (shouldRecord) posthog.startSessionRecording();
    else posthog.stopSessionRecording();
    isReplayRecording = shouldRecord;
  } catch (error) {
    console.warn("PostHog replay failed", error instanceof Error ? error.name : "unknown");
  }
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>): void {
  if (!isEnabled || currentIdentity?.isInternal) return;
  const pathname = window.location.pathname;
  const pinnedRuleset = findPinnedRuleset();
  const edition = pinnedRuleset ? (pinnedRuleset === "RULES_2024" ? "2024" : "2014") : undefined;
  pendingEvents.push({ event, properties: { ...buildPostHogPageProperties(pathname, edition), $pathname: pathname, $current_url: window.location.href, display_mode: findDisplayMode(), ...properties } });
  if (document.visibilityState === "hidden") return flushPostHogOnExit();
  if (currentIdentity) schedulePostHogFlush();
}

function schedulePostHogFlush(): void {
  if (isFlushScheduled) return;
  isFlushScheduled = true;
  runWhenIdle(() => {
    isFlushScheduled = false;
    void loadPostHog().then(flushPostHogEvents).catch((error: unknown) => {
      console.warn("PostHog capture failed", error instanceof Error ? error.name : "unknown");
    });
  }, 5000);
}

export function flushPostHogOnExit(): void {
  if (client) flushPostHogEvents(client);
}

function flushPostHogEvents(posthog: PostHog | null): void {
  if (!posthog || !currentIdentity || currentIdentity.isInternal) return;
  syncPostHogIdentity(posthog);
  for (const { event, properties } of pendingEvents.splice(0)) {
    try {
      posthog.capture(event, properties, { send_instantly: true });
    } catch (error) {
      console.warn("PostHog capture failed", error instanceof Error ? error.name : "unknown");
    }
  }
}

function syncPostHogIdentity(posthog: PostHog): void {
  if (!currentIdentity) return;
  try {
    if (identifiedUserId !== currentIdentity.userId && identifiedUserId) posthog.reset();
    posthog.register({ ...superProperties, is_internal: currentIdentity.isInternal, display_mode: findDisplayMode(), is_signed_in: currentIdentity.userId !== null });
    if (currentIdentity.userId && identifiedUserId !== currentIdentity.userId && !currentIdentity.isInternal) {
      posthog.identify(currentIdentity.userId, { is_internal: false });
    }
    identifiedUserId = currentIdentity.userId;
  } catch (error) {
    console.warn("PostHog identity failed", error instanceof Error ? error.name : "unknown");
  }
}

async function importAndInitPostHog(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!isEnabled || !key || !host) return null;

  const { default: posthog } = await import("posthog-js");
  posthog.init(key, { api_host: host, ...sharedPostHogOptions, ...(bootstrapIds ? { bootstrap: bootstrapIds } : {}) });
  client = posthog;
  syncPostHogIdentity(posthog);
  syncSessionReplay(posthog);
  flushPostHogEvents(posthog);
  return posthog;
}
