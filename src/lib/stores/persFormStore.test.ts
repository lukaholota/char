import { beforeEach, describe, expect, it, vi } from "vitest";

type PersFormStoreModule = typeof import("./persFormStore");

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

const readDraft = (storage: ReturnType<typeof createLocalStorageStub>, key: string) => {
  const raw = storage.getItem(key);
  return raw ? JSON.parse(raw).state : null;
};

describe("persFormStore draft storage per flow", () => {
  let storage: ReturnType<typeof createLocalStorageStub>;
  let store: PersFormStoreModule;

  beforeEach(async () => {
    storage = createLocalStorageStub();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
    vi.resetModules();
    store = await import("./persFormStore");
  });

  it("keeps 2014 and 2024 drafts under separate keys", () => {
    store.usePersFormStore.getState().updateFormData({ classId: 14 });

    store.activateCreatorDraftStorage("RULES_2024");
    store.usePersFormStore.getState().updateFormData({ classId: 24 });

    expect(readDraft(storage, "dnd-pers-form").formData).toEqual({ classId: 14 });
    expect(readDraft(storage, "dnd-2024-pers-form").formData).toEqual({ classId: 24 });
  });

  it("does not carry a 2014 draft into an empty 2024 draft", () => {
    store.usePersFormStore.getState().updateFormData({ classId: 14 });
    store.usePersFormStore.getState().setCurrentStep(5);

    store.activateCreatorDraftStorage("RULES_2024");

    expect(store.usePersFormStore.getState().formData).toEqual({});
    expect(store.usePersFormStore.getState().currentStep).toBe(1);
  });

  it("restores each draft when switching back and forth", () => {
    store.usePersFormStore.getState().updateFormData({ classId: 14 });
    store.usePersFormStore.getState().setCurrentStep(3);

    store.activateCreatorDraftStorage("RULES_2024");
    store.usePersFormStore.getState().updateFormData({ classId: 24 });
    store.usePersFormStore.getState().setCurrentStep(2);

    store.activateCreatorDraftStorage("RULES_2014");
    expect(store.usePersFormStore.getState().formData).toEqual({ classId: 14 });
    expect(store.usePersFormStore.getState().currentStep).toBe(3);

    store.activateCreatorDraftStorage("RULES_2024");
    expect(store.usePersFormStore.getState().formData).toEqual({ classId: 24 });
    expect(store.usePersFormStore.getState().currentStep).toBe(2);
  });

  it("keeps the level-up draft out of the creator drafts", () => {
    store.usePersFormStore.getState().updateFormData({ classId: 14 });

    store.activateLevelUpDraftStorage();
    store.usePersFormStore.getState().resetForm();
    store.usePersFormStore.getState().updateFormData({ levelUpPath: "class" } as never);

    expect(readDraft(storage, "dnd-pers-levelup").formData).toEqual({ levelUpPath: "class" });
    expect(readDraft(storage, "dnd-pers-form").formData).toEqual({ classId: 14 });

    store.activateCreatorDraftStorage("RULES_2014");
    expect(store.usePersFormStore.getState().formData).toEqual({ classId: 14 });
  });

  it("clears only the active flow's draft", () => {
    store.usePersFormStore.getState().updateFormData({ classId: 14 });

    store.activateCreatorDraftStorage("RULES_2024");
    store.usePersFormStore.getState().updateFormData({ classId: 24 });
    store.usePersFormStore.persist.clearStorage();

    expect(storage.getItem("dnd-2024-pers-form")).toBeNull();
    expect(readDraft(storage, "dnd-pers-form").formData).toEqual({ classId: 14 });
  });
});
