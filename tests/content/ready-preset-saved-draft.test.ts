import { describe, expect, it, vi } from "vitest";
import { createJSONStorage, type StorageValue } from "zustand/middleware";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { countRemainingBuildPoints } from "@/lib/optimization/build-draft";
import { isSavedPresetCompatible, listSavedPresetIssues } from "@/lib/optimization/ready-preset-validation";
import { listOfferedStepChanges, presetSlugs, readPreset, type StepChange } from "../helpers/preset-step-changes";

vi.mock("server-only", () => ({}));

/// Чернетка пресета живе в localStorage між кроками й після перезавантаження.
/// Після збереження вона має відкриватися з тими самими виборами й тими самими підказками.

const CORRUPT_DRAFT = "Чернетка пошкоджена — почніть пресет заново.";
const OVERSPENT_ABILITIES = "Характеристики: витрачено забагато очок.";

type SavedDraft = { formData: Partial<PersFormData> };
const savedItems = new Map<string, string>();
const draftStorage = createJSONStorage<SavedDraft>(() => ({
  getItem: (key) => savedItems.get(key) ?? null,
  setItem: (key, value) => void savedItems.set(key, value),
  removeItem: (key) => void savedItems.delete(key),
}))!;

function saveAndReload(draft: Partial<PersFormData>): Partial<PersFormData> {
  draftStorage.setItem("dnd-preset-2014-test-pers-form", { state: { formData: draft }, version: 1 });
  return (draftStorage.getItem("dnd-preset-2014-test-pers-form") as StorageValue<SavedDraft>).state.formData;
}

function raiseAbility(draft: PersFormData, index: number): StepChange {
  const { ability, value } = draft.asi[index];
  const asi = draft.asi.map((score, position) => (position === index ? { ...score, value: value + 1 } : score));
  return { label: `${ability} ${value}→${value + 1} до зниження іншої`, draft: { ...draft, asi, points: (draft.points ?? 0) - (value >= 13 ? 2 : 1) } };
}

function listUnfinishedAbilityTrades(draft: PersFormData): StepChange[] {
  return draft.asi.flatMap((score, index) => (score.value < 15 ? [raiseAbility(draft, index)] : []));
}

function listReloadMismatches(draft: PersFormData, options: ReturnType<typeof readPreset>["options"]): string[] {
  const saved: StepChange[] = [{ label: "без змін", draft }, ...Object.values(listOfferedStepChanges(draft, options)).flat(), ...listUnfinishedAbilityTrades(draft)];
  return saved.flatMap(({ label, draft: changed }) => {
    const reloaded = saveAndReload(changed);
    const before = listSavedPresetIssues(changed, draft, options).map((issue) => issue.message);
    const after = listSavedPresetIssues(reloaded, draft, options).map((issue) => issue.message);
    if (!isSavedPresetCompatible(reloaded, draft)) return [`${label}: чернетку відкинуто після перезавантаження`];
    if (after.includes(CORRUPT_DRAFT)) return [`${label}: ${CORRUPT_DRAFT}`];
    return JSON.stringify(after) === JSON.stringify(before) ? [] : [`${label}: ${before.join("; ")} → ${after.join("; ")}`];
  });
}

describe("druid-dreams-githzerai-2014 saved while the player trades ability points", () => {
  it("reopens with the overspent abilities named instead of a corrupt draft", () => {
    const { draft, options } = readPreset("druid-dreams-githzerai-2014");
    const raisedIndex = draft.asi.findIndex((score) => score.ability !== "WIS" && score.value < 15);
    const reloaded = saveAndReload(raiseAbility(draft, raisedIndex).draft);
    expect(reloaded.points).toBeLessThan(0);
    expect(isSavedPresetCompatible(reloaded, draft)).toBe(true);
    expect(listSavedPresetIssues(reloaded, draft, options)).toEqual([{ step: "abilities", message: OVERSPENT_ABILITIES }]);
  });
});

describe("every ready preset draft survives a reload with the same checks", () => {
  it.each(presetSlugs)("%s", (slug) => {
    const { draft, options } = readPreset(slug);
    expect(draft.points ?? 0).toBe(countRemainingBuildPoints(draft.asi));
    expect(listReloadMismatches(draft, options).slice(0, 8)).toEqual([]);
  });
});
