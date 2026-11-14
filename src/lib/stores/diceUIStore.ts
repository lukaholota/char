import { create } from "zustand";

import type { D20Mode } from "@/rules/dice-roll";
import type { SaveEffect } from "@/rules/creature-save";
import type { AreaShape } from "@/rules/game-areas";
import type { SaveSpellRef } from "@/rules/game-roll-saves";
import type { RollTargetRef, RollTargets } from "@/rules/map-target-picks";

export type DiceMode = "free" | "roll";

/// Кубик, який стан додає до кидка: +к4 Благословення, −к4 Зменшення.
export type ExtraDie = { sides: number; sign: 1 | -1; label: string };

/// Що стан персонажа робить із кидком: режим к20, його джерела й додаткові кубики.
export type RollStateView = { mode: D20Mode; sources: string[]; extraDice: ExtraDie[] };

/// Ряткидок без шкоди, який кидає кімната: на столі кубиків немає, результат приходить із сервера.
export type TargetSaveRequest = { abilityName: string; dc: number; effect: SaveEffect };

export interface DiceRollAction {
  key: string;
  label: string;
  count: number;
  sides: number;
  /// Кубики шкоди другого типу в тому самому кидку (Крижаний шторм — 2к8 + 4к6).
  secondDice?: { count: number; sides: number };
  bonus: number;
  isD20: boolean;
  /// Режим, у якому кидок іде сам: Лють дає перевагу на Атлетику без жодного натискання.
  mode?: D20Mode;
  modeSources?: string[];
  extraDice?: ExtraDie[];
  targetSave?: TargetSaveRequest;
}

export interface DiceRollContext {
  title: string;
  subtitle?: string;
  actions: DiceRollAction[];
  /// Дія, яку панель кидає одразу після відкриття — тап по числу на листі і є кидком.
  autoRollKey?: string;
  onEdit?: () => void;
  /// Кидок істоти з бестіарію йде в кімнату вільним кидком, а не від персонажа з листа.
  isCreatureRoll?: boolean;
  /// Кидок проти СК (ряткидок концентрації): панель показує вердикт і повідомляє про нього раз.
  check?: { dc: number; successText: string; failureText: string; onResult: (isSuccess: boolean) => void };
  /// Ряткидок, який кидає ціль заклинання: панель і журнал показують його СК поруч зі шкодою.
  /// spell — щоб кімната кинула ряткидки цілей сама й зняла половину чи нічого.
  /// effect — дія статблоку (подих дракона): без заклинання кімната не знає ні ряткидка, ні виду шкоди.
  targetSave?: { abilityName: string; dc: number; spell?: SaveSpellRef; effect?: SaveEffect };
  /// Область дії істоти (подих, вибух): кімната з мапою спершу просить її поставити.
  targetArea?: { label: string; shape: AreaShape; sizeFeet: number };
  /// Хто в зоні, накладеній на мапі: шкода йде всім їм — і ворогам, і своїм, — а не обраній цілі.
  areaTargets?: RollTargets;
  /// Скільки цілей обрати на мапі: промені й дротики можна розвести по різних токенах або вліпити в один.
  targetPicks?: { count: number; isSummed: boolean };
  /// Ціль, обрана на мапі саме для цього кидка; null — кидок свідомо без цілі.
  rollTarget?: RollTargetRef | null;
  /// Наступний промінь чи дротик: панель пропонує кинути його по своїй цілі.
  next?: DiceRollContext;
}

interface DiceUIState {
  isOpen: boolean;
  mode: DiceMode;
  rollContext: DiceRollContext | null;
  /// Прихованість належить кидку на столі, а не поточному вибору «кому»: інакше перемикач на «Усім» відкрив би давній секретний результат.
  areResultsHidden: boolean;
  setResultsHidden: (areResultsHidden: boolean) => void;
  toggle: () => void;
  open: () => void;
  openRoll: (context: DiceRollContext) => void;
  close: () => void;
}

const CLOSED = { isOpen: false, mode: "free", rollContext: null, areResultsHidden: false } as const;
const FREE = { isOpen: true, mode: "free", rollContext: null, areResultsHidden: false } as const;

export const useDiceUIStore = create<DiceUIState>((set) => ({
  ...CLOSED,
  toggle: () => set((state) => (state.isOpen ? CLOSED : FREE)),
  open: () => set(FREE),
  openRoll: (context) => set({ isOpen: true, mode: "roll", rollContext: context, areResultsHidden: false }),
  setResultsHidden: (areResultsHidden) => set({ areResultsHidden }),
  close: () => set(CLOSED),
}));
