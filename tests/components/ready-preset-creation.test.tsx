// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildReadyPresetOptions } from "@/lib/optimization/ready-preset-options";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/actions/character", () => ({ createCharacter: mocks.create }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ push: mocks.push }) }));

beforeEach(() => {
  vi.resetModules(); mocks.create.mockReset(); mocks.push.mockReset();
  const items = new Map<string, string>();
  const storage = { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) };
  vi.stubGlobal("localStorage", storage);
  storage.setItem("dnd-pers-form", JSON.stringify({ state: { formData: { name: "Мій Воїн", classId: 2 }, currentStep: 4, totalSteps: 8 }, version: 1 }));
  storage.setItem("dnd-pers-levelup", "unchanged-levelup");
  storage.setItem("dnd-2024-pers-form", "unchanged-2024");
});
afterEach(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); cleanup(); vi.unstubAllGlobals(); });

describe.skipIf(!existsSync("data/rpgbot/ready-builds/monk-shadow-2014.json"))("ready preset creation", () => {
  async function renderPreset(buildId = "build-monk-shadow-2014", slug = "monk-shadow-2014") {
    const { useReadyPreset } = await import("@/lib/optimization/use-ready-preset");
    const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
    const preset = readyPresetSchema.parse(read(`data/rpgbot/ready-builds/${slug}.json`));
    const draft = buildReadyPresetDraft(buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`)), preset, findCharacterCreationOptions("RULES_2014"));
    const options = buildReadyPresetOptions(draft, findCharacterCreationOptions("RULES_2014"));
    return renderHook(() => useReadyPreset(draft, buildId, options));
  }
  it("keeps the manual draft and level-up intact while reviewing and reloading", async () => {
    const manual = localStorage.getItem("dnd-pers-form");
    const preset = await renderPreset();
    expect(preset.result.current.ready).toBe(true);
    act(() => { preset.result.current.goToStep(2); preset.result.current.update({ name: "Мирон", languagesSchema: { languages: ["DWARVISH"] } }); });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(localStorage.getItem("dnd-pers-form")).toBe(manual);
    expect(localStorage.getItem("dnd-pers-levelup")).toBe("unchanged-levelup");
    expect(localStorage.getItem("dnd-2024-pers-form")).toBe("unchanged-2024");
    preset.unmount();
    const reloaded = await renderPreset();
    expect(reloaded.result.current.step).toBe(2);
    expect(reloaded.result.current.draft.languagesSchema?.languages).toEqual(["DWARVISH"]);
  });
  it("submits the complete level-one input only after explicit confirmation and retains data on failure", async () => {
    mocks.create.mockResolvedValue({ error: "Спробуйте ще раз" });
    const preset = await renderPreset();
    act(() => { preset.result.current.goToStep(3); preset.result.current.update({ name: " Мирон " }); });
    expect(mocks.create).not.toHaveBeenCalled();
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ name: "Мирон", ruleset: "RULES_2014", classId: 3, raceId: 4, featId: 61 });
    expect(mocks.create.mock.calls[0][0].skills).toHaveLength(5);
    expect(preset.result.current.error).toBe("Спробуйте ще раз");
    expect(preset.result.current.draft.name).toBe(" Мирон ");
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("offers explicit recovery for a broken preset without touching the manual character", async () => {
    const manual = localStorage.getItem("dnd-pers-form");
    localStorage.setItem("dnd-preset-2014-pers-form", JSON.stringify({ state: { formData: { classId: 3, name: "Пошкоджений" }, currentStep: 2, totalSteps: 3 }, version: 0 }));
    const preset = await renderPreset();
    expect(preset.result.current.ready).toBe(false);
    expect(preset.result.current.invalidSaved).toBe(true);
    act(() => preset.result.current.restartSavedPreset());
    expect(preset.result.current.ready).toBe(true);
    expect(preset.result.current.draft.skills).toHaveLength(5);
    expect(localStorage.getItem("dnd-pers-form")).toBe(manual);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps edited choices separate for each preset and restores the existing Shadow draft", async () => {
    const shadow = await renderPreset();
    act(() => shadow.result.current.update({ name: "Мирон" }));
    shadow.unmount();
    const other = await renderPreset("other-verified-preset");
    expect(other.result.current.draft.name).toBe("");
    expect(other.result.current.step).toBe(2);
    act(() => other.result.current.update({ name: "Олена" }));
    other.unmount();
    const restored = await renderPreset();
    expect(restored.result.current.draft.name).toBe("Мирон");
    expect(JSON.parse(localStorage.getItem("dnd-preset-2014-other-verified-preset-pers-form")!).state.formData.name).toBe("Олена");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps the reviewed draft on screen while navigation to the sheet is still in progress", async () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    mocks.create.mockResolvedValue({ persId: 12 });
    const preset = await renderPreset();
    act(() => preset.result.current.update({ name: "Мирон" }));
    act(() => preset.result.current.goToStep(3));
    const reviewedSkills = preset.result.current.draft.skillsSchema;
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.push).toHaveBeenCalledWith("/char/12");
    expect(reviewedSkills).toBeDefined();
    expect(preset.result.current.draft.skillsSchema).toEqual(reviewedSkills);
    expect(preset.result.current.draft.name).toBe("Мирон");
    expect(preset.result.current.step).toBe(3);
  });
  it("clears only the created preset after navigation has activated the manual form", async () => {
    let clearCreatedPreset: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { clearCreatedPreset = callback; return 1; });
    mocks.create.mockResolvedValue({ persId: 12 });
    const preset = await renderPreset();
    act(() => preset.result.current.update({ name: "Мирон" }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    preset.unmount();
    const { activateCreatorDraftStorage, usePersFormStore } = await import("@/lib/stores/persFormStore");
    act(() => activateCreatorDraftStorage("RULES_2014"));
    const manual = localStorage.getItem("dnd-pers-form");
    act(() => clearCreatedPreset!(0));
    expect(usePersFormStore.getState().formData.name).toBe("Мій Воїн");
    expect(localStorage.getItem("dnd-pers-form")).toBe(manual);
    expect(localStorage.getItem("dnd-preset-2014-pers-form")).toBeNull();
    expect(mocks.push).toHaveBeenCalledWith("/char/12");
  });
  it.each(["monk-shadow-2014", "monk-open-hand-2014", "fighter-champion-shield-2014", "fighter-champion-greataxe-2014", "barbarian-berserker-2014", "rogue-thief-2014", "wizard-evocation-2014", "cleric-life-2014", "druid-land-2014", "warlock-fiend-2014", "sorcerer-draconic-2014", "bard-lore-2014", "paladin-devotion-2014", "ranger-hunter-2014", "artificer-alchemist-2014"])("submits complete %s choices only after confirmation", async (slug) => {
    mocks.create.mockResolvedValue({ error: "Не збережено" });
    const preset = await renderPreset(`build-${slug}`, slug);
    expect(preset.result.current.ready).toBe(true);
    act(() => preset.result.current.update({ name: "  Олена  " }));
    expect(mocks.create).not.toHaveBeenCalled();
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ ...preset.result.current.draft, name: "Олена" });
    expect(preset.result.current.draft.name).toBe("  Олена  ");
  });
  it("sends the Tasha racial choices with the classic mode switched off and refuses a changed mode", async () => {
    mocks.create.mockResolvedValue({ error: "Не збережено" });
    const preset = await renderPreset("build-rogue-mastermind-2014", "rogue-mastermind-2014");
    act(() => preset.result.current.update({ name: "Фіра", isDefaultASI: true }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).not.toHaveBeenCalled();
    act(() => preset.result.current.update({ isDefaultASI: false }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    const sent = mocks.create.mock.calls[0][0];
    expect(sent.isDefaultASI).toBe(false);
    expect(sent.racialBonusChoiceSchema).toEqual({ basicChoices: [], tashaChoices: [
      { groupIndex: 0, choiceCount: 2, selectedAbilities: ["DEX", "CHA"] }, { groupIndex: 1, choiceCount: 1, selectedAbilities: ["DEX"] },
    ] });
  });
  it("sends the first-level subclass, subclass and race choices and spells of a caster as one input", async () => {
    mocks.create.mockResolvedValue({ error: "Не збережено" });
    const preset = await renderPreset("build-sorcerer-draconic-2014", "sorcerer-draconic-2014");
    act(() => preset.result.current.update({ name: "Джесхан" }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    const sent = mocks.create.mock.calls[0][0];
    expect(sent.subclassId).toBe(49);
    expect(Object.keys(sent.subclassChoiceSelections)).toEqual(["Дракон-предок"]);
    expect(Object.keys(sent.raceChoiceSelections)).toEqual(["Родовід дракона"]);
    expect(sent.classSpells.cantripIds).toHaveLength(4);
    expect(sent.classSpells.preparedIds).toHaveLength(2);
  });
  it.each([
    ["the dragon ancestor", () => ({ subclassChoiceSelections: {} }), "Завершіть вибори класу й раси."],
    ["the subclass", () => ({ subclassId: undefined }), "Чернетка належить іншому пресету — почніть заново."],
    ["a known spell", (draft: PersFormData) => ({ classSpells: { ...draft.classSpells!, preparedIds: draft.classSpells!.preparedIds.slice(1) } }), "Оберіть підготовлених заклинань: 2"],
    ["a duplicated cantrip", (draft: PersFormData) => ({ classSpells: { ...draft.classSpells!, cantripIds: [draft.classSpells!.cantripIds[0], ...draft.classSpells!.cantripIds.slice(0, 3)] } }), "Оберіть замовлянь: 4"],
    ["the racial ancestry", () => ({ raceChoiceSelections: {} }), "Завершіть вибори класу й раси."],
  ])("does not submit a Sorcerer without %s and names the problem", async (_label, breakDraft, problem) => {
    const preset = await renderPreset("build-sorcerer-draconic-2014", "sorcerer-draconic-2014");
    act(() => preset.result.current.update({ name: "Олена", ...breakDraft(preset.result.current.draft as PersFormData) }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(preset.result.current.error).toBe(problem);
  });
  it("does not submit a Fighter without the required fighting style", async () => {
    const preset = await renderPreset("build-fighter-champion-shield-2014", "fighter-champion-shield-2014");
    act(() => preset.result.current.update({ name: "Олена", classChoiceSelections: {} }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(preset.result.current.error).toBe("Завершіть вибори класу й раси.");
    expect(preset.result.current.draft.name).toBe("Олена");
  });
  it("ignores double submit while pending and after successful creation before navigation", async () => {
    let completeCreation!: (result: { persId: number }) => void;
    mocks.create.mockResolvedValue({ persId: 12 }).mockImplementationOnce(() => new Promise((resolve) => { completeCreation = resolve; }));
    const preset = await renderPreset();
    act(() => preset.result.current.update({ name: "Олена" }));
    let pendingCreation!: Promise<void>;
    act(() => { pendingCreation = preset.result.current.confirmCreation(); });
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).toHaveBeenCalledOnce();
    await act(async () => { completeCreation({ persId: 12 }); await pendingCreation; });
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledOnce();
  });
  describe("request id for server-side replay", () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const savedPresetKey = "dnd-preset-2014-pers-form";
    const readSavedRequestId = () => JSON.parse(localStorage.getItem(savedPresetKey)!).state.formData.readyPresetRequestId;

    it("creates one id on first open and keeps it in the preset draft only", async () => {
      const preset = await renderPreset();
      const requestId = preset.result.current.draft.readyPresetRequestId;
      expect(requestId).toMatch(uuidPattern);
      expect(readSavedRequestId()).toBe(requestId);
      expect(JSON.parse(localStorage.getItem("dnd-pers-form")!).state.formData.readyPresetRequestId).toBeUndefined();
    });
    it("sends the same id on retry after a server error and after reload", async () => {
      mocks.create.mockResolvedValue({ error: "Спробуйте ще раз" });
      const preset = await renderPreset();
      act(() => preset.result.current.update({ name: "Олена" }));
      await act(async () => { await preset.result.current.confirmCreation(); });
      await act(async () => { await preset.result.current.confirmCreation(); });
      preset.unmount();
      vi.resetModules();
      const reloaded = await renderPreset();
      expect(reloaded.result.current.ready).toBe(true);
      await act(async () => { await reloaded.result.current.confirmCreation(); });
      const sentIds = mocks.create.mock.calls.map(([input]) => input.readyPresetRequestId);
      expect(sentIds).toHaveLength(3);
      expect(new Set(sentIds).size).toBe(1);
      expect(sentIds[0]).toMatch(uuidPattern);
    });
    it("adds an id to a valid draft saved before ids existed", async () => {
      const first = await renderPreset();
      const { readyPresetRequestId: _removed, ...withoutId } = first.result.current.draft;
      first.unmount();
      vi.resetModules();
      localStorage.setItem(savedPresetKey, JSON.stringify({ state: { formData: withoutId, currentStep: 2, totalSteps: 3 }, version: 0 }));
      const legacy = await renderPreset();
      expect(legacy.result.current.ready).toBe(true);
      expect(legacy.result.current.draft.readyPresetRequestId).toMatch(uuidPattern);
      expect(readSavedRequestId()).toBe(legacy.result.current.draft.readyPresetRequestId);
    });
    it("issues a new id when the preset is explicitly restarted", async () => {
      const preset = await renderPreset();
      const firstId = preset.result.current.draft.readyPresetRequestId;
      act(() => preset.result.current.restartSavedPreset());
      expect(preset.result.current.draft.readyPresetRequestId).toMatch(uuidPattern);
      expect(preset.result.current.draft.readyPresetRequestId).not.toBe(firstId);
    });
    it("falls back to random bytes when randomUUID is unavailable", async () => {
      vi.stubGlobal("crypto", { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) });
      const preset = await renderPreset();
      expect(preset.result.current.draft.readyPresetRequestId).toMatch(uuidPattern);
    });
    it("starts a fresh id for the next preset after a successful creation clears the draft", async () => {
      vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
      mocks.create.mockResolvedValue({ persId: 12 });
      const preset = await renderPreset();
      const createdWith = preset.result.current.draft.readyPresetRequestId;
      act(() => preset.result.current.update({ name: "Олена" }));
      await act(async () => { await preset.result.current.confirmCreation(); });
      preset.unmount();
      expect(localStorage.getItem(savedPresetKey)).toBeNull();
      const next = await renderPreset();
      expect(next.result.current.draft.readyPresetRequestId).toMatch(uuidPattern);
      expect(next.result.current.draft.readyPresetRequestId).not.toBe(createdWith);
    });
  });
  it("allows retry after a server error without losing the chosen name", async () => {
    mocks.create.mockResolvedValueOnce({ error: "Спробуйте ще раз" }).mockResolvedValueOnce({ persId: 12 });
    const preset = await renderPreset();
    act(() => preset.result.current.update({ name: "Олена" }));
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(preset.result.current.draft.name).toBe("Олена");
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.push).toHaveBeenCalledWith("/char/12");
  });
});
