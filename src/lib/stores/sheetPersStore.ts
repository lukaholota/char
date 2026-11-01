import { create } from "zustand";

type SheetPers = { persId: number; name: string };

/// Лист, відкритий зараз і доступний для редагування: кидок з нього йде в журнал від імені цього персонажа.
export const useSheetPersStore = create<{ pers: SheetPers | null }>(() => ({ pers: null }));

export function showSheetPers(pers: SheetPers): () => void {
  useSheetPersStore.setState({ pers });
  return () => {
    if (useSheetPersStore.getState().pers?.persId === pers.persId) useSheetPersStore.setState({ pers: null });
  };
}
