import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllWeapons, getWeaponByIdOrSlug } from "@/lib/weaponsData";
import { weaponTypeTranslations, damageTypeTranslations } from "@/lib/refs/translation";
import { WeaponDetailCard } from "@/components/weapons/WeaponDetailCard";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  const weapons = getAllWeapons("RULES_2014");
  return weapons.map((w) => ({ slug: toEntitySlug(w.engName) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const weapon = getWeaponByIdOrSlug(slug, "RULES_2014");

  if (!weapon) {
    return {
      title: "Зброю не знайдено",
    };
  }

  const typeLabel = weaponTypeTranslations[weapon.weaponType] || weapon.weaponType;
  const damageTypeLabel = damageTypeTranslations[weapon.damageType] || weapon.damageType;
  const title = `${weapon.nameUa} [${weapon.engName}] — ${typeLabel}`;
  const description = getDescriptionSnippet(
    `${weapon.nameUa} (${weapon.engName}) — ${typeLabel}. Шкода: ${weapon.damage || "-"} ${damageTypeLabel}. ${weapon.isRanged ? "Дальня зброя." : "Ближня зброя."}`
  );
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/weapons/${toEntitySlug(weapon.engName)}`;

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

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const weapon = getWeaponByIdOrSlug(slug, "RULES_2014");

  if (!weapon) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/weapons"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до зброї
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <WeaponDetailCard weapon={weapon} is2024={false} />
      </div>
    </div>
  );
}
