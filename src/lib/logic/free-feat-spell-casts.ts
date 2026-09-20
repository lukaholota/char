import type { PersWithRelations } from "@/lib/actions/pers";
import { calculateMaxUsesForFeature } from "@/lib/logic/feature-resources";
import {
  findFeaturesOfFeatSpell,
  findFreeSpellCasts,
  type FeatFreeCastFeature,
  type FreeSpellCast,
  type OwnedFeatSpellRow,
} from "@/rules/free-feat-spell-casts";

/**
 * Лічильник безкоштовного застосування живе на фічі, яку риса дала через обрану в ній опцію
 * («Посвячений у магію: список клірика»), тож шлях один: риса → її вибори → фічі цих виборів →
 * рядок `pers_feature` із залишком.
 */
export function collectFreeSpellCasts(pers: PersWithRelations): FreeSpellCast[] {
  return findFreeSpellCasts(collectOwnedFeatSpells(pers), collectFeatFreeCastFeatures(pers));
}

export type FeatureSpellRow = {
  featureId: number;
  spellId: number;
  name: string;
  engName: string;
  level: number;
  ruleset: PersWithRelations["persSpells"][number]["spell"]["ruleset"];
};

/** Заклинання, які риса дала, — для модалки її фічі: замовляння теж, бо риса дала і їх. */
export function collectFeatureSpells(pers: PersWithRelations): FeatureSpellRow[] {
  const features = collectFeatFreeCastFeatures(pers);

  return (pers.persSpells ?? []).flatMap((persSpell) => {
    const spell = persSpell.spell;
    if (!spell) return [];

    const row = { spellId: persSpell.spellId, level: spell.level, origin: persSpell.origin, sourceName: persSpell.sourceName };
    return findFeaturesOfFeatSpell(row, features).map((feature) => ({
      featureId: feature.featureId,
      spellId: persSpell.spellId,
      name: spell.name,
      engName: spell.engName,
      level: spell.level,
      ruleset: spell.ruleset,
    }));
  });
}

function collectOwnedFeatSpells(pers: PersWithRelations): OwnedFeatSpellRow[] {
  return (pers.persSpells ?? []).map((persSpell) => ({
    spellId: persSpell.spellId,
    level: Number(persSpell.spell?.level ?? 0),
    origin: persSpell.origin,
    sourceName: persSpell.sourceName,
  }));
}

function collectFeatFreeCastFeatures(pers: PersWithRelations): FeatFreeCastFeature[] {
  const remainingByFeatureId = new Map<number, number | null>(
    (pers.features ?? []).map((persFeature) => [persFeature.featureId, persFeature.usesRemaining ?? null]),
  );

  return (pers.feats ?? []).flatMap((persFeat) =>
    collectChosenOptionFeatures(persFeat).flatMap((feature) => {
      const maxUses = calculateMaxUsesForFeature(pers as never, feature) ?? 0;
      if (maxUses <= 0) return [];

      return [{
        featName: persFeat.feat.name,
        featureId: feature.featureId,
        featureName: feature.name,
        maxUses,
        usesRemaining: remainingByFeatureId.get(feature.featureId) ?? null,
      }];
    }),
  );
}

type ChosenOptionFeature = Parameters<typeof calculateMaxUsesForFeature>[1] & { featureId: number; name: string };

function collectChosenOptionFeatures(persFeat: PersWithRelations["feats"][number]): ChosenOptionFeature[] {
  return (persFeat.choices ?? []).flatMap((choice) =>
    ((choice.choiceOption?.features ?? []) as Array<{ feature: ChosenOptionFeature }>).map((link) => link.feature),
  );
}
