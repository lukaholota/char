"use client";

import { RatingBadge } from "@/components/optimization/RatingBadge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { useSpellRatingCatalog } from "@/hooks/useSpellRatingFinder";
import { useSpellRatingComment } from "@/hooks/useSpellRatingComment";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";
import { buildDraftArticleHref } from "@/lib/optimization/article-view";
import { findRatingListLabel } from "@/lib/optimization/spell-rating-labels";
import type { SpellRatingList, SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";

type Props = { matches: readonly SpellRatingMatch[]; spellEngName: string };

export function SpellRatingDetails({ matches, spellEngName }: Props) {
  const catalog = useSpellRatingCatalog(true);

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <SpellRatingEntry key={match.listKey} match={match} spellEngName={spellEngName} list={catalog?.lists[match.listKey]} />
      ))}
    </div>
  );
}

function SpellRatingEntry({ match, spellEngName, list }: { match: SpellRatingMatch; spellEngName: string; list: SpellRatingList | undefined }) {
  const comment = useSpellRatingComment(match.listKey, spellEngName);
  const label = findRatingListLabel(match.listKey);

  return (
    <section aria-label={`Оцінка для: ${label}`} className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-slate-100">{label}</h4>
        <RatingBadge rating={{ ...match, context: "" }} className="mr-0" />
      </div>
      {comment && <FormattedDescription content={comment.text} className="text-slate-300" />}
      {list && (
        <div className="flex flex-wrap gap-x-4 text-xs">
          <a href={buildDraftArticleHref("RULES_2014", list.articleSlug, comment?.sectionId)} target="_blank" rel="noopener noreferrer" {...buildRpgbotCtaProps("open_ukrainian_article", "spell_rating_panel", list.articleSlug)} className="inline-block min-h-10 py-2 text-amber-200 underline md:min-h-0 md:py-0">
            Читати розбір українською
          </a>
          <a href={list.sourceUrl} target="_blank" rel="noopener noreferrer" {...buildRpgbotCtaProps("open_original", "spell_rating_panel", list.articleSlug)} className="inline-block min-h-10 py-2 text-slate-400 underline md:min-h-0 md:py-0">
            Оригінал на RPGbot
          </a>
        </div>
      )}
    </section>
  );
}
