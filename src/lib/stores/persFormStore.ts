import {PersFormData} from "@/lib/zod/schemas/persCreateSchema";
import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";

export type DraftRuleset = "RULES_2014" | "RULES_2024";

type DraftScope = "CREATOR_2014" | "CREATOR_2024" | "LEVEL_UP" | "SHEET_FEAT";

const DRAFT_STORAGE_KEY_BY_SCOPE: Record<DraftScope, string> = {
  CREATOR_2014: "dnd-pers-form",
  CREATOR_2024: "dnd-2024-pers-form",
  LEVEL_UP: "dnd-pers-levelup",
  SHEET_FEAT: "dnd-pers-sheet-feat",
};

const createEmptyDraft = () => ({
  formData: {} as Partial<PersFormData>,
  currentStep: 1,
  prevRaceId: null as number | null,
  totalSteps: 7,
});

interface FormStore {
  formData: Partial<PersFormData>
  currentStep: number
  prevRaceId: number | null
  totalSteps: number
  isHydrated: boolean
  resetNonce: number

  updateFormData: (data: Partial<PersFormData>) => void
  setCurrentStep: (step: number) => void
  setTotalSteps: (total: number) => void
  resetForm: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setPrevRaceId: (id: number) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const usePersFormStore = create<FormStore>()(
  persist(
    (set) => ({
      ...createEmptyDraft(),
      isHydrated: false,
      resetNonce: 0,

      updateFormData: (data) =>
        set((state) => {
          const next = { ...state.formData, ...data };

          // avoid re-render loops when values are unchanged (deep-ish compare)
          const isEqualValue = (a: unknown, b: unknown) => {
            if (a === b) return true;
            if (typeof a === "object" && typeof b === "object") {
              try {
                return JSON.stringify(a) === JSON.stringify(b);
              } catch {
                return false;
              }
            }
            return false;
          };

          const changed = Object.keys(next).some((key) => {
            const k = key as keyof PersFormData;
            return !isEqualValue(state.formData[k], next[k]);
          });

          return changed ? { formData: next } : state;
        }),

      setCurrentStep: (step: number) => set({currentStep: step}),
      setTotalSteps: (total: number) => set({ totalSteps: total }),

      resetForm: () =>
        set((state) => ({
          ...createEmptyDraft(),
          resetNonce: state.resetNonce + 1,
        })),

      nextStep: () =>
        set((state) => ({
          currentStep: state.currentStep + 1
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1)
        })),
      setPrevRaceId: (id: number) => set({ prevRaceId: id }),
      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
    }),
    {
      name: DRAFT_STORAGE_KEY_BY_SCOPE.CREATOR_2014,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        formData: state.formData,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
      }),
      // Креатор 2014, креатор 2024 і левелап мають свої ключі, тож при перемиканні
      // чернетка попереднього не має протікати в стан, коли під новим ключем
      // ще нічого не збережено.
      merge: (persistedDraft, currentState) => ({
        ...currentState,
        ...createEmptyDraft(),
        ...(persistedDraft as Partial<FormStore> | undefined),
      }),
      onRehydrateStorage: () => (state) => {
        // Called after state is hydrated from storage
        if (state) {
          state.setHydrated(true);
        }
      }
    }
  )
)

function findPersDraftStorageKey(scope: DraftScope): string {
  return DRAFT_STORAGE_KEY_BY_SCOPE[scope];
}

export function activateCreatorDraftStorage(ruleset: DraftRuleset): void {
  activateDraftStorage(ruleset === "RULES_2024" ? "CREATOR_2024" : "CREATOR_2014");
}

export function activateLevelUpDraftStorage(): void {
  activateDraftStorage("LEVEL_UP");
}

export function activateSheetFeatDraftStorage(): void {
  activateDraftStorage("SHEET_FEAT");
}

function activateDraftStorage(scope: DraftScope): void {
  const draftStorage = usePersFormStore.persist;
  if (typeof window === "undefined" || !draftStorage) return;

  const nextKey = findPersDraftStorageKey(scope);
  if (draftStorage.getOptions().name === nextKey) return;

  draftStorage.setOptions({ name: nextKey });
  draftStorage.rehydrate();
}
