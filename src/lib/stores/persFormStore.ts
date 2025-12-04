import {PersFormData} from "@/lib/zod/schemas/persCreateSchema";
import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";

interface FormStore {
  formData: Partial<PersFormData>
  currentStep: number
  prevRaceId: number | null

  updateFormData: (data: Partial<PersFormData>) => void
  setCurrentStep: (step: number) => void
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

      updateFormData: (data) =>
        set((state) => ({
          formData: {...state.formData, ...data}
        })),

      setCurrentStep: (step: number) => set({currentStep: step}),

      resetForm: () => set({formData: {}, currentStep: 1}),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 7)
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
        currentStep: state.currentStep
      })
    }
  )
)