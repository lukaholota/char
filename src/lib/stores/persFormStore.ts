import {PersFormData} from "@/lib/zod/schemas/persCreateSchema";
import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";

interface FormStore {
  formData: Partial<PersFormData>
  currentStep: number
  prevRaceId: number | null
  totalSteps: number

  updateFormData: (data: Partial<PersFormData>) => void
  setCurrentStep: (step: number) => void
  setTotalSteps: (total: number) => void
  resetForm: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setPrevRaceId: (id: number) => void;
}

export const usePersFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      formData: {},
      currentStep: 1,
      prevRaceId: null,
      totalSteps: 7,

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

      resetForm: () => set({formData: {}, currentStep: 1, prevRaceId: null, totalSteps: 7}),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, state.totalSteps || 7)
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1)
        })),
      setPrevRaceId: (id: number) => set({ prevRaceId: id }),
    }),
    {
      name: "dnd-pers-form",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        formData: state.formData,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
      })
    }
  )
)
