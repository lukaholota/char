"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { MobileTocBar, MobileTocCurtain } from "@/components/rules/RulesCategoryClient";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { findDraftArticlesPath, findRulesPath, type DraftGroup, type SectionTocEntry } from "@/lib/optimization/article-view";
import type { OptimizationRuleset } from "@/lib/optimization/types";
import { ArticleSidebar, type RuleCategoryLink } from "./ArticleSidebar";

type ReaderLayoutProps = {
  ruleset: OptimizationRuleset;
  currentSlug?: string;
  currentTitle?: string;
  groups: DraftGroup[];
  sectionEntries: SectionTocEntry[];
  ruleCategories: RuleCategoryLink[];
  header: ReactNode;
  children: ReactNode;
};

export function ReaderLayout({ ruleset, currentSlug, currentTitle, groups, sectionEntries, ruleCategories, header, children }: ReaderLayoutProps) {
  const [search, setSearch] = useState("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const closeMobileToc = useCallback(() => setMobileTocOpen(false), []);
  useEscapeKey(closeMobileToc, { enabled: mobileTocOpen });

  const sidebar = (
    <ArticleSidebar
      ruleset={ruleset} currentSlug={currentSlug} groups={groups} sectionEntries={sectionEntries} ruleCategories={ruleCategories}
      search={search} onSearchChange={setSearch} onNavigate={closeMobileToc}
    />
  );

  return (
    <>
      <MobileTocCurtain open={mobileTocOpen} onClose={closeMobileToc}>{sidebar}</MobileTocCurtain>

      <div className="min-h-[100dvh] shrink-0 w-full p-4 sm:p-8 pt-6 sm:pt-10 pb-36 sm:pb-24 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] max-w-7xl mx-auto space-y-8">
        <MobileTocBar onOpen={() => setMobileTocOpen(true)} />
        <Breadcrumbs ruleset={ruleset} currentTitle={currentTitle} />
        {header}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-6 rounded-3xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-2xl shadow-xl space-y-4 max-h-[calc(100dvh-3rem)] overflow-y-auto">
              {sidebar}
            </div>
          </aside>

          <div data-article-content className="lg:col-span-8 min-w-0 space-y-6">{children}</div>
        </div>

        <div className="h-24 sm:h-12 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>
    </>
  );
}

function Breadcrumbs({ ruleset, currentTitle }: { ruleset: OptimizationRuleset; currentTitle?: string }) {
  const rulesPath = findRulesPath(ruleset);
  const articlesPath = findDraftArticlesPath(ruleset);
  const linkClassName = "hover:text-slate-200 transition-colors";
  return (
    <nav aria-label="Навігація" className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <Link href={ruleset === "RULES_2024" ? "/2024" : "/"} className={linkClassName}>Головна</Link>
      <ChevronRight className="h-3 w-3" />
      <Link href={rulesPath} className={linkClassName}>Довідник правил</Link>
      <ChevronRight className="h-3 w-3" />
      {currentTitle ? <Link href={articlesPath} className={linkClassName}>Аналітика RPGbot</Link> : <span className="text-slate-200 font-semibold">Аналітика RPGbot</span>}
      {currentTitle ? (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="min-w-0 truncate text-slate-200 font-semibold">{currentTitle}</span>
        </>
      ) : null}
    </nav>
  );
}
