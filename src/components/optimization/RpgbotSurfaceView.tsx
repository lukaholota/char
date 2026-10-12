"use client";

import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";

type Props = Parameters<typeof useRpgbotSurfaceView>[0];

export function RpgbotSurfaceView(properties: NonNullable<Props>) {
  useRpgbotSurfaceView(properties);
  return null;
}
