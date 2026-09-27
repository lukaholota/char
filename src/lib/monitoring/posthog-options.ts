import type { CaptureResult, PostHogConfig } from "posthog-js";

import { isNoiseErrorMessage, isNoiseSourceUrl } from "@/lib/monitoring/error-noise";
import { buildPostHogPageProperties, buildScreenProperties } from "@/lib/monitoring/posthog-context";

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
export const sharedPostHogOptions: Partial<PostHogConfig> = {
  persistence: "memory",
  api_transport: "fetch",
  disable_compression: true,
  capture_pageview: false,
  capture_pageleave: false,
  autocapture: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  capture_performance: false,
  disable_session_recording: true,
  person_profiles: "identified_only",
  before_send: preparePostHogEvent,
};

function preparePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || event.properties.is_internal === true) return null;
  const page = buildPostHogPageProperties(event.properties.$pathname ?? "/", event.properties.edition);
  const screen = buildScreenProperties(event.properties.$screen_width ?? 0, event.properties.$screen_height ?? 0);
  event.properties = { ...page, ...screen, ...event.properties };
  return dropNoiseExceptions(event);
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
