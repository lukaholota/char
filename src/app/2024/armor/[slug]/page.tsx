import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { getAllArmors, getArmorByIdOrSlug } from "@/lib/armorData";
import { armorTypeTranslations } from "@/lib/refs/translation";
import { ArmorDetailCard } from "@/components/armor/ArmorDetailCard";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  const armors = getAllArmors("RULES_2024");
  return armors.map((a) => ({ slug: toEntitySlug(a.engName) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const armor = getArmorByIdOrSlug(slug, "RULES_2024");

  if (!armor) {
    return {
      title: "Обладунок не знайдено",
    };
  }

  const typeLabel = armorTypeTranslations[armor.armorType] || armor.armorType;
  const title = `${armor.nameUa} [${armor.engName}] — ${typeLabel} (2024)`;
  const description = getDescriptionSnippet(
    `${armor.nameUa} (${armor.engName}) D&D 2024 — ${typeLabel}. Базовий КБ: ${armor.baseAC}. Вага: ${armor.weight}, вартість: ${armor.cost}.`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/2024/armor/${toEntitySlug(armor.engName)}`;

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

export default async function Armor2024DetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const armor = getArmorByIdOrSlug(slug, "RULES_2024");

  if (!armor) {
    notFound();
  }

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(192,74,224,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/2024/armor"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до обладунків 2024
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <ArmorDetailCard armor={armor} is2024={true} />
      </div>
    </div>
  );
}
