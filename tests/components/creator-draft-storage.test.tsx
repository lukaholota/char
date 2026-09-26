// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { z } from "zod";

type PersFormStoreModule = typeof import("@/lib/stores/persFormStore");
type DraftRuleset = "RULES_2014" | "RULES_2024";

const createLocalStorageStub = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
};

const writeDraft = (storage: ReturnType<typeof createLocalStorageStub>, key: string, classId: number) =>
  storage.setItem(key, JSON.stringify({ state: { formData: { classId }, currentStep: 1, totalSteps: 7 }, version: 0 }));

const readDraft = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null")?.state.formData;

const RENDER_LIMIT = 50;

let store: PersFormStoreModule;
let probeRenderCount = 0;

function DraftProbe({ ruleset }: { ruleset: DraftRuleset }) {
  probeRenderCount += 1;
  if (probeRenderCount > RENDER_LIMIT) throw new Error("чернетки редакцій перемикаються по колу");
  const isActive = store.useCreatorDraftStorage(ruleset);
  const classId = store.usePersFormStore((state) => state.formData.classId);
  return <p data-testid={ruleset}>{isActive ? `active ${classId}` : "inactive"}</p>;
}

const raceStepSchema = z.object({ classId: z.number().optional(), raceSearch: z.string().default("") });

function RaceStepProbe({ ruleset }: { ruleset: DraftRuleset }) {
  const isActive = store.useCreatorDraftStorage(ruleset);
  return isActive ? <RaceStep /> : null;
}

function RaceStep() {
  stepForm.useStepForm(raceStepSchema);
  return null;
}

let stepForm: typeof import("@/hooks/useStepForm");

beforeEach(async () => {
  const storage = createLocalStorageStub();
  writeDraft(storage, "dnd-pers-form", 14);
  writeDraft(storage, "dnd-2024-pers-form", 24);
  vi.stubGlobal("localStorage", storage);
  vi.resetModules();
  probeRenderCount = 0;
  store = await import("@/lib/stores/persFormStore");
  stepForm = await import("@/hooks/useStepForm");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("чернетка конструктора при перемиканні редакції", () => {
  it("відкриває чернетку своєї редакції після монтування", () => {
    render(<DraftProbe ruleset="RULES_2024" />);

    expect(screen.getByTestId("RULES_2024").textContent).toBe("active 24");
  });

  it("стара сторінка, що ще змонтована, не повертає свою чернетку", () => {
    render(<DraftProbe ruleset="RULES_2024" />);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    act(() => {
      render(<DraftProbe ruleset="RULES_2014" />);
    });

    expect(store.usePersFormStore.persist.getOptions().name).toBe("dnd-pers-form");
    expect(screen.getByTestId("RULES_2014").textContent).toBe("active 14");
    expect(screen.getByTestId("RULES_2024").textContent).toBe("inactive");
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("крок, що закривається разом зі старою сторінкою, не пише в чернетку нової", () => {
    const page = render(<RaceStepProbe ruleset="RULES_2024" />);
    act(() => store.usePersFormStore.getState().updateFormData({ classId: undefined }));

    page.rerender(<DraftProbe ruleset="RULES_2014" />);

    expect(readDraft("dnd-pers-form")).toEqual({ classId: 14 });
  });
});
