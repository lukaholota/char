import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { getAllInvocations, getInvocationByIdOrSlug } from "@/lib/invocationsData";
import { InvocationDetailCard } from "@/components/invocations/InvocationDetailCard";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  const invocations = getAllInvocations("RULES_2014");
  return invocations.map((inv) => ({ slug: toEntitySlug(inv.engName) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const invocation = getInvocationByIdOrSlug(slug, "RULES_2014");

  if (!invocation) {
    return {
      title: "Відозву не знайдено",
    };
  }

  const levelPart = invocation.minLevel ? ` (${invocation.minLevel}+ рівень)` : "";
  const title = `${invocation.nameUa} [${invocation.engName}] — Таємнича відозва`;
  const description = getDescriptionSnippet(
    `${invocation.nameUa} (${invocation.engName})${levelPart} — Таємнича відозва чорнокнижника. ${invocation.shortDescription || invocation.description}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/invocations/${toEntitySlug(invocation.engName)}`;

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

export default async function InvocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invocation = getInvocationByIdOrSlug(slug, "RULES_2014");

  if (!invocation) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/invocations"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до відозв
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <InvocationDetailCard invocation={invocation} is2024={false} />
      </div>
    </div>
  );
}
