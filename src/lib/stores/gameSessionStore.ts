import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GameRollVisibility } from "@/rules/game-roll";

export const GAME_SESSION_STORE_KEY = "holota-active-game-session";

type ActiveGameSession = { id: number; name: string };

type GameSessionState = {
  active: ActiveGameSession | null;
  visibilityBySession: Record<number, GameRollVisibility>;
  isHydrated: boolean;
  /// Відкрита сторінка кімнати: вкладка слухає її, навіть коли кімната в архіві й кидки туди не йдуть.
  viewedRoomId: number | null;
  isSoundOn: boolean;
  activate: (session: ActiveGameSession) => void;
  rename: (sessionId: number, name: string) => void;
  deactivate: (sessionId: number) => void;
  setVisibility: (sessionId: number, visibility: GameRollVisibility) => void;
  viewRoom: (sessionId: number | null) => void;
  toggleSound: () => void;
  markHydrated: () => void;
};

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      active: null,
      visibilityBySession: {},
      isHydrated: false,
      viewedRoomId: null,
      isSoundOn: true,
      activate: (session) => set({ active: session }),
      rename: (sessionId, name) => set((state) => (state.active?.id === sessionId && state.active.name !== name ? { active: { id: sessionId, name } } : state)),
      deactivate: (sessionId) => set((state) => (state.active?.id === sessionId ? { active: null } : state)),
      setVisibility: (sessionId, visibility) => set((state) => ({ visibilityBySession: { ...state.visibilityBySession, [sessionId]: visibility } })),
      viewRoom: (sessionId) => set({ viewedRoomId: sessionId }),
      toggleSound: () => set((state) => ({ isSoundOn: !state.isSoundOn })),
      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: GAME_SESSION_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ active, visibilityBySession, isSoundOn }) => ({ active, visibilityBySession, isSoundOn }),
      onRehydrateStorage: (initial) => () => initial.markHydrated(),
    },
  ),
);

export function readRollVisibility(sessionId: number): GameRollVisibility {
  return useGameSessionStore.getState().visibilityBySession[sessionId] ?? "PUBLIC";
}

/// Інша вкладка змінила кімнату — ця підхоплює, щоб лоток показував ту саму ціль, куди піде кидок.
export function followOtherTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === GAME_SESSION_STORE_KEY) void useGameSessionStore.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
