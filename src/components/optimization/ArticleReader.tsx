"use client";

import { useState } from "react";
import { useScrollToUrlHash } from "@/hooks/useScrollToUrlHash";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";
import { useRpgbotArticleReading } from "@/lib/monitoring/use-rpgbot-article-reading";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { EditionAccentChip } from "@/components/ui/EditionAccent";
import {
  buildArticleOutline, buildDraftArticleHref, buildOutlineTree, buildRatingIndex, buildSectionTocEntries, findHeadingLevel,
  resolveArticleLink, type DraftGroup, type LinkTargets, type OutlineSection,
} from "@/lib/optimization/article-view";
import type { AnalysisArticle, AnalysisRating, ContentReference, SourceRevision, TranslationRevision } from "@/lib/optimization/types";
import { ContentReferenceProvider } from "./ContentReferenceProvider";
import { cn } from "@/lib/utils";
import { findEditionAccent } from "@/styles/edition-accent";
import { AnalystAvatar } from "./AnalystAvatar";
import type { BlockContext } from "./ArticleBlocks";
import { RatingBadge } from "./RatingBadge";
import type { RuleCategoryLink } from "./ArticleSidebar";
import { ReaderLayout } from "./ReaderLayout";
import { SectionCard } from "./SectionCard";
import { SubclassCardButton } from "./SubclassCardButton";
import type { SubclassCardLink } from "@/lib/optimization/article-catalog-links.server";

type ArticleReaderProps = {
  article: AnalysisArticle;
  revision: TranslationRevision;
  ratings: AnalysisRating[];
  sourceRevision: SourceRevision;
  sourceUrl?: string;
  linkTargets: LinkTargets;
  groups: DraftGroup[];
  ruleCategories: RuleCategoryLink[];
  contentReferences?: ContentReference[];
  catalogLinks?: { headingLinks: Record<string, SubclassCardLink>; subject: SubclassCardLink | null };
};

const DATE_FORMAT = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Kyiv" });

const REVISION_STATUS_LABELS: Record<TranslationRevision["status"], string> = {
  draft: "чернетка перекладу",
  reviewed: "переклад перевірено",
  stale: "переклад застарів",
};

export function ArticleReader({ article, revision, ratings, sourceRevision, sourceUrl, linkTargets, groups, ruleCategories, contentReferences, catalogLinks }: ArticleReaderProps) {
  useScrollToUrlHash();
  const outline = buildArticleOutline(revision.sections);
  const [landingSection] = useState(findLandingSection);
  useRpgbotSurfaceView({ surface: "article_reader", article_slug: article.slug, article_group: groups.find((group) => group.summaries.some((summary) => summary.slug === article.slug))?.title, section_count: outline.length, landing_section: landingSection });
  useRpgbotArticleReading(article.slug, contentReferences);
  const is2024 = article.ruleset === "RULES_2024";
  const accent = findEditionAccent(is2024 ? "2024" : "2014").solid;
  const tree = buildOutlineTree(outline);
  const ratingIndex = buildRatingIndex(ratings, revision.sections.flatMap((section) => section.blocks));
  const contextFor = (section: OutlineSection): BlockContext => ({
    ratingIndex, ratings, resolveLink: (href) => resolveArticleLink(href, linkTargets), linkClassName: accent.text,
    ownArticlePath: buildDraftArticleHref(article.ruleset, article.slug), headingLevel: findHeadingLevel(section.depth), sectionHeading: section.heading,
  });

  return (
    <ReaderLayout
      ruleset={article.ruleset} currentSlug={article.slug} currentTitle={article.titleUk} groups={groups}
      sectionEntries={buildSectionTocEntries(tree)} ruleCategories={ruleCategories}
      header={<ArticleHeaderCard article={article} revision={revision} sourceRevision={sourceRevision} sourceUrl={sourceUrl} is2024={is2024} accent={accent} />}
    >
      <ContentReferenceProvider references={contentReferences} surface="article_reader">
        {tree.map((node) => <SectionCard key={node.sectionId} node={node} is2024={is2024} contextFor={contextFor} headingLinks={catalogLinks?.headingLinks} />)}
      </ContentReferenceProvider>
      {catalogLinks ? <SubclassCardButton headingLinks={catalogLinks.headingLinks} subject={catalogLinks.subject} /> : null}
    </ReaderLayout>
  );
}

function findLandingSection(): string | undefined {
  if (typeof window === "undefined" || !window.location.hash) return undefined;
  return decodeURIComponent(window.location.hash.slice(1));
}

type HeaderCardProps = Pick<ArticleReaderProps, "article" | "revision" | "sourceRevision" | "sourceUrl"> & {
  is2024: boolean;
  accent: ReturnType<typeof findEditionAccent>["solid"];
};

function ArticleHeaderCard({ article, revision, sourceRevision, sourceUrl, is2024, accent }: HeaderCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="space-y-5">
        <div className="flex items-start gap-4 sm:items-center">
          <AnalystAvatar className="h-16 w-16 sm:h-24 sm:w-24" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-rpg-display text-3xl tracking-wide text-white sm:text-4xl">{article.titleUk}</h1>
              {is2024 ? <EditionAccentChip edition="2024" className="text-xs">2024</EditionAccentChip> : null}
            </div>
            <p className="mt-1.5 font-mono text-xs italic text-slate-400">{article.titleEn}</p>
          </div>
        </div>

        {is2024 ? <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Приватна чернетка, не опублікована: {REVISION_STATUS_LABELS[revision.status]}. Її бачите лише ви.
        </p> : null}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-sans text-sm text-slate-400">
          <dt>Автори</dt>
          <dd>{sourceRevision.authors.join(", ")}</dd>
          <dt>Оригінал</dt>
          <dd>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" {...buildRpgbotCtaProps("open_original", "article_reader", article.slug)} className={cn("break-all underline underline-offset-2", accent.text)}>{sourceUrl}</a> : sourceRevision.title}</dd>
          <dt>Звірено</dt>
          <dd>{DATE_FORMAT.format(new Date(sourceRevision.fetchedAt))}</dd>
          {sourceRevision.sourceUpdatedAt ? (<><dt>Оновлено в оригіналі</dt><dd>{DATE_FORMAT.format(new Date(sourceRevision.sourceUpdatedAt))}</dd></>) : null}
        </dl>

        <RatingLegend />
      </div>
    </div>
  );
}

function RatingLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 font-sans text-xs text-slate-400">
      <span>Оцінки RPGbot:</span>
      {([1, 2, 3, 4] as const).map((score) => <RatingBadge key={score} rating={{ score, context: "" }} className="mr-0" />)}
    </div>
  );
}
