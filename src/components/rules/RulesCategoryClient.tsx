"use client";

import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useCallback, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Ruleset } from "@prisma/client";
import {
  RuleCategory,
  RuleArticle,
  ConditionData,
} from "@/lib/rulesData";
import { GeneratedTrapHazard } from "@/lib/trapHazardTypes";
import { GeneratedObjectStatblock } from "@/lib/objectTypes";
import { RulesTocIndex, TocArticle } from "@/lib/rulesToc";
import { getRuleCategoryVisual } from "@/components/catalogs/catalog-visuals";
import { RuleArticleCard } from "@/components/rules/RuleArticleCard";
import { ConditionsGrid } from "@/components/rules/ConditionsGrid";
import { TrapHazardStatblockCard } from "@/components/rules/TrapHazardStatblockCard";
import { ObjectStatblockCard } from "@/components/rules/ObjectStatblockCard";
import { ChevronRight, ChevronDown, ArrowLeft, Search, BookOpen, Menu, X, Skull } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MENU_PANEL } from "@/components/ui/menu-panel";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cn } from "@/lib/utils";

type Props = {
  category: RuleCategory;
  allCategories: RuleCategory[];
  tocIndex: RulesTocIndex;
  articles: RuleArticle[];
  conditions?: ConditionData[];
  trapsHazards?: GeneratedTrapHazard[];
  objects?: GeneratedObjectStatblock[];
  ruleset?: Ruleset;
};

export function RulesCategoryClient({
  category,
  allCategories,
  tocIndex,
  articles,
  conditions = [],
  trapsHazards = [],
  objects = [],
  ruleset = "RULES_2014",
}: Props) {
  const is2024 = ruleset === "RULES_2024";
  const [search, setSearch] = useState("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const basePath = is2024 ? "/2024/rules" : "/rules";

  const visual = getRuleCategoryVisual(category.key);
  const Icon = visual.icon;

  const closeMobileToc = useCallback(() => setMobileTocOpen(false), []);
  useEscapeKey(closeMobileToc, { enabled: mobileTocOpen });

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.engTitle.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.subsections.some((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))
    );
  }, [articles, search]);

  const filteredTrapsHazards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trapsHazards;
    return trapsHazards.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.engTitle.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [trapsHazards, search]);

  const filteredObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return objects;
    return objects.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.engTitle.toLowerCase().includes(q) ||
        o.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [objects, search]);

  const tocContent = (
    <TableOfContents
      category={category}
      allCategories={allCategories}
      tocIndex={tocIndex}
      filteredArticles={filteredArticles}
      filteredTrapsHazards={filteredTrapsHazards}
      filteredObjects={filteredObjects}
      basePath={basePath}
      is2024={is2024}
      search={search}
      onSearchChange={setSearch}
      onNavigate={closeMobileToc}
    />
  );

  return (
    <>
      <MobileTocCurtain open={mobileTocOpen} onClose={closeMobileToc}>
        {tocContent}
      </MobileTocCurtain>

      <div className="min-h-[100dvh] shrink-0 w-full p-4 sm:p-8 pt-6 sm:pt-10 pb-36 sm:pb-24 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] max-w-7xl mx-auto space-y-8">
        <MobileTocBar onOpen={() => setMobileTocOpen(true)} />

        {/* Breadcrumbs & Hub Link */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Link href={is2024 ? "/2024" : "/"} className="hover:text-slate-200 transition-colors">
              Головна
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={basePath} className="hover:text-slate-200 transition-colors">
              Довідник правил
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-200 font-semibold">{category.title}</span>
          </div>

          <Link
            href={basePath}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Всі розділи
          </Link>
        </div>

        {/* Category Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-md",
                  visual.iconWrap,
                  visual.iconColor
                )}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-rpg-display text-3xl sm:text-4xl text-white tracking-wide">
                    {category.title}
                  </h1>
                  {is2024 && (
                    <span className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold uppercase text-amber-300">
                      2024
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-sans">
                  {category.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Comprehensive Left Sidebar ToC + Right Articles Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-6 rounded-3xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-2xl shadow-xl space-y-4 max-h-[calc(100dvh-3rem)] overflow-y-auto">
              {tocContent}
            </div>
          </aside>

          {/* Right Articles Stream */}
          <main className="lg:col-span-8 space-y-8">
            {category.key === "conditions" && conditions.length > 0 && (
              <section id="conditions-grid" className="scroll-mt-24 space-y-4">
                <h2 className="font-rpg-display text-2xl text-slate-100 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  Каталог станів D&D
                </h2>
                <ConditionsGrid conditions={conditions} is2024={is2024} />
              </section>
            )}

            {filteredArticles.map((article) => (
              <RuleArticleCard key={article.id} article={article} />
            ))}

            {category.key === "gamemaster" && filteredTrapsHazards.length > 0 && (
              <section id="traps-hazards-catalog" className="scroll-mt-24 space-y-6">
                <h2 className="font-rpg-display text-2xl text-slate-100 flex items-center gap-2">
                  <Skull className="h-5 w-5 text-emerald-400" />
                  Пастки й небезпеки поза SRD
                </h2>
                {filteredTrapsHazards.map((trapHazard) => (
                  <TrapHazardStatblockCard key={trapHazard.id} article={trapHazard} />
                ))}
              </section>
            )}

            {category.key === "gamemaster" && filteredObjects.length > 0 && (
              <section id="objects-catalog" className="scroll-mt-24 space-y-6">
                <h2 className="font-rpg-display text-2xl text-slate-100 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  Об&rsquo;єкти поза SRD
                </h2>
                {filteredObjects.map((object) => (
                  <ObjectStatblockCard key={object.id} article={object} />
                ))}
              </section>
            )}

            {filteredArticles.length === 0 && filteredTrapsHazards.length === 0 && filteredObjects.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center text-slate-400">
                Статей за запитом &ldquo;{search}&rdquo; не знайдено.
              </div>
            )}
          </main>
        </div>

        {/* Bottom Clearance */}
        <div className="h-24 sm:h-12 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>
    </>
  );
}

