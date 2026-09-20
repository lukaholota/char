"use client";

import { WildMagicErrorScreen } from "@/components/errors/WildMagicErrorScreen";

const PREVIEW_SEED = "error-preview";

export function ErrorPreview() {
  return <WildMagicErrorScreen seed={PREVIEW_SEED} onRetry={reloadPreview} />;
}

function reloadPreview() {
  window.location.reload();
}
