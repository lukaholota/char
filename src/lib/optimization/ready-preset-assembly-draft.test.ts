import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAssemblyTargetLevel, writeAssemblyDraft, EMPTY_ASSEMBLY_DRAFT } from "./ready-preset-assembly-draft";

const KEY = "dnd-preset-2014-monk-levels";
const items = new Map<string, string>();
const readSaved = () => JSON.parse(items.get(KEY) ?? "null");

beforeEach(() => {
  items.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), removeItem: (key: string) => void items.delete(key) });
});

describe("saveAssemblyTargetLevel", () => {
  const playerDraft = { ...EMPTY_ASSEMBLY_DRAFT, targetLevel: 5, requestIds: { 5: "8a4d7a52-6c6f-4d8e-9a77-3f3c3a1f0b11" }, choices: { "slot-3": ["shadow-blade"] } };

  it("sets level 1 over a saved higher level", () => {
    writeAssemblyDraft("monk", playerDraft);
    saveAssemblyTargetLevel("monk", 1);
    expect(readSaved().targetLevel).toBe(1);
  });

  it("changes only the level and keeps the player's saved choices", () => {
    writeAssemblyDraft("monk", playerDraft);
    saveAssemblyTargetLevel("monk", 8);
    const saved = readSaved();
    expect(saved.targetLevel).toBe(8);
    expect(saved.choices).toEqual({ "slot-3": ["shadow-blade"] });
    expect(saved.requestIds[5]).toBe("8a4d7a52-6c6f-4d8e-9a77-3f3c3a1f0b11");
    expect(saved.requestIds[8]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("starts a fresh draft when nothing is saved, and writes nothing for level 1", () => {
    saveAssemblyTargetLevel("monk", 1);
    expect(readSaved()).toBeNull();
    saveAssemblyTargetLevel("monk", 3);
    expect(readSaved()).toMatchObject({ targetLevel: 3, choices: {} });
  });
});
