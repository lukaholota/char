/**
 * KR18.5 — які риси виду персонаж уже заслужив на своєму рівні.
 *
 * Риса виду 2024 може чекати рівня персонажа: Драконячий політ приходить на 5-му, Прояв
 * небожителя — на 3-му. Умова живе в даних (`race_trait.level`), а тут — правило, яке її
 * читає. Заклинання родоводу гейтяться так само, але живуть у `spell-sources.ts` разом із
 * рештою заклинань виду.
 *
 * Гейт іде через `hasCharacterLevelAtLeast` і **не** через рівень класу — у цьому вся суть §4:
 * вид не питає, який клас підняли, а підклас не питає, скільки всього рівнів у персонажа.
 *
 * Питання формулюється як «що заслужено» мінус «що вже є», а не «що додати на цьому рівні».
 * Це та сама відповідь для чотирьох викликів — створення, підвищення рівня, майстер і ремонт
 * персонажів, створених до цього KR, — і саме тому ретроактивність тут безкоштовна.
 */

import { hasCharacterLevelAtLeast, type CharacterLevels } from "./character-level";

export type LeveledFeature = { featureId: number; level: number };

export function findEarnedSpeciesFeatureIds(
  traits: readonly LeveledFeature[],
  levels: CharacterLevels,
): number[] {
  return traits
    .filter((trait) => hasCharacterLevelAtLeast(levels, trait.level))
    .map((trait) => trait.featureId);
}

export function findMissingSpeciesTraits<T extends LeveledFeature>(
  traits: readonly T[],
  levels: CharacterLevels,
  ownedFeatureIds: readonly number[],
): T[] {
  const owned = new Set(ownedFeatureIds);
  const earned = new Set(findEarnedSpeciesFeatureIds(traits, levels));

  return traits.filter((trait) => earned.has(trait.featureId) && !owned.has(trait.featureId));
}
