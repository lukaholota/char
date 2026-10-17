"use client";

import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import type { CreatureData } from "@/lib/bestiaryData";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { WildshapeAddFormButton } from "@/components/bestiary/BestiaryWildshapePicking";
import type { WildshapePicking } from "@/components/bestiary/useWildshapePicking";
import type { WildshapeRatings } from "@/components/bestiary/useWildshapeRatings";
import { WildshapeRatingPanel } from "@/components/bestiary/WildshapeRatingPanel";
import { findEntryUnlockLevel } from "@/lib/bestiary-wildshape";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { CreatureDiscussion } from "@/components/bestiary/CreatureDiscussion";
import { CreatureLoreSection } from "@/components/bestiary/CreatureLoreSection";
import { HomebrewByline, HomebrewEntryButtons } from "@/components/homebrew/HomebrewEntryDetails";
import type { HomebrewCreatureEntry } from "@/lib/logic/homebrew-view";
import type { CreatureLoreGroup } from "@/lib/bestiaryLore";

export function StatblockPanel({
  creature,
  statblock,
  loreGroup,
  is2024,
  wildshape,
  ratings,
  homebrewEntry,
}: {
  creature: CreatureIndexEntry;
  statblock: CreatureData | null;
  loreGroup: CreatureLoreGroup | null;
  is2024: boolean;
  wildshape: WildshapePicking;
  ratings: WildshapeRatings;
  homebrewEntry: HomebrewCreatureEntry | null;
}) {
  const eligibility = wildshape.findEligibility(creature);
  const standing = wildshape.standing;
  const rating = ratings.findRating(creature);
  const captureFormAdded = () => {
    if (!standing || !ratings.canRate) return;
    captureRpgbotEvent("rpgbot_wildshape_form_added", {
      ...(rating ? { rating_score: rating.score } : {}),
      is_eligible: eligibility?.eligible ?? false,
      recommendations_on: ratings.isOn,
      is_moon_circle: standing.isMoonCircle,
      druid_level: standing.druidLevel,
    });
  };

  return (
    <div className="space-y-3">
      {eligibility && (
        <WildshapeAddFormButton
          eligibility={eligibility}
          isAttached={wildshape.isAttached(creature)}
          isPending={wildshape.isAdding}
          unlockLevel={eligibility.eligible || !standing ? null : findEntryUnlockLevel(creature, standing)}
          onAdd={() => wildshape.addForm(creature, captureFormAdded)}
        />
      )}

      {ratings.catalog && rating && (
        <WildshapeRatingPanel catalog={ratings.catalog} rating={rating} eligibility={eligibility} creatureKey={creature.key} />
      )}

      {statblock && statblock.creatureId === creature.creatureId ? (
        <>
          {homebrewEntry ? <HomebrewByline entry={homebrewEntry} /> : null}
          <CreatureStatblockCard creature={statblock} is2024={is2024} loreGroupDescription={loreGroup?.description ?? null} />
          <CreatureLoreSection group={loreGroup} is2024={is2024} />
          {homebrewEntry ? <HomebrewEntryButtons entry={homebrewEntry} pageHref={`/homebrew/${homebrewEntry.entryId}${is2024 ? "?edition=2024" : ""}`} /> : null}
          <CreatureDiscussion creature={statblock} is2024={is2024} />
        </>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-center backdrop-blur-xl">
          <p className="text-sm text-slate-400">Завантаження статблоку {creature.name}…</p>
        </div>
      )}
    </div>
  );
}
