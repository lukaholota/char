import { Plus, Users } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { buildHomebrewCatalogHref } from "@/lib/logic/homebrew-catalog";

type Props = { kind: "SPELL" | "CREATURE"; edition: "2014" | "2024"; count: number };

export function HomebrewCatalogBanner({ kind, edition, count }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-0.5 text-xs text-slate-400">
      <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className="min-w-0 flex-1">Показано хоумбрю спільноти: {count}</span>
      <Link href={buildHomebrewCatalogHref({ kind, is2024: edition === "2024" })} className="text-slate-300 underline-offset-2 hover:underline">
        Лише хоумбрю
      </Link>
      <Link href={`/homebrew/new?kind=${kind}&edition=${edition}`} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/25 px-2 py-1 text-amber-200/80 transition hover:border-amber-400/40 hover:text-amber-100">
        <Plus className="h-3 w-3" />
        Додати
      </Link>
    </div>
  );
}
