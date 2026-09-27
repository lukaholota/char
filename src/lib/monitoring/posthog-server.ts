import { auth } from "@/lib/auth";
import { after } from "next/server";
import { isInternalAnalyticsEmail } from "@/lib/monitoring/posthog-context";

type AnalyticsUser = { id: number | string; email: string | null };

// Analytics delivery must never turn a committed database write into a failed user action.
export function captureServerPostHogEvent(event: string, properties: Record<string, unknown>, user?: AnalyticsUser): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (process.env.NODE_ENV !== "production" || !key || !host) return;
  try {
    after(() => deliverAuthenticatedPostHogEvent({ host, key, event, properties }, user));
  } catch (error) {
    console.warn("PostHog scheduling failed", error instanceof Error ? error.name : "unknown");
  }
}

async function deliverAuthenticatedPostHogEvent(input: { host: string; key: string; event: string; properties: Record<string, unknown> }, user?: AnalyticsUser): Promise<void> {
  try {
    const actor = user ?? (await auth())?.user;
    if (!actor?.id || isInternalAnalyticsEmail(actor.email, process.env.QA_CREDENTIALS_EMAIL)) return;
    await sendPostHogEvent(input.host, { api_key: input.key, event: input.event, properties: { ...input.properties, distinct_id: String(actor.id), $geoip_disable: true, $process_person_profile: false, environment: "production", analytics_version: 2, source: "server" } });
  } catch (error) {
    console.warn("PostHog identity unavailable", error instanceof Error ? error.name : "unknown");
  }
}

async function sendPostHogEvent(host: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch(`${host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) console.warn("PostHog delivery rejected", response.status);
  } catch (error) {
    console.warn("PostHog delivery failed", error instanceof Error ? error.name : "unknown");
  }
}
