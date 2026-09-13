/**
 * KR31.5 — заклинання, які риса 2024 називає поіменно: Доторк феї дає Туманний крок, Доторк тіні —
 * Невидимість. Книга каже «you always have that spell prepared», тож рядок лягає від правила, а
 * характеристикою чаклується те, що риса підвищила («the ability increased by this feat»).
 */

import type { FeatureWithSpells, GrantedSpell } from "./spell-sources";
import type { AbilityKey } from "./types";

export type SpellGrantingFeat = {
  featName: string;
  featLabel: string;
  features: readonly FeatureWithSpells[];
  increasedAbility: AbilityKey | null;
};

export function findEarnedFeatSpells(feats: readonly SpellGrantingFeat[], ownedSpellIds: readonly number[]): GrantedSpell[] {
  const alreadyGranted = new Set(ownedSpellIds);
  const earned: GrantedSpell[] = [];

  for (const feat of feats) {
    for (const feature of feat.features) {
      for (const spellId of feature.spellIds) {
        if (alreadyGranted.has(spellId)) continue;

        alreadyGranted.add(spellId);
        earned.push({ spellId, sourceKey: feat.featName, sourceName: feat.featLabel, ability: feat.increasedAbility });
      }
    }
  }

  return earned;
}
