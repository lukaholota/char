type AnyWeaponRow = { optionId: number; chooseAnyWeapon: boolean; weaponType: string | null; weaponCount: number | null; description?: string | null };
type PickableWeapon = { weaponId: number; name: string; weaponType: string; isRanged: boolean; sortOrder: number };

export function listAnyWeaponChoices<W extends PickableWeapon>(row: Pick<AnyWeaponRow, "weaponType" | "description">, weapons: readonly W[]): W[] {
  const isMeleeOnly = /рукопашн/i.test(row.description ?? "");
  return weapons
    .filter((weapon) => weapon.weaponType === row.weaponType && weapon.name !== "UNARMED_STRIKE" && !(isMeleeOnly && weapon.isRanged))
    .sort((left, right) => Number(left.isRanged) - Number(right.isRanged) || left.sortOrder - right.sortOrder);
}

export function countAnyWeaponPicks(row: Pick<AnyWeaponRow, "weaponCount">): number {
  return row.weaponCount || 1;
}

export function fillAnyWeaponPicks(row: AnyWeaponRow, existing: readonly number[], weapons: readonly PickableWeapon[]): number[] {
  const allowed = listAnyWeaponChoices(row, weapons).map((weapon) => weapon.weaponId);
  const kept = existing.filter((id) => allowed.includes(id));
  return Array.from({ length: countAnyWeaponPicks(row) }, (_, index) => kept[index] ?? allowed[index] ?? allowed[0])
    .filter((id): id is number => typeof id === "number");
}

/** Зброя на вибір лише там, де обраний варіант її дає: сервер створює кожну збережену зброю. */
export function keepAllowedWeaponPicks(rows: readonly AnyWeaponRow[], choiceGroupToId: Record<string, number[]>, picks: Record<string, number[]>, weapons: readonly PickableWeapon[]): Record<string, number[]> {
  return Object.fromEntries(Object.entries(choiceGroupToId).flatMap(([group, optionIds]) => {
    const row = rows.find((entry) => entry.chooseAnyWeapon && optionIds.includes(entry.optionId));
    return row ? [[group, fillAnyWeaponPicks(row, picks[group] ?? [], weapons)]] : [];
  }));
}
