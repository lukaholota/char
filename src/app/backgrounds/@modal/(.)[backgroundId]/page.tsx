import { getBackgroundByIdOrSlug } from "@/lib/backgroundsData";
import { BackgroundInterceptModal } from "@/components/backgrounds/BackgroundInterceptModal";

export default async function BackgroundModalPage({
  params,
}: {
  params: Promise<{ backgroundId: string }>;
}) {
  const { backgroundId } = await params;
  const background = getBackgroundByIdOrSlug(backgroundId, "RULES_2014") ?? null;

  return <BackgroundInterceptModal background={background} ruleset="RULES_2014" />;
}
