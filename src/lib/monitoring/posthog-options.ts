import { findDisplayMode } from "@/lib/pwa/install-platform";
import type { CaptureResult, PostHogConfig } from "posthog-js";

import { isNoiseErrorMessage, isNoiseSourceUrl } from "@/lib/monitoring/error-noise";
import { dropOAuthReferrers } from "@/lib/monitoring/funnel-analytics-model";
import { buildPostHogPageProperties, buildScreenProperties, stripPrivateUrlParams } from "@/lib/monitoring/posthog-context";
import { sessionReplayOptions } from "@/lib/monitoring/session-replay";

// persistence: "memory" — жодного cookie чи localStorage. Анонімний distinct_id не переживає
// перезавантаження сторінки чи нову вкладку, зате саме через це PostHog не чіпає сховище
// пристрою і банер згоди не потрібен: тригер ePrivacy — доступ до/запис у сховище пристрою,
// а не сам факт відправки подій. Для залогінених — identify(userId) у PostHogIdentify
// привʼязує події до вже наявного акаунта без жодного стороннього ідентифікатора.
//
// autocapture і heatmaps вимкнені навмисно — рішення власника 2026-08-12: власні події
// дають кращий сигнал для дашбордів, ніж сирі кліки, і не дуже до цього тягнуть менше даних
// per-visitor. Не про приватність — про сигнал/шум.
//
// Pageviews wait for authentication and the character's pinned edition in PostHogProvider.
// Replay starts switched off; posthog-client turns it on only on creator, preset and level-up routes.
export const sharedPostHogOptions: Partial<PostHogConfig> = {
  persistence: "memory",
  api_transport: "fetch",
  // /i/v0/e/ відповідає 400 на beacon-тіло `data=<base64>`; fetch з keepalive теж переживає закриття вкладки.
  disable_beacon: true,
  disable_compression: true,
  capture_pageview: false,
  capture_pageleave: false,
  autocapture: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_performance: false,
  disable_session_recording: true,
  enable_recording_console_log: false,
  session_recording: sessionReplayOptions,
  person_profiles: "identified_only",
  before_send: preparePostHogEvent,
};

function preparePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || event.properties.is_internal === true) return null;
  if (event.event === "$snapshot") return event;
  const page = buildPostHogPageProperties(event.properties.$pathname ?? "/", event.properties.edition);
  const screen = buildScreenProperties(event.properties.$screen_width ?? 0, event.properties.$screen_height ?? 0);
  event.properties = { ...page, ...screen, display_mode: findDisplayMode(), ...event.properties };
  stripPrivateUrls(event.properties);
  dropOAuthReferrers(event.properties);
  if (event.$set_once) {
    stripPrivateUrls(event.$set_once);
    dropOAuthReferrers(event.$set_once);
  }
  return dropNoiseExceptions(event);
}

const URL_PROPERTIES = ["$current_url", "$referrer", "$session_entry_url", "$initial_current_url", "$initial_referrer"];

export function stripPrivateUrls(properties: Record<string, unknown>): void {
  for (const key of URL_PROPERTIES) {
    const value = properties[key];
    if (typeof value === "string") properties[key] = stripPrivateUrlParams(value);
  }
  stripInitialPersonInfoUrls(properties);
}

// posthog-js keeps the first page as `$initial_person_info: { u, r }` and expands it on the server.
function stripInitialPersonInfoUrls(properties: Record<string, unknown>): void {
  const info = properties.$initial_person_info;
  if (!info || typeof info !== "object") return;
  const { u, r } = info as { u?: unknown; r?: unknown };
  properties.$initial_person_info = { ...info, ...(typeof u === "string" ? { u: stripPrivateUrlParams(u) } : {}), ...(typeof r === "string" ? { r: stripPrivateUrlParams(r) } : {}) };
}

type CapturedException = {
  type?: string;
  value?: string;
  stacktrace?: { frames?: { filename?: string }[] };
};

export function dropNoiseExceptions(event: CaptureResult | null): CaptureResult | null {
  if (event?.event !== "$exception") return event;

  const exceptions: CapturedException[] = event.properties.$exception_list ?? [];
  return exceptions.some(isNoiseException) ? null : event;
}

function isNoiseException({ type, value, stacktrace }: CapturedException): boolean {
  const topFrameUrl = stacktrace?.frames?.at(-1)?.filename;
  return (
    (value !== undefined && isNoiseErrorMessage(type, value)) ||
    (topFrameUrl !== undefined && isNoiseSourceUrl(topFrameUrl))
  );
}
