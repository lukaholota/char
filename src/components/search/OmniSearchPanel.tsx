"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Command, Search, X } from "lucide-react";
import { OmniSearchResults } from "@/components/search/OmniSearchResults";
import { OmniSearchCategoryLinks } from "@/components/search/OmniSearchCategoryLinks";
import { useDeferredServerSearch } from "@/components/search/useDeferredServerSearch";
import type { OmniSearchCategory, OmniSearchItem } from "@/lib/omniSearchData";
import type { OmniSearchRow } from "@/lib/search/omniSearchRows";
import { buildOmniSearchPanelRows } from "@/lib/search/omniSearchPanelRows";
import { announceSearchNavigation } from "@/lib/search/search-navigation";
import {
  collectSearchCatalogs,
  findCatalogHref,
  findCatalogSearchTitle,
} from "@/lib/catalogs/catalog-registry";
import { searchUserPersAndFolders } from "@/server/db/pers-search-actions";
import { searchHomebrewEntries } from "@/server/db/homebrew-search-actions";
import { useActiveEdition } from "@/components/ui/PersEditionPin";
import { useNoAiHref } from "@/components/no-ai/NoAiModeProvider";
import type { Edition } from "@/rules/route-helpers";
import { cn } from "@/lib/utils";

type CategoryFilter = OmniSearchCategory | "ALL";

type Props = {
  onClose: () => void;
};

export function OmniSearchPanel({ onClose }: Props) {
  const router = useRouter();
  const buildHref = useNoAiHref();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const hasStartedNavigationRef = useRef(false);

  const edition = useActiveEdition();
  const ruleset = edition === "2024" ? "RULES_2024" : "RULES_2014";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const personalResults = useDeferredServerSearch(query, searchUserPersAndFolders);
  const homebrewResults = useDeferredServerSearch(
    query,
    useCallback((trimmed: string) => searchHomebrewEntries(trimmed, ruleset), [ruleset]),
  );

  const { rows, otherEdition } = useMemo(
    () => buildOmniSearchPanelRows({ query, ruleset, activeCategory, personalResults, homebrewResults }),
    [query, ruleset, activeCategory, personalResults, homebrewResults],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  useEffect(() => {
    scrollSelectedIntoView(scrollHostRef.current, selectedIndex);
  }, [selectedIndex, rows.length]);

  /// Б8: закривати діалог одразу після router.push відкладено — Dialog реагує на закриття,
  /// пушнувши window.history.back() для власного injected back-entry, і цей back() встигає
  /// спрацювати до того, як router.push закомітить свій pushState (той чекає на RSC-фетч
  /// сторінки). popstate від back() перехоплює роутер Next і скасовує ще незавершену навігацію
  /// — сторінка генерується на сервері, але користувача на неї не переносить. Замість цього
  /// чекаємо, поки React transition навколо router.push дійсно завершиться.
  useEffect(() => {
    if (hasStartedNavigationRef.current && !isNavigating) {
      hasStartedNavigationRef.current = false;
      announceSearchNavigation();
      onClose();
    }
  }, [isNavigating, onClose]);

  const navigateTo = useCallback(
    (href: string) => {
      if (hasStartedNavigationRef.current) return;
      hasStartedNavigationRef.current = true;
      startNavigation(() => {
        router.push(buildHref(href));
      });
    },
    [router, buildHref]
  );

  const handleSelect = useCallback(
    (item: OmniSearchItem) => {
      setPendingItemId(item.id);
      navigateTo(item.href);
    },
    [navigateTo]
  );

  const openCatalog = useCallback(
    (category: OmniSearchCategory) => {
      const href = findCatalogHref(category, edition);
      if (href) navigateTo(href);
    },
    [navigateTo, edition]
  );

  const showMoreOf = useCallback((category: OmniSearchCategory) => {
    setActiveCategory(category);
    inputRef.current?.focus();
  }, []);

  const activateRow = (row: OmniSearchRow | undefined) => {
    if (!row) return;
    if (row.kind === "item") handleSelect(row.item);
    else showMoreOf(row.category);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (rows.length > 0 ? (prev + 1) % rows.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (rows.length > 0 ? (prev - 1 + rows.length) % rows.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      activateRow(rows[selectedIndex]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <>
      <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
        <Search className="h-5 w-5 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Пошук по платформі D&D ${edition}…`}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-base focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Очистити запит"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <>
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
              <Command className="h-3 w-3" />K
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити пошук"
              className="sm:hidden p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <OmniSearchFilterTabs
        edition={edition}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        onOpenCatalog={openCatalog}
      />

      <div ref={scrollHostRef} className="px-3 flex-1 overflow-y-auto min-h-0 overscroll-contain">
        {query.trim() ? (
          <OmniSearchResults
            rows={rows}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            onShowMore={showMoreOf}
            query={query}
            edition={edition}
            otherEdition={otherEdition}
            pendingItemId={pendingItemId}
          />
        ) : (
          <OmniSearchCategoryLinks edition={edition} onOpenCatalog={openCatalog} />
        )}
      </div>

      <div className="px-4 py-2 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded border border-white/10">↑↓</kbd> навігація
          </span>
          <span>
            <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded border border-white/10">↵</kbd> вибрати
          </span>
          <span>
            <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded border border-white/10">esc</kbd> закрити
          </span>
        </div>
        <div>
          Редакція: <span className="font-semibold text-slate-400">{edition}</span>
        </div>
      </div>
    </>
  );
}

type FilterTabsProps = {
  edition: Edition;
  activeCategory: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
  onOpenCatalog: (category: OmniSearchCategory) => void;
};

/// Таби йдуть із реєстру за редакцією: каталог без адреси в цій редакції таба не має.
function OmniSearchFilterTabs({ edition, activeCategory, onSelect, onOpenCatalog }: FilterTabsProps) {
  const tabs: Array<{ key: CategoryFilter; label: string }> = [
    { key: "ALL", label: "Всі" },
    ...collectSearchCatalogs(edition).map((entry) => ({
      key: entry.slug,
      label: findCatalogSearchTitle(entry.slug, edition),
    })),
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
            activeCategory === tab.key
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          )}
        >
          {tab.label}
        </button>
      ))}
      {activeCategory !== "ALL" && (
        <button
          type="button"
          onClick={() => onOpenCatalog(activeCategory)}
          className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap text-arcane-300 border border-arcane-500/40 bg-arcane-500/10 hover:bg-arcane-500/20 transition-all"
        >
          Відкрити каталог
          <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function scrollSelectedIntoView(host: HTMLDivElement | null, selectedIndex: number) {
  const selected = host?.querySelector<HTMLElement>(`[data-omni-index="${selectedIndex}"]`);
  selected?.scrollIntoView?.({ block: "nearest" });
}
