"use client";

import { useState } from "react";
import { RatingBadge } from "@/components/optimization/RatingBadge";
import { SpellRatingDetails } from "@/components/spells/SpellRatingDetails";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReadingDialogFocus } from "@/hooks/useReadingDialogFocus";
import { describeRating } from "@/lib/optimization/article-view";
import { findBestSpellRating, type SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { cn } from "@/lib/utils";

type Props = { matches: readonly SpellRatingMatch[]; spellName: string; spellEngName: string; className?: string };

export function SpellRatingBadge({ matches, spellName, spellEngName, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const focus = useReadingDialogFocus();
  const best = findBestSpellRating(matches);
  if (!best) return null;
  const description = describeRating({ score: best.score, context: "" });

  return (
    <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Оцінка RPGbot для «${spellName}»: ${description.label}`}
        onClick={(event) => {
          focus.rememberTrigger(event.currentTarget);
          setIsOpen(true);
          captureRpgbotEvent("rpgbot_spell_rating_opened", { placement: "catalog", entity_key: spellEngName, rating_score: best.score });
        }}
        className={cn("-mx-1 -my-2 inline-flex shrink-0 px-1 py-2", className)}
      >
        <RatingBadge rating={{ score: best.score, context: "" }} className="mr-0" />
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent {...focus.dialogProps} className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
          <DialogTitle>Оцінка RPGbot: {spellName}</DialogTitle>
          <SpellRatingDetails matches={matches} spellEngName={spellEngName} />
        </DialogContent>
      </Dialog>
    </span>
  );
}
