import type { CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import {
  applyQueuedFeatureUses,
  applyQueuedItemCharges,
  applyQueuedOperations,
  applyQueuedSpellPreparation,
  type OfflineOperation,
} from "@/lib/offline/operations";
import { applyLongRestToSheet, applyShortRestToSheet, findSlotMaxima, type OfflineSheet } from "@/lib/offline/sheet-rest";
import { canActivateFeature, isFeatureActive, markFeatureActive } from "@/lib/logic/feature-state-rows";
import { findKnownSpell, markConcentration, markExhaustion, markSpellBuff } from "@/lib/logic/pers-effect-rows";
import { collectActiveFeatures } from "@/lib/logic/bonus-calculator";
import { doesFeatureStateEndConcentration } from "@/rules/feature-states";
import { isSpellBuffKey } from "@/rules/spell-buffs";

const FEATURE_GROUPS = ["actions", "bonusActions", "reactions", "passive"] as const;

/// Сторінка з кешу воркера — стан на момент кешування. Черга складається поверх усього листа:
/// полів `pers`, зарядів предметів, підготовки заклинань і ресурсів рис у згрупованому списку.
/// Операції накладаються строго по черзі: відпочинок між двома витратами ресурсу має відновити
/// лише першу.
export function applyQueuedOperationsToSheet(
  pers: PersWithRelations,
  groupedFeatures: CharacterFeaturesGroupedResult | null,
  operations: OfflineOperation[],
): OfflineSheet {
  const own = operations.filter((operation) => operation.persId === pers.persId);
  if (own.length === 0) return { pers, groupedFeatures };

  return own.reduce<OfflineSheet>(applyOperationToSheet, { pers, groupedFeatures });
}

function applyOperationToSheet(sheet: OfflineSheet, operation: OfflineOperation): OfflineSheet {
  if (operation.kind === "long-rest") return applyLongRestToSheet(sheet);
  if (operation.kind === "short-rest") {
    return applyShortRestToSheet(sheet, operation.hitDiceSpent, operation.restoredHitPoints);
  }
  if (operation.kind === "feature-state") return applyFeatureStateToSheet(sheet, operation);
  if (operation.kind === "concentration" || operation.kind === "spell-buff" || operation.kind === "exhaustion") {
    return { ...sheet, pers: applyPersEffectToPers(sheet.pers, operation) };
  }

  return {
    pers: applyToPers(sheet.pers, [operation]),
    groupedFeatures: sheet.groupedFeatures
      ? applyToGroupedFeatures(sheet.groupedFeatures, sheet.pers.persId, [operation])
      : null,
  };
}

/// Дзеркало `changeFeatureState`: увімкнення списує одне використання, повторне — нічого.
function applyFeatureStateToSheet(
  sheet: OfflineSheet,
  operation: Extract<OfflineOperation, { kind: "feature-state" }>,
): OfflineSheet {
  if (isFeatureActive(sheet.pers, operation.featureId) === operation.isActive) return sheet;
  if (operation.isActive && !canActivateFeature(sheet.pers, operation.featureId)) return sheet;

  const spend: OfflineOperation[] = operation.isActive ? [{ ...operation, kind: "feature-use", direction: "spend" }] : [];
  const marked = markFeatureActive(sheet.pers, operation.featureId, operation.isActive);
  return {
    pers: operation.isActive && endsConcentration(sheet.pers, operation.featureId) ? markConcentration(marked, null) : marked,
    groupedFeatures: sheet.groupedFeatures ? applyToGroupedFeatures(sheet.groupedFeatures, sheet.pers.persId, spend) : null,
  };
}

function endsConcentration(pers: PersWithRelations, featureId: number): boolean {
  const feature = collectActiveFeatures(pers).find((candidate) => candidate.featureId === featureId);
  return feature ? doesFeatureStateEndConcentration(feature.engName) : false;
}

/// Дзеркало `pers-effect-change.ts`.
function applyPersEffectToPers(
  pers: PersWithRelations,
  operation: Extract<OfflineOperation, { kind: "concentration" | "spell-buff" | "exhaustion" }>,
): PersWithRelations {
  if (operation.kind === "exhaustion") return markExhaustion(pers, operation.level);
  if (operation.kind === "concentration") return markConcentration(pers, findKnownSpell(pers, operation.spellId));
  if (!isSpellBuffKey(operation.effectKey)) return pers;
  return markSpellBuff(pers, operation.effectKey, operation.isActive, {
    spell: findKnownSpell(pers, operation.spellId),
    endsWithConcentration: operation.endsWithConcentration,
  });
}

function applyToPers(pers: PersWithRelations, operations: OfflineOperation[]): PersWithRelations {
  const { maxSpellSlots, maxPactSlots, ...fields } = applyQueuedOperations(
    { ...pers, ...findSlotMaxima(pers) },
    operations,
  );
  void maxSpellSlots;
  void maxPactSlots;

  return {
    ...fields,
    magicItems: applyQueuedItemCharges(pers.magicItems, pers.persId, operations),
    persSpells: applyQueuedSpellPreparation(pers.persSpells, pers.persId, operations),
    homebrewSpells: applyQueuedSpellPreparation(
      pers.homebrewSpells,
      pers.persId,
      operations,
      (row) => -row.homebrewEntryId,
    ),
  };
}

function applyToGroupedFeatures(
  grouped: CharacterFeaturesGroupedResult,
  persId: number,
  operations: OfflineOperation[],
): CharacterFeaturesGroupedResult {
  const flat = FEATURE_GROUPS.flatMap((group) => grouped[group] ?? []);
  const applied = applyQueuedFeatureUses(flat, persId, operations);
  if (applied === flat) return grouped;

  let offset = 0;
  const next = { ...grouped };
  for (const group of FEATURE_GROUPS) {
    const size = (grouped[group] ?? []).length;
    next[group] = applied.slice(offset, offset + size);
    offset += size;
  }
  return next;
}
