"use client";

import { useEffect } from "react";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";

type SurfaceViewProperties = Parameters<typeof captureRpgbotEvent<"rpgbot_surface_viewed">>[1];

export function useRpgbotSurfaceView(properties: SurfaceViewProperties | null): void {
  const identity = properties ? JSON.stringify(properties) : null;
  useEffect(() => {
    if (identity) captureRpgbotEvent("rpgbot_surface_viewed", JSON.parse(identity));
  }, [identity]);
}
