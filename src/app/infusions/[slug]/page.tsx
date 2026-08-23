import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllInfusions, getInfusionByIdOrSlug } from "@/lib/infusionsData";
import { InfusionDetailCard } from "@/components/infusions/InfusionDetailCard";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  const infusions = getAllInfusions();
  return infusions.map((i) => ({ slug: toEntitySlug(i.engName) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const infusion = getInfusionByIdOrSlug(slug);

  if (!infusion) {
    return {
      title: "Вливання не знайдено",
    };
  }

  const title = `${infusion.nameUa} [${infusion.engName}] — Вливання винахідника`;
  const description = getDescriptionSnippet(
    `${infusion.nameUa} (${infusion.engName}) — Вливання винахідника ${infusion.minArtificerLevel}+ рівня (TCoE). ${infusion.shortDescription || infusion.description}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/infusions/${toEntitySlug(infusion.engName)}`;

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

export default async function InfusionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const infusion = getInfusionByIdOrSlug(slug);

  if (!infusion) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/infusions"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до вливань
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <InfusionDetailCard infusion={infusion} />
      </div>
    </div>
  );
}
