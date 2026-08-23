import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllCreatures, getCreatureByIdOrSlug } from "@/lib/bestiaryData";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";
import { ChevronLeft } from "lucide-react";

export async function generateStaticParams() {
  const creatures = getAllCreatures("RULES_2024");
  return creatures.map((c) => ({ slug: toEntitySlug(c.nameEng) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const creature = getCreatureByIdOrSlug(slug, "RULES_2024");

  if (!creature) {
    return {
      title: "Істоту не знайдено",
    };
  }

  const crPart = creature.challenge && creature.challenge !== "-" ? ` (CR ${creature.challenge})` : "";
  const title = `${creature.name} [${creature.nameEng}]${crPart} — Бестіарій D&D 2024`;
  const description = getDescriptionSnippet(
    `${creature.name} (${creature.nameEng}) D&D 2024 — ${creature.size} ${creature.type}, ${creature.alignment}. КБ ${creature.ac}, ХП ${creature.hp}. ${creature.description || ""}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/2024/bestiary/${toEntitySlug(creature.nameEng)}`;

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

export default async function Creature2024DetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/bestiary");
  }

  const { slug } = await params;
  const creature = getCreatureByIdOrSlug(slug, "RULES_2024");

  if (!creature) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Link
            href="/2024/bestiary"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Назад до бестіарію 2024</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <CreatureStatblockCard creature={creature} is2024={true} />
      </div>
    </div>
  );
}
