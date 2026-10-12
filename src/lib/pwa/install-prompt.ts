"use client";

import { useSyncExternalStore } from "react";
import { findDisplayMode, findInstallPath, type InstallPath } from "./install-platform";

export type InstallPromptOutcome = "accepted" | "dismissed";
export interface DeferredInstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: InstallPromptOutcome }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt?: DeferredInstallPrompt;
    __pwaInstalled?: boolean;
  }
}


export function readInstallPath(): InstallPath | null {
  const userAgent = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1 ? `${navigator.userAgent} iPad` : navigator.userAgent;
  return findInstallPath({ userAgent, isStandalone: Boolean(window.__pwaInstalled) || findDisplayMode() === "standalone", hasInstallPrompt: Boolean(window.__deferredInstallPrompt) });
}

function subscribeToInstallPath(listener: () => void) {
  const standalone = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("pwa-install-state-changed", listener);
  standalone.addEventListener("change", listener);
  return () => {
    window.removeEventListener("pwa-install-state-changed", listener);
    standalone.removeEventListener("change", listener);
  };
}

export function useInstallPath() {
  return useSyncExternalStore(subscribeToInstallPath, readInstallPath, (): null => null);
}

export async function requestAppInstall(): Promise<InstallPromptOutcome | null> {
  const prompt = window.__deferredInstallPrompt;
  if (!prompt) return null;
  delete window.__deferredInstallPrompt;
  window.dispatchEvent(new Event("pwa-install-state-changed"));
  // prompt() must run in the original tap; awaiting anything first loses user activation.
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice.outcome;
}
