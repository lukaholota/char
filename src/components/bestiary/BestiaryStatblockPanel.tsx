"use client";

import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import type { CreatureData } from "@/lib/bestiaryData";
import { CreatureStatblockCard } from "@/components/bestiary/CreatureStatblockCard";
import { WildshapeAddFormButton } from "@/components/bestiary/BestiaryWildshapePicking";
import type { WildshapePicking } from "@/components/bestiary/useWildshapePicking";
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
  homebrewEntry,
}: {
  creature: CreatureIndexEntry;
  statblock: CreatureData | null;
  loreGroup: CreatureLoreGroup | null;
  is2024: boolean;
  wildshape: WildshapePicking;
  homebrewEntry: HomebrewCreatureEntry | null;
}) {
  const eligibility = wildshape.findEligibility(creature);

  return (
    <div className="space-y-3">
      {eligibility && (
        <WildshapeAddFormButton
          eligibility={eligibility}
          isAttached={wildshape.isAttached(creature)}
          isPending={wildshape.isAdding}
          onAdd={() => wildshape.addForm(creature)}
        />
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
