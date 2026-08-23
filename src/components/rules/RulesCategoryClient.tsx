"use client";

import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { useState, useMemo } from "react";
import { Ruleset } from "@prisma/client";
import {
  RuleCategory,
  RuleArticle,
  ConditionData,
} from "@/lib/rulesData";
import { getRuleCategoryVisual } from "@/components/catalogs/catalog-visuals";
import { RuleArticleCard } from "@/components/rules/RuleArticleCard";
import { ConditionsGrid } from "@/components/rules/ConditionsGrid";
import { ChevronRight, ArrowLeft, Search, BookOpen, Menu, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  category: RuleCategory;
  allCategories: RuleCategory[];
  articles: RuleArticle[];
  conditions?: ConditionData[];
  ruleset?: Ruleset;
};

export function RulesCategoryClient({
  category,
  allCategories,
  articles,
  conditions = [],
  ruleset = "RULES_2014",
}: Props) {
  const is2024 = ruleset === "RULES_2024";
  const [search, setSearch] = useState("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const basePath = is2024 ? "/2024/rules" : "/rules";

  const visual = getRuleCategoryVisual(category.key);
  const Icon = visual.icon;

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

  return (
    <div className="min-h-[100dvh] w-full p-4 sm:p-8 pt-6 sm:pt-10 pb-36 sm:pb-24 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] max-w-7xl mx-auto space-y-8">
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

          {/* Mobile Table of Contents Toggle Button */}
          <button
            onClick={() => setMobileTocOpen(!mobileTocOpen)}
            className="inline-flex lg:hidden items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 self-start"
          >
            {mobileTocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>Зміст довідника</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Comprehensive Left Sidebar ToC + Right Articles Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Comprehensive Sidebar ToC (Desktop sticky / Mobile drawer) */}
        <aside
          className={cn(
            "lg:col-span-4 space-y-4",
            mobileTocOpen ? "block" : "hidden lg:block"
          )}
        >
          <div className="sticky top-20 rounded-3xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-2xl shadow-xl space-y-4 max-h-[calc(100dvh-6rem)] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-teal-400" />
                Зміст довідника
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {is2024 ? "2024" : "2014"}
              </span>
            </div>

            {/* Quick Article Search inside category */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Пошук у розділі..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-900/80 border-white/10 rounded-xl"
              />
            </div>

            {/* Categories & Subsections Tree */}
            <nav className="space-y-3 pt-1">
              {allCategories.map((c) => {
                const isCurrentCategory = c.key === category.key;
                const catVisual = getRuleCategoryVisual(c.key);
                const CatIcon = catVisual.icon;

                return (
                  <div key={c.key} className="space-y-1">
                    {/* Category root link */}
                    <Link
                      href={`${basePath}/${c.key}`}
                      onClick={() => setMobileTocOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200",
                        isCurrentCategory
                          ? is2024
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <CatIcon className="h-4 w-4" />
                        <span>{c.title}</span>
                      </span>
                      {isCurrentCategory && (
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                      )}
                    </Link>

                    {/* Sub-articles list when active */}
                    {isCurrentCategory && (
                      <div className="ml-4 pl-3 border-l border-white/10 space-y-1 pt-1">
                        {category.key === "conditions" && (
                          <a
                            href="#conditions-grid"
                            onClick={() => setMobileTocOpen(false)}
                            className="block rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                          >
                            ⚡ Сітка станів
                          </a>
                        )}

                        {filteredArticles.map((art) => (
                          <div key={art.id} className="space-y-0.5">
                            <a
                              href={`#${art.slug}`}
                              onClick={() => setMobileTocOpen(false)}
                              className="block rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors truncate font-medium"
                            >
                              {art.title}
                            </a>
                            {/* Inner Subsections anchor jumps */}
                            <div className="ml-2 space-y-0.5">
                              {art.subsections.map((sub) => (
                                <a
                                  key={sub.id}
                                  href={`#${sub.id}`}
                                  onClick={() => setMobileTocOpen(false)}
                                  className="block rounded-lg px-2 py-0.5 text-[11px] text-slate-400 hover:text-teal-300 hover:bg-white/5 transition-colors truncate"
                                >
                                  • {sub.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
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

          {filteredArticles.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center text-slate-400">
              Статей за запитом &ldquo;{search}&rdquo; не знайдено.
            </div>
          )}
        </main>
      </div>

      {/* Bottom Clearance */}
      <div className="h-24 sm:h-12 w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
}
