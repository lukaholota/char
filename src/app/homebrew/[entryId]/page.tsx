import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { SpellDetailCard } from "@/components/spells/SpellDetailCard";
import { ContentDiscussion } from "@/components/discussion/ContentDiscussion";
import { HomebrewByline, HomebrewEntryButtons } from "@/components/homebrew/HomebrewEntryDetails";
import { loadHomebrewEntry } from "@/lib/actions/homebrew-actions";
import { buildDiscussionTarget } from "@/lib/logic/content-discussion";
import { buildHomebrewCatalogHref } from "@/lib/logic/homebrew-catalog";

type PageProps = { params: Promise<{ entryId: string }>; searchParams: Promise<{ edition?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const entry = await loadHomebrewEntry(Number((await params).entryId));
  return { title: entry ? `${entry.name} — хоумбрю спільноти` : "Хоумбрю не знайдено", robots: { index: false } };
}

export default async function HomebrewEntryPage({ params, searchParams }: PageProps) {
  const is2024 = (await searchParams).edition === "2024";
  const entry = await loadHomebrewEntry(Number((await params).entryId), is2024 ? "RULES_2024" : "RULES_2014");
  if (!entry) notFound();

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link href={buildHomebrewCatalogHref({ kind: entry.kind, is2024, entryId: entry.entryId })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
            Хоумбрю
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <HomebrewByline entry={entry} />
        {entry.kind === "SPELL" ? <SpellDetailCard spell={entry.spell} is2024={is2024} /> : <CreatureStatblockCard creature={entry.creature} is2024={is2024} />}
        <HomebrewEntryButtons entry={entry} />
        <ContentDiscussion target={buildDiscussionTarget({ kind: "HOMEBREW", entryId: entry.entryId })} />
      </main>
    </div>
  );
}
