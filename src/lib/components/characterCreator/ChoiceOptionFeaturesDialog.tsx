"use client";

import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { RatingBadge } from "@/components/optimization/RatingBadge";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import type { ChoiceOptionRating } from "@/lib/optimization/choice-option-rating-lookup";
import type { ClassI } from "@/lib/types/model-types";

export type ChoiceOptionFeatures = ClassI["classChoiceOptions"][number]["choiceOption"]["features"];
export type ChoiceOptionInfo = { title: string; features?: ChoiceOptionFeatures; rating?: ChoiceOptionRating | null };

export function ChoiceOptionFeaturesDialog({ info, onClose }: { info: ChoiceOptionInfo | null; onClose: () => void }) {
  const features = (info?.features ?? []).map((item) => item.feature).filter((feature) => feature?.name);
  return (
    <ControlledInfoDialog open={info !== null} onOpenChange={(open) => { if (!open) onClose(); }} title={info?.title || "Фічі"} contentClassName="max-w-2xl">
      {info?.rating ? <ChoiceOptionRatingSection rating={info.rating} /> : null}
      {features.length ? (
        <div className="space-y-3">
          <InfoSectionTitle>Фічі</InfoSectionTitle>
          <div className="space-y-3">
            {features.map((feature) => (
              <div key={feature.name} className="glass-panel rounded-xl border border-slate-800/70 p-4">
                <div className="text-sm font-semibold text-white">{feature.name}</div>
                {feature.description ? <FormattedDescription content={feature.description} className="mt-2 text-slate-200/90" /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-400">Немає фіч</div>
      )}
    </ControlledInfoDialog>
  );
}

function ChoiceOptionRatingSection({ rating }: { rating: ChoiceOptionRating }) {
  return (
    <section aria-labelledby="choice-option-rating-heading" className="mb-4 space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="choice-option-rating-heading" className="text-sm font-semibold text-slate-100">Оцінка RPGbot</h3>
        <RatingBadge rating={{ score: rating.score, context: "" }} className="mr-0" />
      </div>
      {rating.comment ? <FormattedDescription content={rating.comment} className="text-slate-300" /> : null}
      <div className="flex flex-wrap gap-x-4 text-xs">
        <a href={rating.articleHref} target="_blank" rel="noopener noreferrer" className="inline-block min-h-10 py-2 text-amber-200 underline md:min-h-0 md:py-0">
          Читати розбір українською
        </a>
        <a href={rating.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block min-h-10 py-2 text-slate-400 underline md:min-h-0 md:py-0">
          Оригінал на RPGbot
        </a>
      </div>
    </section>
  );
}
