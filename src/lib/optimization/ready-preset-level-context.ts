import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { buildSpellSlug } from "@/lib/spell-link";
import { buildPresetAbilityScores } from "./ready-preset-abilities";
import type { AssemblyStartState } from "./ready-preset-levels";
import type { ReadyPresetOptions } from "./ready-preset-options";

export function buildAssemblyStartState(draft: Partial<PersFormData>, options: ReadyPresetOptions): AssemblyStartState {
  const keyById = new Map(options.spells.candidates.map((spell) => [spell.spellId, buildSpellSlug(spell.engName)]));
  const toKeys = (ids: readonly number[] | undefined) => (ids ?? []).flatMap((id) => keyById.get(id) ?? []);
  const classSpells = draft.classSpells;
  return {
    spellKeys: toKeys([
      ...(classSpells?.cantripIds ?? []), ...(classSpells?.preparedIds ?? []), ...(classSpells?.spellbookIds ?? []),
      ...(draft.raceSpellIds ?? []), ...(draft.classOptionSpellIds ?? []), ...Object.values(draft.featSpellSelections ?? {}).flat(),
    ]),
    bookKeys: toKeys(classSpells?.spellbookIds),
    preparedKeys: toKeys(draft.initialPreparedSpellIds),
    abilities: buildPresetAbilityScores(draft, options.abilitySources),
    featKeys: options.abilitySources.feats.map((entry) => entry.source.name),
    classOptionIds: Object.values(draft.classChoiceSelections ?? {}).flat(),
  };
}
