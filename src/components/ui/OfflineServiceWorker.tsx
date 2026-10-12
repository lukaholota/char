"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { installOfflineActionGuard } from "@/lib/offline/action-guard";
import { registerOfflineServiceWorker, savePageForOffline } from "@/lib/offline/service-worker";
import { startAppUpdates } from "@/lib/pwa/app-updates";
import { runWhenIdle } from "@/lib/run-when-idle";

// The installed app starts on the character list, so it must open without a network too.
const CHARACTER_LIST_PATH = /^(\/no-ai)?(\/2024)?\/char\/home$/;
const SAVE_IDLE_TIMEOUT_MS = 5000;

export function OfflineServiceWorker() {
  const pathname = usePathname();

  useEffect(() => {
    installOfflineActionGuard();
    if (process.env.NODE_ENV !== "production") return;
    registerOfflineServiceWorker();
    return startAppUpdates();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !CHARACTER_LIST_PATH.test(pathname) || !navigator.onLine) return;
    return runWhenIdle(() => void savePageForOffline(window.location.origin + pathname), SAVE_IDLE_TIMEOUT_MS);
  }, [pathname]);

  return null;
}
