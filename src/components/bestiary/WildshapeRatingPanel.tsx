"use client";

import { RatingBadge } from "@/components/optimization/RatingBadge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { buildRpgbotCtaProps } from "@/lib/monitoring/rpgbot-analytics-model";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { buildDraftArticleHref } from "@/lib/optimization/article-view";
import {
  findWildshapeRatingNotes,
  type WildshapeFormRating,
  type WildshapeRatingCatalog,
} from "@/lib/optimization/wildshape-rating-lookup";
import type { WildshapeEligibility } from "@/rules/wildshape";

type Props = {
  catalog: WildshapeRatingCatalog;
  rating: WildshapeFormRating;
  eligibility: WildshapeEligibility | null;
  creatureKey: string;
};

export function WildshapeRatingPanel({ catalog, rating, eligibility, creatureKey }: Props) {
  useRpgbotSurfaceView({ surface: "wildshape_rating_panel", entity_key: creatureKey, rating_score: rating.score });
  const notes = findWildshapeRatingNotes(catalog, rating, eligibility);

  return (
    <section aria-label="Оцінка RPGbot" className="glass-panel space-y-3 rounded-2xl border border-white/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-rpg-display text-lg font-semibold tracking-wide text-slate-100">Оцінка RPGbot</h3>
        <RatingBadge rating={{ score: rating.score, context: "" }} className="mr-0" />
      </div>

      {rating.comment && <FormattedDescription content={rating.comment} className="text-slate-300" />}
      {notes.movementNote && <FormattedDescription content={notes.movementNote} className="text-sm text-slate-400" />}

      {notes.sectionNotes.length > 0 && (
        <details>
          <summary className="min-h-10 cursor-pointer py-2 text-sm text-amber-200 md:min-h-0 md:py-1">
            Порада розділу «{notes.sectionTitle}»
          </summary>
          <div className="mt-1 space-y-2">
            {notes.sectionNotes.map((note, index) => (
              <FormattedDescription key={index} content={note} className="text-sm text-slate-300" />
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-x-4 text-xs">
        <a href={buildDraftArticleHref("RULES_2014", catalog.articleSlug, rating.sectionId)} target="_blank" rel="noopener noreferrer" {...buildRpgbotCtaProps("open_ukrainian_article", "wildshape_rating_panel", catalog.articleSlug)} className="inline-block min-h-10 py-2 text-amber-200 underline md:min-h-0 md:py-0">
          Читати розбір українською
        </a>
        <a href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer" {...buildRpgbotCtaProps("open_original", "wildshape_rating_panel", catalog.articleSlug)} className="inline-block min-h-10 py-2 text-slate-400 underline md:min-h-0 md:py-0">
          Оригінал на RPGbot
        </a>
      </div>
    </section>
  );
}
