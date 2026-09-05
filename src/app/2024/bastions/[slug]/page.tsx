import { Metadata } from "next";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { notFound } from "next/navigation";
import { getAllBastionFacilities, getBastionFacilityBySlug } from "@/lib/bastionsData";
import { BastionFacilityDetailCard } from "@/components/bastions/BastionFacilityDetailCard";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  return getAllBastionFacilities().map((facility) => ({ slug: facility.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const facility = getBastionFacilityBySlug(slug);

  if (!facility) return { title: "Приміщення не знайдено" };

  const levelPart = facility.level === null ? "базове приміщення" : `${facility.level}+ рівень`;
  const title = `${facility.name} [${facility.engName}] — приміщення бастіону (2024)`;
  const description = getDescriptionSnippet(
    `${facility.name} (${facility.engName}), ${levelPart} — приміщення бастіону D&D 2024. ${facility.shortDescription}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/2024/bastions/${facility.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default async function BastionFacility2024Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const facility = getBastionFacilityBySlug(slug);

  if (!facility) notFound();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.05),transparent_50%)]">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/2024/bastions"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до приміщень бастіону
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <BastionFacilityDetailCard facility={facility} />
      </div>
    </div>
  );
}
