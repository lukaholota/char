"use client";

import { buildDraftArticleHref, buildRatingIndex, findDraftRevision, findSectionSubtree, resolveArticleLink } from "@/lib/optimization/article-view";
import type { ArticleDocument } from "@/lib/optimization/types";
import { ArticleBlock } from "./ArticleBlocks";
import { RatingBadge } from "./RatingBadge";
import { ContentReferenceProvider } from "./ContentReferenceProvider";

export function ModalArticle({ document, sectionId }: { document: ArticleDocument; sectionId: string }) {
  const revision = findDraftRevision(document);
  const ratingIndex = buildRatingIndex(document.ratings, revision.sections.flatMap((section) => section.blocks));
  const sections = findSectionSubtree(revision.sections, sectionId);
  return <ContentReferenceProvider references={document.contentReferences} surface="subclass_analysis"><div className="mt-4 space-y-6">
    <p className="text-xs text-amber-200">{document.article.ruleset === "RULES_2024" ? "Приватна чернетка · " : ""}{document.sourceRevisions[0].authors.join(", ")}</p>
    <p className="text-xs text-slate-400">Розділ зі статті «{document.article.titleUk}»</p>
    <div className="flex flex-wrap gap-2">{([1, 2, 3, 4] as const).map((score) => <RatingBadge key={score} rating={{ score, context: "Шкала RPGbot" }} />)}</div>
    {sections.map((section) => <section key={section.sectionId} id={section.sectionId} className="scroll-mt-16">
      <h4 tabIndex={-1} className="mb-3 font-rpg-display text-lg text-slate-100">{section.heading}</h4>
      {section.blocks.map((block) => <ArticleBlock key={block.blockId} block={block} context={{ ratingIndex, ratings: document.ratings,
        resolveLink: (href) => resolveArticleLink(href, new Map()), linkClassName: "text-slate-200 underline", ownArticlePath: buildDraftArticleHref(document.article.ruleset, document.article.slug), headingLevel: 4, sectionHeading: section.heading }} />)}
    </section>)}
  </div></ContentReferenceProvider>;
}
