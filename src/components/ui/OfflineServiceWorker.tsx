"use client";

import { useEffect } from "react";

import { registerOfflineServiceWorker } from "@/lib/offline/service-worker";

export function OfflineServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    registerOfflineServiceWorker();
  }, []);

  return null;
}
