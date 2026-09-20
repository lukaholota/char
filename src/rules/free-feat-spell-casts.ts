/**
 * [Р38](../../docs/DECISIONS.md#р38) — те, що риса дає понад саме заклинання, це безкоштовне
 * застосування раз на відпочинок, і воно живе лічильником фічі, а не другим рядком заклинання.
 * Тут — звʼязок між рядком заклинання й тим лічильником: рядок знає рису, якою прийшов
 * (`origin: FEAT`, `sourceName` — назва риси), а фіча риси знає, скільки застосувань лишилось.
 *
 * Замовляння такого застосування не має: воно й так чаклується без слоту, тож лічильник
 * стосується лише заклинань 1-го рівня й вище. Сам звʼязок «заклинання — фіча риси» ширший:
 * за ним модалка фічі показує всі заклинання, які риса дала, разом із замовляннями.
 */

export type FeatFreeCastFeature = {
  featName: string;
  featureId: number;
  featureName: string;
  maxUses: number;
  usesRemaining: number | null;
};

export type OwnedFeatSpellRow = {
  spellId: number;
  level: number;
  origin: string | null | undefined;
  sourceName: string | null | undefined;
};

export type FreeSpellCast = {
  spellId: number;
  featureId: number;
  featureName: string;
  remaining: number;
  maxUses: number;
};

/**
 * Риса, взята двічі (у 2024 «Посвячений у магію» повторюваний), дає два списки й два лічильники,
 * а рядок заклинання памʼятає лише саму рису. Тому заклинання отримує всі лічильники своєї риси —
 * гравець обирає в меню, який витратити, замість того щоб система вгадувала.
 */
export function findFreeSpellCasts(
  spells: readonly OwnedFeatSpellRow[],
  features: readonly FeatFreeCastFeature[],
): FreeSpellCast[] {
  return spells.flatMap((spell) => {
    if (spell.level <= 0) return [];

    return findFeaturesOfFeatSpell(spell, features)
      .filter((feature) => feature.maxUses > 0)
      .map((feature) => ({
        spellId: spell.spellId,
        featureId: feature.featureId,
        featureName: feature.featureName,
        remaining: countRemaining(feature),
        maxUses: feature.maxUses,
      }));
  });
}

/** Фічі риси, якою прийшло це заклинання: зв'язок один і той самий для лічильника й для списку. */
export function findFeaturesOfFeatSpell<T extends { featName: string }>(
  spell: OwnedFeatSpellRow,
  features: readonly T[],
): T[] {
  if (spell.origin !== "FEAT") return [];

  return features.filter((feature) => isSameFeat(feature.featName, spell.sourceName));
}

export function findFreeSpellCastsForSpell(casts: readonly FreeSpellCast[], spellId: number): FreeSpellCast[] {
  return casts.filter((cast) => cast.spellId === spellId);
}

function isSameFeat(featName: string, sourceName: string | null | undefined): boolean {
  return featName.length > 0 && featName === String(sourceName ?? "");
}

/** Рядка `pers_feature` ще немає, поки риса жодного разу не витрачена — тоді залишок повний. */
function countRemaining(feature: FeatFreeCastFeature): number {
  const remaining = feature.usesRemaining ?? feature.maxUses;
  return Math.max(0, Math.min(feature.maxUses, Math.trunc(remaining)));
}
