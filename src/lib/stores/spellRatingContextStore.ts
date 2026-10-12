import { create } from "zustand";
import type { RatedCaster } from "@/lib/optimization/spell-rating-casters";

interface SpellRatingContextState {
  casters: RatedCaster[];
  setCasters: (casters: RatedCaster[]) => void;
  isRatingFocusRequested: boolean;
  requestRatingFocus: () => void;
  clearRatingFocus: () => void;
}

export const useSpellRatingContextStore = create<SpellRatingContextState>((set) => ({
  casters: [],
  setCasters: (casters) => set({ casters }),
  isRatingFocusRequested: false,
  requestRatingFocus: () => set({ isRatingFocusRequested: true }),
  clearRatingFocus: () => set({ isRatingFocusRequested: false }),
}));
