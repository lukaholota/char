// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { countRemainingBuildPoints } from "@/lib/optimization/build-draft";
import { buildRecipeSchema } from "@/lib/optimization/schema";
import { buildReadyPresetDraft, readyPresetSchema } from "@/lib/optimization/ready-preset";
import { buildReadyPresetOptions } from "@/lib/optimization/ready-preset-options";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), capture: vi.fn() }));
vi.mock("@/lib/actions/character", () => ({ createCharacter: mocks.create }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/monitoring/rpgbot-analytics", () => ({ captureRpgbotEvent: mocks.capture }));

beforeEach(() => {
  vi.resetModules();
  Object.values(mocks).forEach((mock) => mock.mockReset());
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) });
  vi.stubGlobal("requestAnimationFrame", (run: () => void) => run());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function findEvents(name: string) {
  return mocks.capture.mock.calls.filter(([event]) => event === name).map(([, properties]) => properties);
}

describe.skipIf(!existsSync("data/rpgbot/ready-builds/monk-shadow-2014.json"))("ready preset analytics", () => {
  async function renderPreset() {
    const { useReadyPreset } = await import("@/lib/optimization/use-ready-preset");
    const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
    const preset = readyPresetSchema.parse(read("data/rpgbot/ready-builds/monk-shadow-2014.json"));
    const draft = buildReadyPresetDraft(buildRecipeSchema.parse(read(`data/rpgbot/builds/${preset.buildId}.json`)), preset, findCharacterCreationOptions("RULES_2014"));
    const options = buildReadyPresetOptions(draft, findCharacterCreationOptions("RULES_2014"));
    return renderHook(() => useReadyPreset(draft, "build-monk-shadow-2014", options));
  }

  it("reports the submit and the created character without customization and never reports abandonment afterwards", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 77 });
    const preset = await renderPreset();
    act(() => { preset.result.current.goToStep(3); preset.result.current.update({ name: "Мирон" }); });
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(findEvents("rpgbot_preset_submitted")).toEqual([expect.objectContaining({ preset_id: "build-monk-shadow-2014", customized_sections: [] })]);
    expect(findEvents("rpgbot_preset_created")).toEqual([expect.objectContaining({ preset_id: "build-monk-shadow-2014", pers_id: 77, customized_sections: [] })]);
    preset.unmount();
    expect(findEvents("rpgbot_preset_abandoned")).toEqual([]);
  });

  it("lists the sections the player changed before creating", async () => {
    mocks.create.mockResolvedValue({ success: true, persId: 5 });
    const preset = await renderPreset();
    const scores = preset.result.current.draft.asi!;
    const lowerable = scores.findIndex((score) => score.value > 8);
    const lowered = scores.map((score, index) => (index === lowerable ? { ...score, value: score.value - 1 } : score));
    act(() => { preset.result.current.goToStep(3); preset.result.current.update({ name: "Мирон", asi: lowered, points: countRemainingBuildPoints(lowered) }); });
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(findEvents("rpgbot_preset_created")[0]).toMatchObject({ customized_sections: ["abilities"] });
  });

  it("reports a validation failure without a submit", async () => {
    const preset = await renderPreset();
    act(() => preset.result.current.goToStep(3));
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(findEvents("rpgbot_preset_create_failed")).toEqual([{ preset_id: "build-monk-shadow-2014", reason: "validation", blocked_by: "Вкажіть імʼя персонажа." }]);
    expect(findEvents("rpgbot_preset_submitted")).toEqual([]);
  });

  it("reports a server failure and then abandonment when the player leaves on the name step", async () => {
    mocks.create.mockResolvedValue({ error: "Спробуйте ще раз" });
    const preset = await renderPreset();
    act(() => { preset.result.current.goToStep(3); preset.result.current.update({ name: "Мирон" }); });
    await act(async () => { await preset.result.current.confirmCreation(); });
    expect(findEvents("rpgbot_preset_create_failed")).toEqual([{ preset_id: "build-monk-shadow-2014", reason: "rejected" }]);
    preset.unmount();
    expect(findEvents("rpgbot_preset_abandoned")).toEqual([expect.objectContaining({ preset_id: "build-monk-shadow-2014", stage: "name" })]);
  });

  it("reports abandonment once when the player leaves the review step", async () => {
    const preset = await renderPreset();
    expect(preset.result.current.ready).toBe(true);
    window.dispatchEvent(new Event("pagehide"));
    preset.unmount();
    expect(findEvents("rpgbot_preset_abandoned")).toEqual([expect.objectContaining({ stage: "review", customized_sections: [] })]);
  });
});
