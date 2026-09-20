import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { buildSpellKey, getAllSpells, getSpellByIdOrSlug } from "@/lib/spellsData";
import { spellSchoolTranslations } from "@/lib/refs/translation";
import { SpellDetailCard } from "@/components/spells/SpellDetailCard";
import { SpellDiscussion } from "@/components/spells/SpellDiscussion";
import { getDescriptionSnippet } from "@/lib/seo-utils";

// Generate all spell pages at build time
export async function generateStaticParams() {
  const spells = getAllSpells();
  return spells.map((spell) => ({
    spellId: buildSpellKey(spell),
  }));
}

// Generate SEO metadata for each spell
export async function generateMetadata({
  params,
}: {
  params: Promise<{ spellId: string }>;
}): Promise<Metadata> {
  const { spellId } = await params;
  const spell = getSpellByIdOrSlug(spellId);

  if (!spell) {
    return {
      title: "Заклинання не знайдено",
    };
  }

  const schoolLabel = spell.school
    ? spellSchoolTranslations[spell.school as keyof typeof spellSchoolTranslations] || spell.school
    : "";
  const levelLabel = spell.level === 0 ? "Замовляння" : `${spell.level} рівень`;

  const title = `${spell.name} — ${levelLabel}`;
  const description = getDescriptionSnippet(`${spell.name} (${levelLabel}, ${schoolLabel}). ${spell.description}`);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/spells/${buildSpellKey(spell)}`;

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

// Main page component
export default async function SpellDetailPage({
  params,
}: {
  params: Promise<{ spellId: string }>;
}) {
  const { spellId } = await params;
  const spell = getSpellByIdOrSlug(spellId);

  if (!spell) {
    notFound();
  }

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      {/* Header with back button */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/spells"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до заклинань
          </Link>
        </div>
      </div>
      
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <SpellDetailCard spell={spell} />
        <SpellDiscussion spell={spell} is2024={false} />
      </div>
    </div>
  );
}
