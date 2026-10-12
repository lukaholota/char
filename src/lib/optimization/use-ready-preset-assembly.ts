"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMPTY_ASSEMBLY_DRAFT, ensureRequestId, readAssemblyDraft, removeAssemblyDraft, writeAssemblyDraft, type AssemblyDraft,
} from "./ready-preset-assembly-draft";
import type { AdvancementChoice } from "./ready-preset-advancements";
import { buildAdvancementKey } from "./ready-preset-advancements";
import { buildOptionKey } from "./ready-preset-class-options";
import { isSelectableTargetLevel, type ReadyPresetLevels } from "./ready-preset-levels";

export function useReadyPresetAssembly(buildId: string, levels: ReadyPresetLevels | null) {
  const [draft, setDraft] = useState<AssemblyDraft>(EMPTY_ASSEMBLY_DRAFT);
  const [isLoaded, setIsLoaded] = useState(levels === null);
  const draftRef = useRef(draft);

  useEffect(() => {
    if (!levels) return;
    const saved = readAssemblyDraft(buildId, levels);
    draftRef.current = saved;
    setDraft(saved);
    if (saved.targetLevel > 1) writeAssemblyDraft(buildId, saved);
    setIsLoaded(true);
  }, [buildId, levels]);

  function commit(next: AssemblyDraft) {
    draftRef.current = next;
    setDraft(next);
    writeAssemblyDraft(buildId, next);
  }

  function selectLevel(level: number) {
    if (!levels || !isSelectableTargetLevel(levels, level)) return;
    commit(ensureRequestId({ ...draftRef.current, targetLevel: level }));
  }

  function chooseSpell(slotId: string, count: number, index: number, key: string, shownKeys: readonly string[] = []) {
    const current = draftRef.current.choices[slotId] ?? shownKeys;
    const next = Array.from({ length: count }, (_, position) => (position === index ? key : current[position] ?? ""));
    commit({ ...draftRef.current, choices: { ...draftRef.current.choices, [slotId]: next } });
  }

  function chooseSpells(slotId: string, keys: string[]) {
    commit({ ...draftRef.current, choices: { ...draftRef.current.choices, [slotId]: keys } });
  }

  function chooseAdvancement(characterLevel: number, choice: AdvancementChoice) {
    commit({ ...draftRef.current, advancements: { ...draftRef.current.advancements, [buildAdvancementKey(characterLevel)]: choice } });
  }

  function chooseClassOptions(characterLevel: number, names: string[]) {
    commit({ ...draftRef.current, classOptionChoices: { ...draftRef.current.classOptionChoices, [buildOptionKey(characterLevel)]: names } });
  }

  function choosePreparedSpells(keys: string[]) {
    commit({ ...draftRef.current, preparedSpellKeys: keys });
  }

  function reset() {
    draftRef.current = EMPTY_ASSEMBLY_DRAFT;
    setDraft(EMPTY_ASSEMBLY_DRAFT);
    removeAssemblyDraft(buildId);
  }

  return {
    isLoaded,
    targetLevel: draft.targetLevel,
    requestId: draft.requestIds[draft.targetLevel] ?? null,
    choices: draft.choices,
    advancements: draft.advancements,
    classOptionChoices: draft.classOptionChoices,
    preparedSpellKeys: draft.preparedSpellKeys,
    selectLevel, chooseSpell, chooseSpells, chooseAdvancement, chooseClassOptions, choosePreparedSpells, reset,
  };
}

export type ReadyPresetAssembly = ReturnType<typeof useReadyPresetAssembly>;
