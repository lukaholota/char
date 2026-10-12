import { Scale } from "lucide-react";
import { BranchCover } from "@/components/catalogs/reading/BranchCover";
import { ModeLink as Link } from "@/components/no-ai/ModeLink";
import { EditionAccentChip } from "@/components/ui/EditionAccent";
import { buildDraftArticleHref, groupDraftSummaries, type DraftSummary } from "@/lib/optimization/article-view";
import type { OptimizationRuleset } from "@/lib/optimization/types";
import { cn } from "@/lib/utils";
import { findEditionAccent } from "@/styles/edition-accent";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";
import { AnalystAvatar } from "./AnalystAvatar";
import type { RuleCategoryLink } from "./ArticleSidebar";
import { ReaderLayout } from "./ReaderLayout";
import { RpgbotSurfaceView } from "./RpgbotSurfaceView";

type ArticleIndexProps = {
  ruleset: OptimizationRuleset;
  summaries: DraftSummary[];
  ruleCategories: RuleCategoryLink[];
};

export function ArticleIndex({ ruleset, summaries, ruleCategories }: ArticleIndexProps) {
  const groups = groupDraftSummaries(summaries);
  return (
    <ReaderLayout ruleset={ruleset} groups={groups} sectionEntries={[]} ruleCategories={ruleCategories} header={<IndexHeaderCard ruleset={ruleset} count={summaries.length} />}>
      <RpgbotSurfaceView surface="article_index" item_count={summaries.length} />
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="space-y-3">
          <h2 className="font-rpg-display text-2xl tracking-wide text-slate-100">{group.title}</h2>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {group.summaries.map((summary) => <ArticleCard key={summary.articleId} summary={summary} />)}
          </ul>
        </section>
      ))}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center text-slate-400">Чернеток для цієї редакції ще немає.</div>
      ) : null}
    </ReaderLayout>
  );
}

function IndexHeaderCard({ ruleset, count }: { ruleset: OptimizationRuleset; count: number }) {
  const is2024 = ruleset === "RULES_2024";
  const accent = findEditionAccent(is2024 ? "2024" : "2014").solid;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="flex items-start gap-4 sm:items-center">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-lg sm:hidden", accent.border, accent.fill, accent.text)}>
          <Scale className="h-6 w-6" />
        </div>
        <AnalystAvatar className="hidden sm:block" />
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-rpg-display text-3xl tracking-wide text-white sm:text-4xl">Аналітика RPGbot</h1>
            {is2024 ? <EditionAccentChip edition="2024" className="text-xs">2024</EditionAccentChip> : null}
          </div>
          <p className="mt-1.5 max-w-2xl font-sans text-xs leading-relaxed text-slate-300 sm:text-sm">
            {describeIndexAudience(ruleset, count)}
          </p>
        </div>
      </div>
    </div>
  );
}

function describeIndexAudience(ruleset: OptimizationRuleset, count: number): string {
  if (ruleset === "RULES_2024") return `Приватні неопубліковані переклади: ${count}. Їх бачите лише ви; публічного каталогу ще немає.`;
  return `Українські переклади статей RPGbot: ${count}. Каталог відкритий для всіх.`;
}

function ArticleCard({ summary }: { summary: DraftSummary }) {
  return (
    <li>
      <Link
        href={buildDraftArticleHref(summary.ruleset, summary.slug)}
        {...buildRpgbotCtaProps("article_card", "article_index", summary.slug)}
        className="glass-card block h-full rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-xl transition-colors hover:border-white/25"
      >
        <BranchCover src={summary.imageSrc} alt={summary.titleUk} sizes="(min-width: 1280px) 420px, (min-width: 768px) 40vw, 100vw" hiddenInNoAi className="mb-4" />
        <span className="block font-rpg-display text-lg tracking-wide text-slate-100">{summary.titleUk}</span>
        <span className="mt-1 block font-mono text-xs italic text-slate-400">{summary.titleEn}</span>
        <span className="mt-3 flex flex-wrap gap-1.5 font-sans text-xs text-slate-300">
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">{summary.sectionCount} розділів</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">{summary.ratingCount} оцінок</span>
        </span>
      </Link>
    </li>
  );
}
