import { create } from "zustand";

interface OmniSearchState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useOmniSearchStore = create<OmniSearchState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
