"use client";

import { useSyncExternalStore } from "react";
import { readPostHogFeatureFlag } from "@/lib/monitoring/posthog-client";
import {
  detectBrowserEnvironment,
  findInAppBrowserVariant,
  IN_APP_BROWSER_FALLBACK_VARIANT,
  IN_APP_BROWSER_FLAG_KEY,
  IN_APP_BROWSER_VARIANT_PARAM,
  isEmbeddedBrowser,
  readBrowserSignals,
  type BrowserEnvironment,
  type InAppBrowserVariant,
} from "@/lib/utils/in-app-browser";

export interface InAppBrowserState {
  environment: BrowserEnvironment;
  isEmbedded: boolean;
  variant: InAppBrowserVariant;
}

let lastSignalsKey = "";
let lastEnvironment: BrowserEnvironment | null = null;

export function useInAppBrowser(): InAppBrowserState | null {
  const environment = useSyncExternalStore(subscribeToNothing, readEnvironment, readServerEnvironment);
  if (!environment) return null;
  const isEmbedded = isEmbeddedBrowser(environment);
  return { environment, isEmbedded, variant: isEmbedded ? readVariant() : IN_APP_BROWSER_FALLBACK_VARIANT };
}

function readEnvironment(): BrowserEnvironment {
  const signals = readBrowserSignals();
  const key = `${signals.userAgent}|${signals.hasTelegramWebviewProxy}|${signals.isStandalone}`;
  if (key !== lastSignalsKey || !lastEnvironment) {
    lastSignalsKey = key;
    lastEnvironment = detectBrowserEnvironment(signals);
  }
  return lastEnvironment;
}

function readServerEnvironment(): null {
  return null;
}

function subscribeToNothing(): () => void {
  return () => {};
}

function readVariant(): InAppBrowserVariant {
  const override = new URLSearchParams(window.location.search).get(IN_APP_BROWSER_VARIANT_PARAM);
  return findInAppBrowserVariant(override, readPostHogFeatureFlag(IN_APP_BROWSER_FLAG_KEY));
}
