// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildDraftSchema, countRemainingBuildPoints } from "@/lib/optimization/build-draft";

let store: typeof import("@/lib/stores/persFormStore");
let handoff: typeof import("@/lib/optimization/build-handoff");
beforeEach(async () => {
  vi.resetModules();
  for (const name of ["localStorage", "sessionStorage"]) {
    const entries = new Map<string, string>();
    vi.stubGlobal(name, {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
      clear: () => entries.clear(),
    });
  }
  store = await import("@/lib/stores/persFormStore");
  handoff = await import("@/lib/optimization/build-handoff");
  const { activateCreatorDraftStorage, usePersFormStore } = store;
  localStorage.clear(); sessionStorage.clear();
  activateCreatorDraftStorage("RULES_2014");
  usePersFormStore.getState().resetForm();
});
afterEach(() => vi.unstubAllGlobals());

it("replaces only after applying and restores the exact manual draft and step", () => {
  const { usePersFormStore } = store;
  const { applyBuildDraft, findBuildBackupKey, restoreCreatorBackup } = handoff;
  const manual = { name: "Ручна чернетка", classId: 2, raceId: 4 };
  const state = usePersFormStore.getState();
  state.updateFormData(manual); state.setCurrentStep(3); state.setTotalSteps(9);
  applyBuildDraft({ ruleset: "RULES_2014", classId: 3 }, "asi", "RULES_2014");
  expect(usePersFormStore.getState().formData).toEqual({ ruleset: "RULES_2014", classId: 3 });
  expect(JSON.parse(localStorage.getItem(findBuildBackupKey("RULES_2014"))!).formData).toEqual(manual);
  expect(restoreCreatorBackup("RULES_2014")).toBe(true);
  expect(usePersFormStore.getState().formData).toEqual(manual);
  expect(usePersFormStore.getState().currentStep).toBe(3);
  expect(sessionStorage.getItem("rpgbot-creator-step")).toBeNull();
});

it("keeps another edition's creator draft unchanged", () => {
  const { applyBuildDraft } = handoff;
  const saved2024 = JSON.stringify({ state: { formData: { ruleset: "RULES_2024", classId: 344 }, currentStep: 3, totalSteps: 8 }, version: 0 });
  localStorage.setItem("dnd-2024-pers-form", saved2024);
  applyBuildDraft({ ruleset: "RULES_2014", classId: 3 }, "asi", "RULES_2014");
  expect(localStorage.getItem("dnd-2024-pers-form")).toBe(saved2024);
});

it("counts point buy and rejects duplicate or out-of-range saved abilities", () => {
  const scores = ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((ability, index) => ({ ability, value: [8, 15, 15, 8, 15, 8][index] }));
  expect(countRemainingBuildPoints(scores)).toBe(0);
  expect(countRemainingBuildPoints(scores.map((score) => ({ ...score, value: 15 })))).toBe(-27);
  const draft = { buildId: "build-monk", revisionId: "v1", scores, notes: "", customized: false };
  expect(buildDraftSchema.safeParse(draft).success).toBe(true);
  expect(buildDraftSchema.safeParse({ ...draft, scores: scores.map((score) => ({ ...score, ability: "STR" })) }).success).toBe(false);
});
