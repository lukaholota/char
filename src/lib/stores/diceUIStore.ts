import { create } from "zustand";

import type { D20Mode } from "@/rules/dice-roll";

export type DiceMode = "free" | "roll";

/// Кубик, який стан додає до кидка: +к4 Благословення, −к4 Зменшення.
export type ExtraDie = { sides: number; sign: 1 | -1; label: string };

/// Що стан персонажа робить із кидком: режим к20, його джерела й додаткові кубики.
export type RollStateView = { mode: D20Mode; sources: string[]; extraDice: ExtraDie[] };

export interface DiceRollAction {
  key: string;
  label: string;
  count: number;
  sides: number;
  bonus: number;
  isD20: boolean;
  /// Режим, у якому кидок іде сам: Лють дає перевагу на Атлетику без жодного натискання.
  mode?: D20Mode;
  modeSources?: string[];
  extraDice?: ExtraDie[];
}

export interface DiceRollContext {
  title: string;
  subtitle?: string;
  actions: DiceRollAction[];
  /// Дія, яку панель кидає одразу після відкриття — тап по числу на листі і є кидком.
  autoRollKey?: string;
  onEdit?: () => void;
  /// Кидок проти СЛ (ряткидок концентрації): панель показує вердикт і повідомляє про нього раз.
  check?: { dc: number; successText: string; failureText: string; onResult: (isSuccess: boolean) => void };
}

interface DiceUIState {
  isOpen: boolean;
  mode: DiceMode;
  rollContext: DiceRollContext | null;
  toggle: () => void;
  open: () => void;
  openRoll: (context: DiceRollContext) => void;
  close: () => void;
}

const CLOSED = { isOpen: false, mode: "free", rollContext: null } as const;
const FREE = { isOpen: true, mode: "free", rollContext: null } as const;

export const useDiceUIStore = create<DiceUIState>((set) => ({
  ...CLOSED,
  toggle: () => set((state) => (state.isOpen ? CLOSED : FREE)),
  open: () => set(FREE),
  openRoll: (context) => set({ isOpen: true, mode: "roll", rollContext: context }),
  close: () => set(CLOSED),
}));
