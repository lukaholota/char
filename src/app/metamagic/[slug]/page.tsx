import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { getAllMetamagic, getMetamagicByIdOrSlug } from "@/lib/metamagicData";
import { describeMetamagicCost } from "@/lib/metamagic-cost";
import { MetamagicDetailCard } from "@/components/metamagic/MetamagicDetailCard";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  return getAllMetamagic("RULES_2014").map((option) => ({ slug: toEntitySlug(option.engName) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const metamagic = getMetamagicByIdOrSlug(slug, "RULES_2014");

  if (!metamagic) {
    return {
      title: "Метамагію не знайдено",
    };
  }

  const title = `${metamagic.nameUa} [${metamagic.engName}] — Метамагія`;
  const description = getDescriptionSnippet(
    `${metamagic.nameUa} (${metamagic.engName}) — метамагія чародія, ${describeMetamagicCost(metamagic).toLowerCase()}. ${metamagic.shortDescription || metamagic.description}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/metamagic/${toEntitySlug(metamagic.engName)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
  };
}

export default async function MetamagicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const metamagic = getMetamagicByIdOrSlug(slug, "RULES_2014");

  if (!metamagic) {
    notFound();
  }

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/metamagic"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до метамагії
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <MetamagicDetailCard metamagic={metamagic} is2024={false} />
      </div>
    </div>
  );
}
