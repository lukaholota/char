"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Command, Search, X } from "lucide-react";
import { OmniSearchResults } from "@/components/search/OmniSearchResults";
import { OmniSearchCategoryLinks } from "@/components/search/OmniSearchCategoryLinks";
import {
  findCategoryCatalogHref,
  searchOmniIndex,
  OMNI_CATEGORY_LABELS,
  type OmniSearchCategory,
  type OmniSearchItem,
} from "@/lib/omniSearchData";
import { searchUserPersAndFolders, type UserSearchHit } from "@/server/db/pers-search-actions";
import { getEditionFromPathname } from "@/rules/route-helpers";
import { cn } from "@/lib/utils";

const FILTER_TABS: Array<{ key: OmniSearchCategory | "ALL"; label: string }> = [
  { key: "ALL", label: "Всі" },
  { key: "characters", label: OMNI_CATEGORY_LABELS.characters },
  { key: "spells", label: OMNI_CATEGORY_LABELS.spells },
  { key: "magic-items", label: OMNI_CATEGORY_LABELS["magic-items"] },
  { key: "rules", label: OMNI_CATEGORY_LABELS.rules },
  { key: "feats", label: OMNI_CATEGORY_LABELS.feats },
  { key: "bestiary", label: OMNI_CATEGORY_LABELS.bestiary },
  { key: "weapons", label: OMNI_CATEGORY_LABELS.weapons },
  { key: "armor", label: OMNI_CATEGORY_LABELS.armor },
  { key: "invocations", label: OMNI_CATEGORY_LABELS.invocations },
  { key: "backgrounds", label: OMNI_CATEGORY_LABELS.backgrounds },
  { key: "classes", label: OMNI_CATEGORY_LABELS.classes },
  { key: "races", label: OMNI_CATEGORY_LABELS.races },
];

const PERSONAL_SEARCH_DELAY_MS = 200;
const MIN_PERSONAL_QUERY_LENGTH = 2;

type Props = {
  onClose: () => void;
};

export function OmniSearchPanel({ onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<OmniSearchCategory | "ALL">("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [personalResults, setPersonalResults] = useState<OmniSearchItem[]>([]);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const hasStartedNavigationRef = useRef(false);

  const edition = getEditionFromPathname(pathname);
  const ruleset = edition === "2024" ? "RULES_2024" : "RULES_2014";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_PERSONAL_QUERY_LENGTH) {
      setPersonalResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      searchUserPersAndFolders(trimmed)
        .then((hits) => {
          if (active) setPersonalResults(hits.map(toPersonalItem));
        })
        .catch(() => {
          if (active) setPersonalResults([]);
        });
    }, PERSONAL_SEARCH_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const results = useMemo(() => {
    const staticResults = searchOmniIndex(query, ruleset, activeCategory);
    const showPersonal = activeCategory === "ALL" || activeCategory === "characters";
    return showPersonal ? [...staticResults, ...personalResults] : staticResults;
  }, [query, ruleset, activeCategory, personalResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  useEffect(() => {
    scrollSelectedIntoView(scrollHostRef.current, selectedIndex);
  }, [selectedIndex, results.length]);

  /// Б8: закривати діалог одразу після router.push відкладено — Dialog реагує на закриття,
  /// пушнувши window.history.back() для власного injected back-entry, і цей back() встигає
  /// спрацювати до того, як router.push закомітить свій pushState (той чекає на RSC-фетч
  /// сторінки). popstate від back() перехоплює роутер Next і скасовує ще незавершену навігацію
  /// — сторінка генерується на сервері, але користувача на неї не переносить. Замість цього
  /// чекаємо, поки React transition навколо router.push дійсно завершиться.
  useEffect(() => {
    if (hasStartedNavigationRef.current && !isNavigating) {
      hasStartedNavigationRef.current = false;
      onClose();
    }
  }, [isNavigating, onClose]);

  const navigateTo = useCallback(
    (href: string) => {
      if (hasStartedNavigationRef.current) return;
      hasStartedNavigationRef.current = true;
      startNavigation(() => {
        router.push(href);
      });
    },
    [router]
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
      navigateTo(findCategoryCatalogHref(category, ruleset));
    },
    [navigateTo, ruleset]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
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
          placeholder={`Пошук по платформі D&D ${edition === "2024" ? "2024" : "2014"}…`}
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

      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 overflow-x-auto no-scrollbar">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key)}
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
            onClick={() => openCatalog(activeCategory)}
            className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap text-arcane-300 border border-arcane-500/40 bg-arcane-500/10 hover:bg-arcane-500/20 transition-all"
          >
            Відкрити каталог
            <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div ref={scrollHostRef} className="px-3 flex-1 overflow-y-auto min-h-[160px]">
        {query.trim() ? (
          <OmniSearchResults
            results={results}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            query={query}
            pendingItemId={pendingItemId}
          />
        ) : (
          <OmniSearchCategoryLinks ruleset={ruleset} onOpenCatalog={openCatalog} />
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
          Редакція: <span className="font-semibold text-slate-400">{edition === "2024" ? "2024" : "2014"}</span>
        </div>
      </div>
    </>
  );
}

function scrollSelectedIntoView(host: HTMLDivElement | null, selectedIndex: number) {
  const selected = host?.querySelector<HTMLElement>(`[data-omni-index="${selectedIndex}"]`);
  selected?.scrollIntoView({ block: "nearest" });
}

function toPersonalItem(hit: UserSearchHit): OmniSearchItem {
  return {
    id: `${hit.kind}-${hit.id}`,
    title: hit.title,
    category: "characters",
    categoryLabel: OMNI_CATEGORY_LABELS.characters,
    href: hit.href,
    badge: hit.subtitle,
  };
}
