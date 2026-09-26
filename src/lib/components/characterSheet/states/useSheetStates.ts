"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Ability } from "@/lib/prisma-enums";
import type { Feature } from "@prisma/client";
import type { CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import { setFeatureActive } from "@/lib/actions/feature-uses";
import { setConcentration, setExhaustion, setSpellBuff } from "@/lib/actions/pers-effects";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { createOperationId } from "@/lib/offline/queue";
import type { OfflineOperation } from "@/lib/offline/operations";
import { applyActiveStates } from "@/lib/logic/active-states";
import { calculateFinalSave, collectActiveFeatures, readStateEffects } from "@/lib/logic/bonus-calculator";
import { canActivateFeature, isFeatureActive, listToggleableFeatures, markFeatureActive } from "@/lib/logic/feature-state-rows";
import {
  findConcentration,
  listActiveBuffKeys,
  markConcentration,
  markExhaustion,
  markSpellBuff,
  planSpellCast,
  type EffectSpell,
  type PersEffectRow,
} from "@/lib/logic/pers-effect-rows";
import { describeRollState, shortenSpellName, type SpellBuffCatalogEntry } from "@/lib/logic/state-labels";
import { useDiceUIStore } from "@/lib/stores/diceUIStore";
import { buildD20Action } from "@/lib/components/dice/roll-contexts";
import { findConcentrationSaveDc } from "@/rules/concentration";
import { doesFeatureStateEndConcentration } from "@/rules/feature-states";
import type { SpellBuffKey } from "@/rules/spell-buffs";

export type FeatureUses = { remaining: number; max: number } | null;

export type SheetStatesControl = {
  pers: PersWithRelations;
  statesPers: PersWithRelations;
  isReadOnly: boolean;
  catalog: readonly SpellBuffCatalogEntry[];
  toggleableFeatures: Feature[];
  activeFeatures: Feature[];
  concentration: PersEffectRow | null;
  activeBuffKeys: SpellBuffKey[];
  exhaustionLevel: number;
  isPanelOpen: boolean;
  setPanelOpen: (isOpen: boolean) => void;
  isFeatureActive: (featureId: number) => boolean;
  canActivateFeature: (featureId: number) => boolean;
  findFeatureUses: (featureId: number) => FeatureUses;
  setFeatureActive: (featureId: number, isActive: boolean) => void;
  setConcentration: (spell: EffectSpell | null) => void;
  setBuff: (key: SpellBuffKey, isActive: boolean, source?: { spell: EffectSpell | null; endsWithConcentration: boolean }) => void;
  setExhaustion: (level: number) => void;
  onSpellCast: (spell: EffectSpell, slotLabel?: string) => void;
  promptConcentrationCheck: (damage: number) => void;
};

type WithoutEnvelope<T> = T extends unknown ? Omit<T, "operationId" | "persId" | "createdAt"> : never;
type OperationBody = WithoutEnvelope<OfflineOperation>;
type ServerResult = { success: true } | { success: false; error: string };

export function useSheetStates(input: {
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  catalog: readonly SpellBuffCatalogEntry[];
  isReadOnly: boolean;
  onFeaturesChanged?: () => void;
}): SheetStatesControl {
  const { pers, onPersUpdate, groupedFeatures, catalog, isReadOnly, onFeaturesChanged } = input;
  const { commitOperation } = useOfflineQueue();
  const openRoll = useDiceUIStore((state) => state.openRoll);
  const [isPanelOpen, setPanelOpen] = useState(false);
  /// Тост «На себе» і вердикт концентрації спрацьовують пізніше за рендер — брати свіжий стан.
  const persRef = useRef(pers);
  persRef.current = pers;

  const statesPers = useMemo(() => applyActiveStates(pers), [pers]);
  const toggleableFeatures = useMemo(() => listToggleableFeatures(pers), [pers]);

  /// Лист оновлюється одразу, сервер — через офлайн-чергу; відмова сервера повертає попередній стан.
  const commit = useCallback(
    async (change: (current: PersWithRelations) => PersWithRelations, body: OperationBody, send: () => Promise<ServerResult>) => {
      const before = persRef.current;
      const next = change(before);
      persRef.current = next;
      onPersUpdate(next);
      const operation = { ...body, operationId: createOperationId(), persId: before.persId, createdAt: new Date().toISOString() } as OfflineOperation;
      const outcome = await commitOperation(operation, send);
      if (outcome.queued || outcome.result.success) return;
      toast.error(outcome.result.error);
      persRef.current = before;
      onPersUpdate(before);
    },
    [commitOperation, onPersUpdate],
  );

  const setConcentrationOn = useCallback(
    (spell: EffectSpell | null) =>
      commit((current) => markConcentration(current, spell), { kind: "concentration", spellId: spell?.spellId ?? null }, () =>
        setConcentration({ persId: pers.persId, spellId: spell?.spellId ?? null }),
      ),
    [commit, pers.persId],
  );

  const setBuff = useCallback(
    (key: SpellBuffKey, isActive: boolean, source?: { spell: EffectSpell | null; endsWithConcentration: boolean }) => {
      const spell = source?.spell ?? findCatalogSpell(catalog, key);
      const endsWithConcentration = source?.endsWithConcentration ?? false;
      const change = { effectKey: key, isActive, spellId: spell?.spellId ?? null, endsWithConcentration };
      return commit((current) => markSpellBuff(current, key, isActive, { spell, endsWithConcentration }), { kind: "spell-buff", ...change }, () =>
        setSpellBuff({ persId: pers.persId, ...change }),
      );
    },
    [catalog, commit, pers.persId],
  );

  const setFeature = useCallback(
    (featureId: number, isActive: boolean) => {
      const change = (current: PersWithRelations) => {
        const marked = markFeatureActive(current, featureId, isActive);
        return isActive && endsConcentration(current, featureId) ? markConcentration(marked, null) : marked;
      };
      void commit(change, { kind: "feature-state", featureId, isActive }, () => setFeatureActive({ persId: pers.persId, featureId, isActive })).then(
        () => onFeaturesChanged?.(),
      );
    },
    [commit, onFeaturesChanged, pers.persId],
  );

  const onSpellCast = useCallback(
    (spell: EffectSpell, slotLabel?: string) => {
      const plan = planSpellCast(persRef.current, spell);
      const source = { spell, endsWithConcentration: plan.isConcentration };
      if (plan.isConcentration) void setConcentrationOn(spell);
      const offered = plan.offeredBuff;
      toast(plan.title, {
        description: [slotLabel, plan.endedName ? `«${plan.endedName}» завершено` : null].filter(Boolean).join(" · ") || undefined,
        action: offered ? { label: offered === "ENLARGE" ? "Збільшити себе" : "На себе", onClick: () => void setBuff(offered, true, source) } : undefined,
      });
    },
    [setBuff, setConcentrationOn],
  );

  const promptConcentrationCheck = useCallback(
    (damage: number) => {
      const concentration = findConcentration(pers);
      if (!concentration || damage <= 0) return;
      const dc = findConcentrationSaveDc(damage, pers.ruleset);
      const name = shortenSpellName(concentration.spell?.name ?? "заклинання");
      const rollSave = () =>
        openRoll({
          title: "Концентрація",
          subtitle: name,
          actions: [buildD20Action("save", "Ряткидок Статури", findConcentrationSaveBonus(statesPers), describeRollState(statesPers, { kind: "save", ability: "CON", isConcentration: true }, "SAVE"))],
          autoRollKey: "save",
          check: {
            dc,
            successText: "концентрація триває",
            failureText: "концентрацію втрачено",
            onResult: (isSuccess) => {
              if (isSuccess) return;
              void setConcentrationOn(null);
              toast(`Концентрацію на «${name}» втрачено`, { action: { label: "Повернути", onClick: () => void setConcentrationOn(concentration.spell) } });
            },
          },
        });
      toast(`Ряткидок концентрації · СК ${dc}`, { description: `«${name}»`, duration: 15000, action: { label: "Кинути", onClick: rollSave } });
    },
    [openRoll, pers, setConcentrationOn, statesPers],
  );

  return {
    pers,
    statesPers,
    isReadOnly,
    catalog,
    toggleableFeatures,
    activeFeatures: toggleableFeatures.filter((feature) => isFeatureActive(pers, feature.featureId)),
    concentration: findConcentration(pers),
    activeBuffKeys: listActiveBuffKeys(pers),
    exhaustionLevel: pers.exhaustionLevel ?? 0,
    isPanelOpen,
    setPanelOpen,
    isFeatureActive: (featureId) => isFeatureActive(pers, featureId),
    canActivateFeature: (featureId) => canActivateFeature(pers, featureId),
    findFeatureUses: (featureId) => findFeatureUses(groupedFeatures, featureId),
    setFeatureActive: setFeature,
    setConcentration: (spell) => void setConcentrationOn(spell),
    setBuff: (key, isActive, source) => void setBuff(key, isActive, source),
    setExhaustion: (level) => void commit((current) => markExhaustion(current, level), { kind: "exhaustion", level }, () => setExhaustion({ persId: pers.persId, level })),
    onSpellCast,
    promptConcentrationCheck,
  };
}

function findConcentrationSaveBonus(statesPers: PersWithRelations): number {
  return calculateFinalSave(statesPers, Ability.CON) + (readStateEffects(statesPers)?.concentrationSaveBonus ?? 0);
}

function endsConcentration(pers: PersWithRelations, featureId: number): boolean {
  const feature = collectActiveFeatures(pers).find((candidate) => candidate.featureId === featureId);
  return feature ? doesFeatureStateEndConcentration(feature.engName) : false;
}

function findCatalogSpell(catalog: readonly SpellBuffCatalogEntry[], key: SpellBuffKey): EffectSpell | null {
  const entry = catalog.find((candidate) => candidate.key === key);
  return entry ? { spellId: entry.spellId, name: entry.name, engName: "", hasConcentration: null } : null;
}

function findFeatureUses(groupedFeatures: CharacterFeaturesGroupedResult | null, featureId: number): FeatureUses {
  const items = groupedFeatures ? [...groupedFeatures.actions, ...groupedFeatures.bonusActions, ...groupedFeatures.reactions, ...groupedFeatures.passive] : [];
  const item = items.find((candidate) => candidate.featureId === featureId);
  if (!item || typeof item.usesPer !== "number") return null;
  return { remaining: item.usesRemaining ?? item.usesPer, max: item.usesPer };
}
