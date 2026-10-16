import { redirectKeepingNoAiMode } from "@/lib/no-ai/no-ai-server";
import { findReadyPresetSlugForBuild } from "@/lib/optimization/ready-preset.server";
import { findPresetEntry } from "@/lib/monitoring/rpgbot-analytics-model";

export const dynamic = "force-dynamic";
export const metadata = { title: "Готові персонажі — RPGbot", robots: { index: false, follow: false } };

// Every 2014 build is a ready preset; old build links open it in the creator.
export default async function Page({ searchParams }: { searchParams: Promise<{ build?: string; from?: string }> }) {
  const params = await searchParams;
  const preset = params.build ? await findReadyPresetSlugForBuild(params.build) : null;
  const entry = findPresetEntry(params.from);
  await redirectKeepingNoAiMode(preset ? `/char/create?preset=${preset}${entry === "direct" ? "" : `&from=${entry}`}` : "/char/presets");
}
