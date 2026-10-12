import { buildSpellSlug } from "@/lib/spell-link";
import { findEarnedRaceSpells2014, type RaceSpellGrant2014 } from "@/rules/race-granted-spells-2014";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { releaseClassSpellSlot } from "./progression-granted-spells";
import type { ClassProgress, WalkEnvironment, WalkState } from "./progression-walk-types";

const LAST_CHARACTER_LEVEL = 20;

type RaceDraft = { raceId?: number; subraceId?: number; raceChoiceSelections?: Record<string, number> };

export type RaceSpellOwner = { race: string; subrace: string | null; chosenRaceOptionNames: string[] };

export function findRaceSpellOwner(content: CreatorContent, draft: RaceDraft): RaceSpellOwner | null {
  const race = content.races.find((entry) => entry.raceId === draft.raceId);
  if (!race) return null;
  const chosenIds = new Set(Object.values(draft.raceChoiceSelections ?? {}));
  return {
    race: race.name,
    subrace: race.subraces.find((entry) => entry.subraceId === draft.subraceId)?.name ?? null,
    chosenRaceOptionNames: race.raceChoiceOptions.filter((option) => chosenIds.has(option.optionId)).map((option) => option.optionName),
  };
}

export function listRaceGrantedSpells(owner: RaceSpellOwner | null, characterLevel: number): RaceSpellGrant2014[] {
  return owner ? findEarnedRaceSpells2014({ race: owner.race, subrace: owner.subrace, chosenRaceOptionNames: owner.chosenRaceOptionNames, characterLevel }) : [];
}

export function buildRaceSpellGrants(env: WalkEnvironment, draft: RaceDraft): WalkState["raceSpellGrants"] {
  return listRaceGrantedSpells(findRaceSpellOwner(env.content, draft), LAST_CHARACTER_LEVEL).flatMap((grant) => {
    const spellId = env.catalog.spellIdsByKey.get(buildSpellSlug(grant.engName));
    return spellId === undefined ? [] : [{ spellId, characterLevel: grant.characterLevel }];
  });
}

export function settleRaceSpells(state: WalkState, characterLevel: number): void {
  const earned = state.raceSpellGrants.filter((grant) => grant.characterLevel <= characterLevel);
  for (const { spellId } of earned) {
    state.takenSpellIds.add(spellId);
    [...state.classes.values()].forEach((progress: ClassProgress) => releaseClassSpellSlot(progress, spellId));
  }
}
