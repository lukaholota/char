import { GuidedBuildTree } from "@/components/optimization/GuidedBuildTree";
import { loadBuildPage } from "@/lib/optimization/build-pages.server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Дерево варіантів Монаха (2024) — RPGbot", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ build?: string }> }) {
  const params = await searchParams;
  return <GuidedBuildTree key="RULES_2024" data={await loadBuildPage("RULES_2024")} initialBuildId={params.build} />;
}
