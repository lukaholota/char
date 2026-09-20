import { Flag, Plus } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { buildHomebrewCatalogHref, type HomebrewSort } from "@/lib/logic/homebrew-catalog";
import type { HomebrewKind } from "@/lib/logic/homebrew-input";
import { cn } from "@/lib/utils";

type Props = { kind: HomebrewKind; is2024: boolean; sort: HomebrewSort; isModerator: boolean };

export function HomebrewCatalogHeader({ kind, is2024, sort, isModerator }: Props) {
  const hrefWith = (next: Partial<Omit<Props, "isModerator">>) => buildHomebrewCatalogHref({ kind, is2024, sort, ...next });

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented items={[
          { href: hrefWith({ kind: "SPELL" }), label: "Заклинання", isActive: kind === "SPELL" },
          { href: hrefWith({ kind: "CREATURE" }), label: "Істоти", isActive: kind === "CREATURE" },
        ]} />
        <Segmented items={[
          { href: hrefWith({ is2024: false }), label: "2014", isActive: !is2024 },
          { href: hrefWith({ is2024: true }), label: "2024", isActive: is2024 },
        ]} />
        <Segmented items={[
          { href: hrefWith({ sort: "TOP" }), label: "Найкращі", isActive: sort === "TOP" },
          { href: hrefWith({ sort: "NEW" }), label: "Нові", isActive: sort === "NEW" },
        ]} />
        <Link href={`/homebrew/new?kind=${kind}&edition=${is2024 ? "2024" : "2014"}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 sm:min-h-10">
          <Plus className="h-4 w-4" />
          {kind === "CREATURE" ? "Додати істоту" : "Додати заклинання"}
        </Link>
        {isModerator ? (
          <Link href="/homebrew/reports" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm text-slate-300 underline-offset-2 hover:underline sm:min-h-10">
            <Flag className="h-4 w-4" />
            Скарги
          </Link>
        ) : null}
      </div>
      <p className="text-xs text-slate-400">Вміст від гравців. Голосуйте за вдале й узгоджуйте з майстром, перш ніж брати за стіл.</p>
    </div>
  );
}

function Segmented({ items }: { items: Array<{ href: string; label: string; isActive: boolean }> }) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.isActive ? "page" : undefined} className={cn("flex min-h-9 items-center rounded-lg px-3 text-sm transition", item.isActive ? "bg-amber-500/20 font-semibold text-amber-100" : "text-slate-300 hover:text-slate-100")}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
