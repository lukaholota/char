/// Кара 2014 — риса, а не заклинання, як у 2024: слот витрачається після влучання.
export function isDivineSmite2014(engName: string | null | undefined): boolean {
  return engName === "Divine Smite";
}

export function isLayOnHands(engName: string | null | undefined): boolean {
  return engName === "Lay on Hands" || engName === "Paladin: Lay On Hands (2024)";
}

/// 2к8 слотом 1-го рівня, +1к8 за кожен рівень вище, не більше 5к8; по нежиті чи нечисті ще +1к8.
export function countDivineSmiteDice(slotLevel: number, isUndeadOrFiend: boolean): number {
  return Math.min(5, 1 + Math.max(1, slotLevel)) + (isUndeadOrFiend ? 1 : 0);
}

/// Скільки очок запропонувати одразу: стільки, скільки бракує до повних хітів, але не більше за резерв.
export function findLayOnHandsDefault(remaining: number, missingHp: number): number {
  if (remaining <= 0) return 0;
  return Math.min(remaining, Math.max(1, missingHp));
}
