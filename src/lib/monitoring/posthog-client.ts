import type { PostHog } from "posthog-js";

import { sharedPostHogOptions } from "@/lib/monitoring/posthog-options";

// Поза продом PostHog вимкнений — той самий запобіжник, що в Sentry
// (src/lib/monitoring/sentry-options.ts): події з `bun dev` ще не бачив жоден користувач,
// вони зʼїдали б безкоштовну квоту і змішувалися б у панелі зі справжніми.
const isEnabled = process.env.NODE_ENV === "production";

let postHogLoad: Promise<PostHog | null> | null = null;

/** posthog-js — ~230 КБ на кожній сторінці; його тягне перша подія або вільна хвилина, а не старт. */
export function loadPostHog(): Promise<PostHog | null> {
  postHogLoad ??= importAndInitPostHog().catch(() => null);
  return postHogLoad;
}

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>): void {
  void loadPostHog().then((posthog) => posthog?.capture(event, properties));
}

async function importAndInitPostHog(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!isEnabled || !key || !host) return null;

  const { default: posthog } = await import("posthog-js");
  posthog.init(key, { api_host: host, ...sharedPostHogOptions });
  return posthog;
}
