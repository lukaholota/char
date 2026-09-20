import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { getAllCreatures, getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { CreatureDiscussion } from "@/components/bestiary/CreatureDiscussion";
import { CreatureLoreSection } from "@/components/bestiary/CreatureLoreSection";
import { findCreatureLoreGroup } from "@/lib/bestiaryLore";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";
import { ChevronLeft } from "lucide-react";

export async function generateStaticParams() {
  const creatures = getAllCreatures("RULES_2014");
  return creatures.map((c) => ({ slug: toEntitySlug(c.nameEng) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const creature = getCreatureByIdOrSlug(slug, "RULES_2014");

  if (!creature) {
    return {
      title: "Істоту не знайдено",
    };
  }

  const crPart = creature.challenge && creature.challenge !== "-" ? ` (CR ${creature.challenge})` : "";
  const title = `${creature.name} [${creature.nameEng}]${crPart} — Бестіарій D&D 5e`;
  const description = getDescriptionSnippet(
    `${creature.name} (${creature.nameEng}) — ${creature.size} ${creature.type}, ${creature.alignment}. КБ ${creature.ac}, ХП ${creature.hp}. ${creature.description || ""}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/bestiary/${toEntitySlug(creature.nameEng)}`;

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
      ...(creature.imageUrl ? { images: [creature.imageUrl] } : {}),
    },
  };
}

export default async function CreatureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creature = getCreatureByIdOrSlug(slug, "RULES_2014");

  if (!creature) {
    notFound();
  }

  const loreGroup = findCreatureLoreGroup(creature.creatureId, "RULES_2014");

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Link
            href="/bestiary"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Назад до бестіарію</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <CreatureStatblockCard creature={creature} is2024={false} loreGroupDescription={loreGroup?.description ?? null} />
        <CreatureLoreSection group={loreGroup} is2024={false} />
        <CreatureDiscussion creature={creature} is2024={false} />
      </div>
    </div>
  );
}
