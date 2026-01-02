import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllMagicItems, getMagicItemById, type MagicItemWithSpells } from "@/lib/magicItemsData";
import { magicItemTypeTranslations, itemRarityTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { getDescriptionSnippet } from "@/lib/seo-utils";

// Generate all pages at build time
export async function generateStaticParams() {
  const items = getAllMagicItems();
  return items.map((item) => ({
    magicItemId: String(item.magicItemId),
  }));
}

function typeLabel(type: string) {
    return magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;
}

function rarityLabel(rarity: string) {
    return itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;
}

// Generate SEO metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ magicItemId: string }>;
}): Promise<Metadata> {
  const { magicItemId } = await params;
  const item = getMagicItemById(Number(magicItemId));

  if (!item) {
    return {
      title: "Предмет не знайдено",
    };
  }

  const title = `${item.name} — ${typeLabel(item.itemType)}`;
  const description = getDescriptionSnippet(`${item.name} (${rarityLabel(item.rarity)}). ${item.description}`);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/magic-items/${magicItemId}`;

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

function MagicItemDetailCard({ item }: { item: MagicItemWithSpells }) {
  return (
    <div className="p-3 sm:p-6 break-words max-w-full overflow-hidden">
        <div className="flex items-start justify-between gap-2">
            <h1 className="flex-1 min-w-0 font-sans text-base sm:text-xl font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400 truncate">
            {item.name}
            </h1>
        </div>

        <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                    <span className="text-slate-300">{typeLabel(item.itemType)}</span>
                    <span className="text-slate-500">•</span>
                    <span className={`italic ${["RARE", "VERY_RARE", "LEGENDARY"].includes(item.rarity) ? "text-amber-400" : "text-slate-300"}`}>
                        {rarityLabel(item.rarity)}
                    </span>
                 </div>
                 {item.requiresAttunement && (
                 <div className="min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs text-teal-300/80 truncate">
                    Потребує налаштування
                 </div>
                 )}
            </div>
        </div>

      {/* Stats Grid */}
      {(item.bonusToAC || item.bonusToRangedDamage) && (
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-3">
             {item.bonusToAC && (
                <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Бонус до КБ</div>
                    <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">+{item.bonusToAC}</div>
                </div>
             )}
             {item.bonusToRangedDamage && (
                <div className="rounded-xl bg-slate-900/40 border border-white/5 p-2 sm:p-3 glass-panel">
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Рендж шкода</div>
                    <div className="mt-0.5 text-[11px] sm:text-sm text-slate-200">+{item.bonusToRangedDamage}</div>
                </div>
             )}
        </div>
      )}



      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 max-w-full overflow-hidden">
        <FormattedDescription content={item.description} className="text-slate-300 text-xs sm:text-base break-words" />
      </div>
    </div>
  );
}

// Main page component
export default async function MagicItemDetailPage({
  params,
}: {
  params: Promise<{ magicItemId: string }>;
}) {
  const { magicItemId } = await params;
  const item = getMagicItemById(Number(magicItemId));

  if (!item) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.05),transparent_50%)] overflow-x-hidden">
      {/* Header with back button */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/magic-items"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до предметів
          </Link>
        </div>
      </div>
      
      <div className="mx-auto max-w-2xl px-4 py-6">
        <MagicItemDetailCard item={item} />
      </div>
    </div>
  );
}
