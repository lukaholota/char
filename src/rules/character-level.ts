/**
 * KR18.5 — рівень персонажа проти рівня класу (референс §4).
 *
 * Це два різні лічильники, і плутати їх не можна: у Wizard 2 / Fighter 3 рівень персонажа
 * дорівнює 5, рівень чарівника — 2, рівень воїна — 3. Драконячий політ важить перший,
 * підклас — другий. Тому тут два предикати, а не один `level >= n`.
 */

export type ClassLevel = { className: string; classLevel: number };

export type CharacterLevels = {
  characterLevel: number;
  classLevels: readonly ClassLevel[];
};

/** Рівневі риси видів 2024 відкриваються сумою рівнів усіх класів. */
export function hasCharacterLevelAtLeast(levels: CharacterLevels, requiredLevel: number): boolean {
  return levels.characterLevel >= requiredLevel;
}

/** Підклас, класові фічі й прогресія заклинань важать рівень одного конкретного класу. */
export function hasClassLevelAtLeast(levels: CharacterLevels, className: string, requiredLevel: number): boolean {
  return findClassLevel(levels, className) >= requiredLevel;
}

export function findClassLevel(levels: CharacterLevels, className: string): number {
  return levels.classLevels.find((entry) => entry.className === className)?.classLevel ?? 0;
}

/**
 * Питання, яке стосується лише рівня персонажа — риса виду, поріг бастіону, — рівнів класів не
 * знає й знати не мусить. Порожній список класів це і каже: жоден `hasClassLevelAtLeast` на
 * такому наборі не спрацює, бо стверджувати про клас тут нічого.
 */
export function characterLevelOnly(characterLevel: number): CharacterLevels {
  return { characterLevel, classLevels: [] };
}

/**
 * `pers.level` тримає рівень персонажа, `pers_multiclass.class_level` — рівні побічних класів,
 * а рівень основного класу ніде не збережений і виводиться відніманням.
 */
export function buildCharacterLevels(input: {
  characterLevel: number;
  mainClassName: string;
  multiclasses: readonly ClassLevel[];
}): CharacterLevels {
  const takenByMulticlasses = input.multiclasses.reduce((total, entry) => total + entry.classLevel, 0);
  const mainClassLevel = Math.max(1, input.characterLevel - takenByMulticlasses);

  return {
    characterLevel: input.characterLevel,
    classLevels: [{ className: input.mainClassName, classLevel: mainClassLevel }, ...input.multiclasses],
  };
}
