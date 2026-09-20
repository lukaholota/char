import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { getAllBackgrounds, getBackgroundByIdOrSlug } from "@/lib/backgroundsData";
import { sourceTranslations } from "@/lib/refs/translation";
import { BackgroundDetailCard } from "@/components/backgrounds/BackgroundDetailCard";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  return getAllBackgrounds("RULES_2014").flatMap((b) => [
    { backgroundId: b.slug },
    { backgroundId: String(b.backgroundId) },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ backgroundId: string }>;
}): Promise<Metadata> {
  const { backgroundId } = await params;
  const background = getBackgroundByIdOrSlug(backgroundId, "RULES_2014");

  if (!background) {
    return { title: "Походження не знайдено" };
  }

  const sourceLabel =
    sourceTranslations[background.source as keyof typeof sourceTranslations] || background.source;
  const title = `${background.name} [${background.engName}] — походження D&D`;
  const description = getDescriptionSnippet(
    `${background.name} (${background.engName}) — походження D&D 5e, ${sourceLabel}. ${background.description}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/backgrounds/${background.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default async function BackgroundDetailPage({
  params,
}: {
  params: Promise<{ backgroundId: string }>;
}) {
  const { backgroundId } = await params;
  const background = getBackgroundByIdOrSlug(backgroundId, "RULES_2014");

  if (!background) {
    notFound();
  }

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)]">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/backgrounds"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до походжень
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <BackgroundDetailCard background={background} is2024={false} />
      </div>
    </div>
  );
}
