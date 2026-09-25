export type SubclassCard = { subclassId: number; name: string; legacySource?: string | null };

export function isLegacySubclassCard(subclass: SubclassCard): boolean {
  return Boolean(subclass.legacySource);
}

export function hasLegacySubclasses(subclasses: readonly SubclassCard[]): boolean {
  return subclasses.some(isLegacySubclassCard);
}

export function isLegacyChosen(subclasses: readonly SubclassCard[], chosenId: number | null | undefined): boolean {
  return subclasses.some((subclass) => subclass.subclassId === chosenId && isLegacySubclassCard(subclass));
}

export function splitSubclassesForStep<T extends SubclassCard>(
  subclasses: readonly T[],
  showLegacy: boolean,
  sortName: (subclass: T) => string,
): { current: T[]; legacy: T[] } {
  const sorted = [...subclasses].sort((a, b) => sortName(a).localeCompare(sortName(b), "uk", { sensitivity: "base" }));
  return {
    current: sorted.filter((subclass) => !isLegacySubclassCard(subclass)),
    legacy: showLegacy ? sorted.filter(isLegacySubclassCard) : [],
  };
}

/** Каталог `/2024/classes`: у `classes.json` позначка — `legacy`, а не `legacySource`. */
export function splitCatalogSubclasses<T extends { legacy?: boolean }>(subclasses: readonly T[]): { current: T[]; legacy: T[] } {
  return {
    current: subclasses.filter((subclass) => !subclass.legacy),
    legacy: subclasses.filter((subclass) => subclass.legacy),
  };
}
