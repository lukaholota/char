import { redirectKeepingNoAiMode } from "@/lib/no-ai/no-ai-server";
import { findReadyPresetSlugForBuild } from "@/lib/optimization/ready-preset.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Готові персонажі — RPGbot", robots: { index: false, follow: false } };

// Every 2014 build is a ready preset; old build links open it in the creator.
export default async function Page({ searchParams }: { searchParams: Promise<{ build?: string }> }) {
  const params = await searchParams;
  const preset = params.build ? await findReadyPresetSlugForBuild(params.build) : null;
  await redirectKeepingNoAiMode(preset ? `/char/create?preset=${preset}` : "/char/presets");
}
