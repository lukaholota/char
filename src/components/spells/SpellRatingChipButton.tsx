"use client";

import { RatingBadge } from "@/components/optimization/RatingBadge";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { buildSpellLinkForSpell, openSpellLink } from "@/lib/spell-link";
import { useSpellRatingContextStore } from "@/lib/stores/spellRatingContextStore";
import type { SpellRatingScore } from "@/lib/optimization/spell-rating-extraction";

type Props = { score: SpellRatingScore; spell: Parameters<typeof buildSpellLinkForSpell>[0]; spellName: string };

export function SpellRatingChipButton({ score, spell, spellName }: Props) {
  const requestRatingFocus = useSpellRatingContextStore((state) => state.requestRatingFocus);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Оцінка RPGbot для «${spellName}»: відкрити аналіз`}
      onClick={() => {
        captureRpgbotEvent("rpgbot_spell_rating_opened", { placement: "creator", entity_key: spell.engName, rating_score: score });
        requestRatingFocus();
        openSpellLink(buildSpellLinkForSpell(spell));
      }}
      className="pointer-events-auto relative -mx-1 -my-2 inline-flex px-1 py-2 after:absolute after:inset-x-0 after:top-1/2 after:h-10 after:-translate-y-1/2"
    >
      <RatingBadge rating={{ score, context: "" }} className="mr-0" />
    </button>
  );
}
