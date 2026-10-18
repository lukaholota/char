"use client";

import { RatingBadge } from "@/components/optimization/RatingBadge";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { buildSpellLinkForSpell, openSpellLink } from "@/lib/spell-link";
import { useSpellRatingContextStore } from "@/lib/stores/spellRatingContextStore";
import type { SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";

type Props = { rating: SpellRatingMatch; spell: Parameters<typeof buildSpellLinkForSpell>[0]; spellName: string };

export function SpellRatingChipButton({ rating, spell, spellName }: Props) {
  const requestRatingFocus = useSpellRatingContextStore((state) => state.requestRatingFocus);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Оцінка RPGbot для «${spellName}»: відкрити аналіз`}
      onClick={() => {
        captureRpgbotEvent("rpgbot_spell_rating_opened", { placement: "creator", entity_key: spell.engName, rating_score: rating.score });
        requestRatingFocus();
        openSpellLink(buildSpellLinkForSpell(spell));
      }}
      className="pointer-events-auto relative -mx-1 -my-2 inline-flex min-w-0 max-w-full px-1 py-2 text-left after:absolute after:inset-x-0 after:top-1/2 after:h-10 after:-translate-y-1/2"
    >
      <RatingBadge rating={{ ...rating, context: "" }} className="mr-0" />
    </button>
  );
}