/// На телефоні зміст має бути під рукою на будь-якій глибині статті, тому кнопка живе не в шапці
/// розділу, а в смужці, що лишається зверху при прокрутці.
function MobileTocBar({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 -mt-6 border-b border-white/10 bg-slate-950/75 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:-mt-10 sm:px-8 lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
      >
        <Menu className="h-4 w-4" />
        <span>Зміст довідника</span>
      </button>
    </div>
  );
}

function MobileTocCurtain({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="toc-overlay"
            className="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : 0.18 } }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.14 } }}
            onClick={onClose}
          />

          <motion.div
            key="toc-curtain"
            className="fixed inset-x-0 top-0 z-[9001] max-h-[85dvh] overflow-y-auto overscroll-contain lg:hidden"
            initial={{ y: "-100%" }}
            animate={{ y: 0, transition: { duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ y: "-100%", transition: { duration: reduceMotion ? 0 : 0.2 } }}
          >
            <div className={cn(MENU_PANEL, "rounded-t-none border-t-0")}>
              <div className="relative space-y-4 p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрити зміст"
                  className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-10 rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                {children}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

type TocLinkEntry = {
  id: string;
  title: string;
  href: string;
  samePage: boolean;
  subsections: { id: string; title: string; href: string; samePage: boolean }[];
};

function TableOfContents({
  category,
  allCategories,
  tocIndex,
  filteredArticles,
  filteredTrapsHazards,
  filteredObjects,
  basePath,
  is2024,
  search,
  onSearchChange,
  onNavigate,
}: {
  category: RuleCategory;
  allCategories: RuleCategory[];
  tocIndex: RulesTocIndex;
  filteredArticles: RuleArticle[];
  filteredTrapsHazards: GeneratedTrapHazard[];
  filteredObjects: GeneratedObjectStatblock[];
  basePath: string;
  is2024: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: () => void;
}) {
  const [expandedKey, setExpandedKey] = useState<string>(category.key);
  const reduceMotion = useReducedMotion();

  const toggleCategory = (key: string) => setExpandedKey((current) => (current === key ? "" : key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 pr-10 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:pr-0">
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-arcane-400" />
          Зміст довідника
        </span>
        <span className="text-[11px] text-slate-500 font-mono">{is2024 ? "2024" : "2014"}</span>
      </div>

      {/* Quick Article Search inside category */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Пошук у розділі..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs bg-slate-900/80 border-white/10 rounded-xl"
        />
      </div>

      {/* Categories & Subsections Tree */}
      <nav className="space-y-2 pt-1">
        {allCategories.map((c) => {
          const isCurrentCategory = c.key === category.key;
          const isExpanded = c.key === expandedKey;
          const catVisual = getRuleCategoryVisual(c.key);
          const CatIcon = catVisual.icon;
          const entries = isCurrentCategory
            ? buildCurrentEntries(category.key, filteredArticles, filteredTrapsHazards, filteredObjects)
            : buildOtherEntries(`${basePath}/${c.key}`, tocIndex[c.key] ?? []);

          return (
            <div key={c.key} className="space-y-1">
              {/* Рядок розділу нікуди не веде — він лише розкриває й закриває свій список */}
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => toggleCategory(c.key)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-200",
                  isCurrentCategory
                    ? is2024
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "bg-arcane-500/15 text-arcane-300 border border-arcane-500/30"
                    : isExpanded
                    ? "border border-white/15 bg-white/10 text-white"
                    : "border border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <CatIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300",
                    isExpanded && "-rotate-180"
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    key="branch"
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                      transition: {
                        height: { duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.06 },
                      },
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                      transition: {
                        height: { duration: reduceMotion ? 0 : 0.24, ease: [0.4, 0, 1, 1] },
                        opacity: { duration: reduceMotion ? 0 : 0.12 },
                      },
                    }}
                  >
                    <div className="ml-3 space-y-1.5 border-l border-white/10 pb-1 pl-3 pt-1.5">
                      <TocBranch entries={entries} onNavigate={onNavigate} />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/// Відкритий розділ уже на сторінці — його пункти це якорі, і саме їх фільтрує пошук у розділі.
function buildCurrentEntries(
  categoryKey: string,
  articles: RuleArticle[],
  trapsHazards: GeneratedTrapHazard[],
  objects: GeneratedObjectStatblock[]
): TocLinkEntry[] {
  const entries: TocLinkEntry[] = articles.map((article) => ({
    id: article.id,
    title: article.title,
    href: `#${article.slug}`,
    samePage: true,
    subsections: article.subsections.map((sub) => ({
      id: sub.id,
      title: sub.title,
      href: `#${sub.id}`,
      samePage: true,
    })),
  }));

  if (categoryKey === "conditions") {
    return [
      {
        id: "conditions-grid",
        title: "Сітка станів",
        href: "#conditions-grid",
        samePage: true,
        subsections: [],
      },
      ...entries,
    ];
  }

  if (categoryKey === "gamemaster") {
    return [
      ...entries,
      ...trapsHazards.map((trapHazard) => ({
        id: trapHazard.id,
        title: trapHazard.title,
        href: `#${trapHazard.slug}`,
        samePage: true,
        subsections: [],
      })),
      ...objects.map((object) => ({
        id: object.id,
        title: object.title,
        href: `#${object.slug}`,
        samePage: true,
        subsections: [],
      })),
    ];
  }

  return entries;
}

/// Чужий розділ живе на іншій сторінці, тож кожен його пункт — повна адреса з якорем.
function buildOtherEntries(categoryHref: string, articles: TocArticle[]): TocLinkEntry[] {
  return articles.map((article) => ({
    id: article.slug,
    title: article.title,
    href: `${categoryHref}#${article.slug}`,
    samePage: false,
    subsections: article.subsections.map((sub) => ({
      id: sub.id,
      title: sub.title,
      href: `${categoryHref}#${sub.id}`,
      samePage: false,
    })),
  }));
}

function TocBranch({
  entries,
  onNavigate,
}: {
  entries: TocLinkEntry[];
  onNavigate: () => void;
}) {
  if (!entries.length) {
    return <p className="px-3 py-1.5 text-[11px] text-slate-500">Розділ ще не наповнений.</p>;
  }

  return (
    <>
      {entries.map((entry) => (
        <div key={entry.id} className="space-y-1">
          <TocLink
            href={entry.href}
            samePage={entry.samePage}
            onNavigate={onNavigate}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[13px] font-semibold text-slate-100 transition-colors hover:border-white/25 hover:bg-white/[0.12] active:bg-white/[0.16]"
          >
            <span className="truncate">{entry.title}</span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-500" />
          </TocLink>

          {entry.subsections.map((sub) => (
            <TocLink
              key={sub.id}
              href={sub.href}
              samePage={sub.samePage}
              onNavigate={onNavigate}
              className="ml-3 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]"
            >
              <span className="h-1 w-1 shrink-0 rounded-full bg-arcane-400/80" />
              <span className="truncate">{sub.title}</span>
            </TocLink>
          ))}
        </div>
      ))}
    </>
  );
}

/// Якір у межах відкритої сторінки має лишатися звичайним `<a>`: `next/link` на самому хеші
/// перезапускає маршрут замість того, щоб просто прокрутити.
function TocLink({
  href,
  samePage,
  onNavigate,
  className,
  children,
}: {
  href: string;
  samePage: boolean;
  onNavigate: () => void;
  className: string;
  children: React.ReactNode;
}) {
  if (samePage) {
    return (
      <a href={href} onClick={onNavigate} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}
