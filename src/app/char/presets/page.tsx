import type { Metadata } from "next";
import { ReadyPresetGallery } from "@/components/optimization/ReadyPresetGallery";
import { loadReadyPresetCatalog } from "@/lib/optimization/ready-preset.server";

export const metadata: Metadata = { title: "Готові персонажі — ДнД українською", robots: { index: false, follow: false } };

export default async function ReadyPresetsPage() {
  return <ReadyPresetGallery presets={await loadReadyPresetCatalog()} />;
}
