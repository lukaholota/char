"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Scale, Search } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { getRuleCategoryVisual } from "@/components/catalogs/catalog-visuals";
import { TocBranch } from "@/components/rules/RulesCategoryClient";
import { Input } from "@/components/ui/input";
import { buildDraftArticleHref, findRulesPath, type DraftGroup, type SectionTocEntry } from "@/lib/optimization/article-view";
import type { OptimizationRuleset } from "@/lib/optimization/types";
import { cn } from "@/lib/utils";
import { findAccentVariant, findEditionAccent } from "@/styles/edition-accent";
import { buildRpgbotCtaProps, type RpgbotSurface } from "@/lib/monitoring/rpgbot-analytics-model";

export type RuleCategoryLink = { key: string; title: string };

type ArticleSidebarProps = {
  ruleset: OptimizationRuleset;
  currentSlug?: string;
  groups: DraftGroup[];
  sectionEntries: SectionTocEntry[];
  ruleCategories: RuleCategoryLink[];
  search: string;
  onSearchChange: (value: string) => void;
  onNavigate: () => void;
};

export function ArticleSidebar({ ruleset, currentSlug, groups, sectionEntries, ruleCategories, search, onSearchChange, onNavigate }: ArticleSidebarProps) {
  const is2024 = ruleset === "RULES_2024";
  const [isOpen, setIsOpen] = useState(true);
  const query = search.trim().toLowerCase();
  const matches = (title: string) => !query || title.toLowerCase().includes(query);
  const visibleEntries = filterSectionEntries(sectionEntries, matches);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      summaries: group.summaries.filter((summary) =>
        matches(summary.titleUk) || matches(summary.titleEn) || (summary.slug === currentSlug && visibleEntries.length > 0)),
    }))
    .filter((group) => group.summaries.length > 0)
    .sort((left, right) => Number(hasSlug(right, currentSlug)) - Number(hasSlug(left, currentSlug)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 pr-10 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:pr-0">
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-arcane-400" />
          Зміст довідника
        </span>
        <span className="text-[11px] text-slate-500 font-mono">{is2024 ? "2024" : "2014"}</span>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Пошук у статтях..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 pl-8 text-xs bg-slate-900/80 border-white/10 rounded-xl"
        />
      </div>

      <nav aria-label="Зміст довідника" className="space-y-2 pt-1">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-200",
            findAccentVariant(is2024, { prism: "bg-prism-500/15 text-prism-300 border border-prism-500/30", arcane: "bg-arcane-500/15 text-arcane-300 border border-arcane-500/30" })
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Scale className="h-4 w-4 shrink-0" />
            <span className="truncate">Аналітика RPGbot</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400", isOpen && "-rotate-180")} />
        </button>

        {isOpen ? (
          <div className="ml-3 space-y-3 border-l border-white/10 pb-1 pl-3 pt-1.5">
            {visibleGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
                {group.summaries.map((summary) => (
                  <div key={summary.articleId} className="space-y-1.5">
                    <ArticleLink
                      href={buildDraftArticleHref(summary.ruleset, summary.slug)} slug={summary.slug} title={summary.titleUk}
                      isCurrent={summary.slug === currentSlug} ruleset={ruleset} onNavigate={onNavigate} surface={currentSlug ? "article_reader" : "article_index"}
                    />
                    {summary.slug === currentSlug ? <TocBranch entries={visibleEntries} onNavigate={onNavigate} /> : null}
                  </div>
                ))}
              </div>
            ))}
            {visibleGroups.length === 0 ? <p className="px-3 py-1.5 text-[11px] text-slate-500">Нічого не знайдено.</p> : null}
          </div>
        ) : null}

        <RuleCategoryLinks ruleset={ruleset} ruleCategories={ruleCategories} onNavigate={onNavigate} />
      </nav>
    </div>
  );
}

function hasSlug(group: DraftGroup, slug: string | undefined): boolean {
  return group.summaries.some((summary) => summary.slug === slug);
}

function filterSectionEntries(entries: SectionTocEntry[], matches: (title: string) => boolean): SectionTocEntry[] {
  return entries.flatMap((entry) => {
    const subsections = matches(entry.title) ? entry.subsections : entry.subsections.filter((sub) => matches(sub.title));
    return matches(entry.title) || subsections.length > 0 ? [{ ...entry, subsections }] : [];
  });
}

function ArticleLink({ href, slug, title, isCurrent, ruleset, onNavigate, surface }: { href: string; slug: string; title: string; isCurrent: boolean; ruleset: OptimizationRuleset; onNavigate: () => void; surface: RpgbotSurface }) {
  const accent = findEditionAccent(ruleset === "RULES_2024" ? "2024" : "2014").solid;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      {...buildRpgbotCtaProps("sidebar_article", surface, slug)}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
        isCurrent
          ? cn(accent.border, accent.fill, accent.text)
          : "border-white/10 bg-white/[0.06] text-slate-100 hover:border-white/25 hover:bg-white/[0.12] active:bg-white/[0.16]"
      )}
    >
      <span className="truncate">{title}</span>
      <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-500" />
    </Link>
  );
}

function RuleCategoryLinks({ ruleset, ruleCategories, onNavigate }: { ruleset: OptimizationRuleset; ruleCategories: RuleCategoryLink[]; onNavigate: () => void }) {
  const rulesPath = findRulesPath(ruleset);
  return (
    <div className="space-y-1 border-t border-white/10 pt-3">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Довідник правил</p>
      {ruleCategories.map((category) => {
        const Icon = getRuleCategoryVisual(category.key).icon;
        return (
          <Link
            key={category.key}
            href={`${rulesPath}/${category.key}`}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{category.title}</span>
          </Link>
        );
      })}
    </div>
  );
}
