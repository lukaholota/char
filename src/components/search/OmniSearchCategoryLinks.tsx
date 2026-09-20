"use client";

import { ArrowUpRight } from "lucide-react";
import type { Edition } from "@/rules/route-helpers";
import {
  collectSearchCatalogs,
  findCatalogHref,
  findCatalogSearchTitle,
  type CatalogSlug,
} from "@/lib/catalogs/catalog-registry";

type Props = {
  edition: Edition;
  onOpenCatalog: (category: CatalogSlug) => void;
};

/// Б3 з KR13.4: з вікна пошуку не було як потрапити в самі каталоги — «це даремно».
/// Плитки йдуть із реєстру за редакцією, тож каталог однієї редакції (інфузії, бастіони)
/// зʼявляється лише там, де має адресу.
export function OmniSearchCategoryLinks({ edition, onOpenCatalog }: Props) {
  return (
    <div className="py-4">
      <p className="px-1 text-xs text-slate-400">
        Введіть запит або перейдіть одразу в каталог:
      </p>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {collectSearchCatalogs(edition).map((entry) => (
          <button
            key={entry.slug}
            type="button"
            onClick={() => onOpenCatalog(entry.slug)}
            title={findCatalogHref(entry.slug, edition) ?? undefined}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200 transition-all"
          >
            <span className="truncate">{findCatalogSearchTitle(entry.slug, edition)}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 px-1 text-xs text-slate-500">
        <span>Спробуйте:</span>
        <span className="text-amber-400/80">«Вогнекуля»</span>
        <span>•</span>
        <span className="text-amber-400/80">«бій верхи»</span>
        <span>•</span>
        <span className="text-amber-400/80">«бонусна дія»</span>
        <span>•</span>
        <span className="text-amber-400/80">«Отруєний»</span>
      </div>
    </div>
  );
}
