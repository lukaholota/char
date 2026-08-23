"use client";

import { use } from "react";
import { BackgroundInterceptModal } from "@/components/backgrounds/BackgroundInterceptModal";

export default function Background2024ModalPage({
  params,
}: {
  params: Promise<{ backgroundId: string }>;
}) {
  const { backgroundId } = use(params);
  return <BackgroundInterceptModal idOrSlug={backgroundId} ruleset="RULES_2024" />;
}
