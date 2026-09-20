"use client";

import { useEffect } from "react";

import { installOfflineActionGuard } from "@/lib/offline/action-guard";
import { registerOfflineServiceWorker } from "@/lib/offline/service-worker";

export function OfflineServiceWorker() {
  useEffect(() => {
    installOfflineActionGuard();
    if (process.env.NODE_ENV !== "production") return;
    registerOfflineServiceWorker();
  }, []);

  return null;
}
