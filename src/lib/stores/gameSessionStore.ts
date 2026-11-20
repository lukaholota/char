import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GameRollVisibility } from "@/rules/game-roll";

export const GAME_SESSION_STORE_KEY = "holota-active-game-session";

type ActiveGameSession = { id: number; name: string };
export type PickableRollVisibility = Extract<GameRollVisibility, "PUBLIC" | "GM" | "SECRET">;

type GameSessionState = {
  active: ActiveGameSession | null;
  visibilityBySession: Record<number, GameRollVisibility>;
  targetCreatureBySession: Record<number, number>;
  /// Майстер цілиться в героя кидками зі статблоку; гравцю це поле ні до чого.
  targetHeroBySession: Record<number, number>;
  isHydrated: boolean;
  /// Відкрита сторінка кімнати: вкладка слухає її, навіть коли кімната в архіві й кидки туди не йдуть.
  viewedRoomId: number | null;
  isSoundOn: boolean;
  /// Гучність звуків сцени (ефекти й фон від майстра) на цьому пристрої, 0–100; кидки вимикає isSoundOn окремо.
  sceneVolume: number;
  /// На компʼютері журнал може жити внизу бічної колонки під листом, а не окремою вкладкою.
  isJournalDocked: boolean;
  sidePanelWidth: number;
  dockedJournalHeight: number;
  activate: (session: ActiveGameSession) => void;
  rename: (sessionId: number, name: string) => void;
  deactivate: (sessionId: number) => void;
  setVisibility: (sessionId: number, visibility: PickableRollVisibility) => void;
  setRollTarget: (sessionId: number, creatureId: number | null) => void;
  setHeroTarget: (sessionId: number, persId: number | null) => void;
  viewRoom: (sessionId: number | null) => void;
  toggleSound: () => void;
  setSceneVolume: (volume: number) => void;
  dockJournal: (isDocked: boolean) => void;
  resizeSidePanel: (width: number) => void;
  resizeDockedJournal: (height: number) => void;
  markHydrated: () => void;
};

export const DEFAULT_SIDE_PANEL_WIDTH = 416;
export const DEFAULT_DOCKED_JOURNAL_HEIGHT = 256;

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      active: null,
      visibilityBySession: {},
      targetCreatureBySession: {},
      targetHeroBySession: {},
      isHydrated: false,
      viewedRoomId: null,
      isSoundOn: true,
      sceneVolume: 70,
      isJournalDocked: false,
      sidePanelWidth: DEFAULT_SIDE_PANEL_WIDTH,
      dockedJournalHeight: DEFAULT_DOCKED_JOURNAL_HEIGHT,
      activate: (session) => set({ active: session }),
      rename: (sessionId, name) => set((state) => (state.active?.id === sessionId && state.active.name !== name ? { active: { id: sessionId, name } } : state)),
      deactivate: (sessionId) => set((state) => (state.active?.id === sessionId ? { active: null } : state)),
      setVisibility: (sessionId, visibility) => set((state) => ({ visibilityBySession: { ...state.visibilityBySession, [sessionId]: visibility } })),
      setRollTarget: (sessionId, creatureId) =>
        set((state) => {
          const { [sessionId]: previous, ...others } = state.targetCreatureBySession;
          if (creatureId === null) return previous === undefined ? state : { targetCreatureBySession: others };
          return previous === creatureId ? state : { targetCreatureBySession: { ...others, [sessionId]: creatureId } };
        }),
      setHeroTarget: (sessionId, persId) =>
        set((state) => {
          const { [sessionId]: previous, ...others } = state.targetHeroBySession;
          if (persId === null) return previous === undefined ? state : { targetHeroBySession: others };
          return previous === persId ? state : { targetHeroBySession: { ...others, [sessionId]: persId } };
        }),
      viewRoom: (sessionId) => set({ viewedRoomId: sessionId }),
      toggleSound: () => set((state) => ({ isSoundOn: !state.isSoundOn })),
      setSceneVolume: (sceneVolume) => set({ sceneVolume: Math.min(100, Math.max(0, Math.round(sceneVolume))) }),
      dockJournal: (isJournalDocked) => set({ isJournalDocked }),
      resizeSidePanel: (sidePanelWidth) => set({ sidePanelWidth }),
      resizeDockedJournal: (dockedJournalHeight) => set({ dockedJournalHeight }),
      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: GAME_SESSION_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ active, visibilityBySession, targetCreatureBySession, targetHeroBySession, isSoundOn, sceneVolume, isJournalDocked, sidePanelWidth, dockedJournalHeight }) => ({ active, visibilityBySession, targetCreatureBySession, targetHeroBySession, isSoundOn, sceneVolume, isJournalDocked, sidePanelWidth, dockedJournalHeight }),
      onRehydrateStorage: (initial) => () => initial.markHydrated(),
    },
  ),
);

/// Збережене «Лише мені» більше не обирається; зберігаємо найближче безпечне — «Майстру».
export function selectRollVisibility(state: Pick<GameSessionState, "visibilityBySession">, sessionId: number | undefined): PickableRollVisibility {
  const stored = sessionId === undefined ? undefined : state.visibilityBySession[sessionId];
  if (stored === undefined || stored === "PUBLIC") return "PUBLIC";
  return stored === "SECRET" ? "SECRET" : "GM";
}

export function readRollVisibility(sessionId: number): PickableRollVisibility {
  return selectRollVisibility(useGameSessionStore.getState(), sessionId);
}


/// Інша вкладка змінила кімнату — ця підхоплює, щоб лоток показував ту саму ціль, куди піде кидок.
export function followOtherTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === GAME_SESSION_STORE_KEY) void useGameSessionStore.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function readRollTargetCreatureId(sessionId: number): number | null {
  return useGameSessionStore.getState().targetCreatureBySession[sessionId] ?? null;
}

export function readHeroTargetPersId(sessionId: number): number | null {
  return useGameSessionStore.getState().targetHeroBySession[sessionId] ?? null;
}
