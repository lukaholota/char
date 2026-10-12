"use client";

import { SpellRatingDetails } from "@/components/spells/SpellRatingDetails";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { findBestSpellRating } from "@/lib/optimization/spell-rating-lookup";
import type { SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";

type Props = { matches: readonly SpellRatingMatch[]; spellEngName: string };

export function SpellRatingSection({ matches, spellEngName }: Props) {
  useRpgbotSurfaceView(matches.length > 0 ? { surface: "spell_rating_panel", entity_key: spellEngName, rating_score: findBestSpellRating(matches)?.score } : null);
  if (matches.length === 0) return null;

  return (
    <section aria-label="Оцінка RPGbot" className="glass-panel space-y-3 rounded-2xl border border-white/10 p-4">
      <h3 className="font-rpg-display text-lg font-semibold tracking-wide text-slate-100">Оцінка RPGbot</h3>
      <SpellRatingDetails matches={matches} spellEngName={spellEngName} />
    </section>
  );
}
