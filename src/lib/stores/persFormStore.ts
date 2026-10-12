import {PersFormData} from "@/lib/zod/schemas/persCreateSchema";
import {useLayoutEffect, useSyncExternalStore} from "react";
import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";

export type DraftRuleset = "RULES_2014" | "RULES_2024";

type FixedDraftScope = "CREATOR_2014" | "CREATOR_2024" | "PRESET_2014" | "LEVEL_UP" | "SHEET_FEAT";
type DraftScope = FixedDraftScope | `PRESET_2014:${string}`;

const DRAFT_STORAGE_KEY_BY_SCOPE: Record<FixedDraftScope, string> = {
  CREATOR_2014: "dnd-pers-form",
  CREATOR_2024: "dnd-2024-pers-form",
  PRESET_2014: "dnd-preset-2014-pers-form",
  LEVEL_UP: "dnd-pers-levelup",
  SHEET_FEAT: "dnd-pers-sheet-feat",
};

const DRAFT_STORAGE_VERSION = 1;

// The store hydrates the 2014 draft on any page (level-up, sheet), so the notice must outlive that page.
const DRAFT_RESET_NOTICE_KEY = "dnd-pers-form-reset-notice";
let hydratingDraftKey = DRAFT_STORAGE_KEY_BY_SCOPE.CREATOR_2014;

export function consumeDraftResetNotice(): boolean {
  try {
    const wasReset = localStorage.getItem(DRAFT_RESET_NOTICE_KEY) === "1";
    localStorage.removeItem(DRAFT_RESET_NOTICE_KEY);
    return wasReset;
  } catch {
    return false;
  }
}

function rememberDraftResetNotice(): void {
  try {
    localStorage.setItem(DRAFT_RESET_NOTICE_KEY, "1");
  } catch {
    // Without storage there is no draft to lose either.
  }
}

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
      version: DRAFT_STORAGE_VERSION,
      migrate: (persistedDraft, storedVersion) => migrateDraft(persistedDraft as Partial<FormStore>, storedVersion),
      onRehydrateStorage: () => (state) => {
        // Called after state is hydrated from storage
        if (state) {
          state.setHydrated(true);
        }
      }
    }
  )
)

// Версія 1: конструктор 2014 починається з класу, тож чернетку зі старим порядком кроків скидаємо.
function migrateDraft(persistedDraft: Partial<FormStore>, storedVersion: number): Partial<FormStore> {
  const isOldCreator2014Draft = storedVersion < 1 && hydratingDraftKey === DRAFT_STORAGE_KEY_BY_SCOPE.CREATOR_2014;
  if (!isOldCreator2014Draft) return persistedDraft;
  const { formData, currentStep } = persistedDraft;
  if (formData?.raceId || formData?.classId || (currentStep ?? 1) > 1) rememberDraftResetNotice();
  return createEmptyDraft();
}

function findPersDraftStorageKey(scope: DraftScope): string {
  if (scope.startsWith("PRESET_2014:")) return `dnd-preset-2014-${scope.slice("PRESET_2014:".length)}-pers-form`;
  return DRAFT_STORAGE_KEY_BY_SCOPE[scope as FixedDraftScope];
}

function findCreatorDraftScope(ruleset: DraftRuleset): DraftScope {
  return ruleset === "RULES_2024" ? "CREATOR_2024" : "CREATOR_2014";
}

export function activateCreatorDraftStorage(ruleset: DraftRuleset): void {
  activateDraftStorage(findCreatorDraftScope(ruleset));
}

// Перемикати ключ під час рендера не можна: при переході між редакціями стара сторінка
// ще змонтована, перерендерюється від rehydrate і повертає свій ключ — пінг-понг на секунди.
export function useCreatorDraftStorage(ruleset: DraftRuleset): boolean {
  return useDraftStorage(findCreatorDraftScope(ruleset));
}

export function usePresetDraftStorage(buildId: string): boolean {
  return useDraftStorage(buildId === "build-monk-shadow-2014" ? "PRESET_2014" : `PRESET_2014:${buildId}`);
}

function useDraftStorage(scope: DraftScope): boolean {
  const isActive = useSyncExternalStore(
    usePersFormStore.subscribe,
    () => isDraftStorageActive(scope),
    () => isDraftStorageActive(scope),
  );

  useLayoutEffect(() => {
    activateDraftStorage(scope);
  }, [scope]);

  return isActive;
}

export function activateLevelUpDraftStorage(): void {
  activateDraftStorage("LEVEL_UP");
}

export function activateSheetFeatDraftStorage(): void {
  activateDraftStorage("SHEET_FEAT");
}

export function findActiveDraftStorageKey(): string | undefined {
  return usePersFormStore.persist?.getOptions().name;
}

function isDraftStorageActive(scope: DraftScope): boolean {
  return findActiveDraftStorageKey() === findPersDraftStorageKey(scope);
}

function activateDraftStorage(scope: DraftScope): void {
  const draftStorage = usePersFormStore.persist;
  if (typeof window === "undefined" || !draftStorage) return;

  const nextKey = findPersDraftStorageKey(scope);
  if (draftStorage.getOptions().name === nextKey) return;

  hydratingDraftKey = nextKey;
  draftStorage.setOptions({ name: nextKey });
  draftStorage.rehydrate();
}
