import type { CharacterFeatureItem, CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import { collectPersHitDicePools } from "@/lib/logic/pers-hit-dice";
import { endAllFeatureStates } from "@/lib/logic/feature-state-rows";
import { endEffectsAfterRest } from "@/lib/logic/pers-effect-rows";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { normalizeSlots, type OfflineHitDiceSpend } from "@/lib/offline/operations";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { findHeroicInspirationCountAfterLongRest } from "@/rules/heroic-inspiration";
import { findPoolsAfterLongRest, findPoolsAfterSpending, serializeHitDicePools } from "@/rules/hit-dice";
import { findRegainedUsesAfterShortRest } from "@/rules/resource-pools";
import { getPactMagicSlots, getStandardSpellSlots } from "@/rules/spellcasting";

export type OfflineSheet = {
  pers: PersWithRelations;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
};

const FEATURE_GROUPS = ["actions", "bonusActions", "reactions", "passive"] as const;
const SHORT_REST_TYPES: ReadonlySet<string> = new Set(["SHORT_REST"]);
const LONG_REST_TYPES: ReadonlySet<string> = new Set(["SHORT_REST", "LONG_REST"]);

export function findSlotMaxima(pers: PersWithRelations): { maxSpellSlots: number[]; maxPactSlots: number } {
  const caster = calculateCasterLevel(pers);
  return {
    maxSpellSlots: getStandardSpellSlots(caster.casterLevel, SPELL_SLOT_PROGRESSION.FULL),
    maxPactSlots: getPactMagicSlots(caster.pactLevel, SPELL_SLOT_PROGRESSION.PACT)?.slots ?? 0,
  };
}

/// Дзеркало `takeLongRest` на сервері: ті самі правила, лише з полів листа замість запитів.
export function applyLongRestToSheet({ pers, groupedFeatures }: OfflineSheet): OfflineSheet {
  const { maxSpellSlots, maxPactSlots } = findSlotMaxima(pers);
  const restoredHitDice = findPoolsAfterLongRest(collectPersHitDicePools(pers), pers.ruleset);

  return {
    pers: {
      ...endEffectsAfterRest(endAllFeatureStates(pers), "LONG"),
      currentHp: pers.maxHp,
      tempHp: 0,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      isDead: false,
      currentHitDice: serializeHitDicePools(restoredHitDice),
      currentSpellSlots: normalizeSlots(maxSpellSlots),
      currentPactSlots: maxPactSlots,
      heroicInspirationCount: findHeroicInspirationCountAfterLongRest({
        heroicInspirationCount: pers.heroicInspirationCount,
        canStackHeroicInspiration: pers.canStackHeroicInspiration,
        featureEngNames: pers.features.map((persFeature) => persFeature.feature.engName),
      }),
    },
    groupedFeatures: restoreFeatureUses(groupedFeatures, LONG_REST_TYPES, (item) => item.usesPer ?? 0),
  };
}

/// Дзеркало `takeShortRest`: коли кубиків уже не вистачає, сервер операцію відхилить, тож і лист
/// її не показує.
export function applyShortRestToSheet(
  { pers, groupedFeatures }: OfflineSheet,
  hitDiceSpent: OfflineHitDiceSpend[],
  restoredHitPoints: number,
): OfflineSheet {
  const spent = findPoolsAfterSpending(collectPersHitDicePools(pers), hitDiceSpent);
  if (!spent.ok) return { pers, groupedFeatures };

  const { maxPactSlots } = findSlotMaxima(pers);
  const restored = Math.max(0, Math.trunc(Number.isFinite(restoredHitPoints) ? restoredHitPoints : 0));

  return {
    pers: {
      ...endEffectsAfterRest(endAllFeatureStates(pers), "SHORT"),
      currentHp: Math.min(pers.maxHp, pers.currentHp + restored),
      currentHitDice: serializeHitDicePools(spent.pools),
      currentPactSlots: maxPactSlots > 0 ? maxPactSlots : pers.currentPactSlots,
    },
    groupedFeatures: restoreFeatureUses(groupedFeatures, SHORT_REST_TYPES, (item) =>
      findRegainedUsesAfterShortRest({
        regainsOneUse: item.regainsOneUseOnShortRest ?? false,
        usesRemaining: item.usesRemaining,
        maxUses: item.usesPer ?? 0,
      }),
    ),
  };
}

function restoreFeatureUses(
  grouped: CharacterFeaturesGroupedResult | null,
  restTypes: ReadonlySet<string>,
  findUsesAfterRest: (item: CharacterFeatureItem) => number,
): CharacterFeaturesGroupedResult | null {
  if (!grouped) return null;

  const next = { ...grouped };
  for (const group of FEATURE_GROUPS) {
    next[group] = (grouped[group] ?? []).map((item) =>
      isRestoredByRest(item, restTypes) ? { ...item, usesRemaining: findUsesAfterRest(item) } : item,
    );
  }
  return next;
}

function isRestoredByRest(item: CharacterFeatureItem, restTypes: ReadonlySet<string>): boolean {
  return item.featureId != null && item.restType != null && restTypes.has(item.restType) && (item.usesPer ?? 0) > 0;
}
