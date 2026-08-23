import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isRules2024Allowed } from "@/rules/access";
import { getAllMagicItems, getMagicItemById, type MagicItemWithSpells } from "@/lib/magicItemsData";
import { magicItemTypeTranslations, itemRarityTranslations } from "@/lib/refs/translation";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export async function generateStaticParams() {
  const items = getAllMagicItems("RULES_2024");
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ magicItemId: string }>;
}): Promise<Metadata> {
  const { magicItemId } = await params;
  const item = getMagicItemById(Number(magicItemId), "RULES_2024");

  if (!item) {
    return {
      title: "Предмет не знайдено",
    };
  }

  const title = `${item.name} — ${typeLabel(item.itemType)} (2024)`;
  const description = getDescriptionSnippet(`${item.name} (${rarityLabel(item.rarity)}). ${item.description}`);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://char.holota.family"}/2024/magic-items/${magicItemId}`;

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
    <div className="glass-card border border-white/10 bg-slate-950/60 p-3 shadow-[0_0_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/20 backdrop-blur-xl sm:p-6 break-words max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <h1 className="flex-1 min-w-0 font-sans text-base sm:text-xl font-semibold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 truncate">
          {item.name}
        </h1>
        {item.engName && (
          <div className="text-sm font-mono text-slate-500 hidden sm:block shrink-0">[{item.engName}]</div>
        )}
      </div>
      {item.engName && (
        <div className="text-xs font-mono text-slate-500 sm:hidden mt-0.5 mb-2">{item.engName}</div>
      )}

      <div className="mt-2 rounded-xl bg-white/5 p-2 glass-panel border border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="text-slate-300">{typeLabel(item.itemType)}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{rarityLabel(item.rarity)}</span>
          </div>

          <div className="min-w-0 max-w-[40%] flex-shrink text-right text-[10px] sm:text-xs text-amber-300 truncate">
            {item.requiresAttunement ? "Потребує налаштування" : "Без налаштування"}
          </div>
        </div>
      </div>

      <div className="mt-3 glass-panel rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 max-w-full overflow-hidden">
        <FormattedDescription content={item.description} className="text-slate-300 text-xs sm:text-base break-words" />
      </div>
    </div>
  );
}

export default async function MagicItemDetailPage({
  params,
}: {
  params: Promise<{ magicItemId: string }>;
}) {
  const session = await auth();
  if (!isRules2024Allowed(session?.user)) {
    redirect("/magic-items");
  }

  const { magicItemId } = await params;
  const item = getMagicItemById(Number(magicItemId), "RULES_2024");

  if (!item) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.05),transparent_50%)] overflow-x-hidden">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Link
            href="/2024/magic-items"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад до предметів 2024
          </Link>
        </div>
      </div>
      
      <div className="mx-auto max-w-2xl px-4 py-6">
        <MagicItemDetailCard item={item} />
      </div>
    </div>
  );
}
