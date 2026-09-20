/**
 * Заклинання, які дає обрана опція підкласу 2024: Коло землі — «choose one type of land …
 * you have the spells listed for your Druid level and lower prepared».
 *
 * Опція несе самі заклинання (звʼязок «фіча → заклинання»), а рівня класу на цьому звʼязку
 * немає. Рядок таблиці в книзі — це рівень, на якому клас уперше отримує слот рівня заклинання,
 * і замовляння приходять із рівнем вибору; `tests/content/subclass-option-spells-2024.test.ts`
 * звіряє цей вивід із таблицями SRD, тож розбіжність із книгою зробила б гейт червоним.
 */

import type { AlwaysPreparedSpellSource } from "./always-prepared-spells";
import { findSpellCounts2024 } from "./spell-preparation-2024";
import type { AbilityKey } from "./types";

const MAX_CLASS_LEVEL = 20;

export type SubclassOptionSpell = { spellId: number; spellLevel: number };

export type ChosenSubclassOption = {
  optionNameEng: string;
  optionName: string;
  className: string;
  subclassName: string;
  /** Рівень класу, на якому опцію обирають, — найнижчий із `levelsGranted`. */
  pickLevel: number;
  classLevel: number;
  ability: AbilityKey | null;
  spells: readonly SubclassOptionSpell[];
};

export function findSubclassOptionSpellClassLevel(input: {
  className: string;
  subclassName: string;
  pickLevel: number;
  spellLevel: number;
}): number | null {
  if (input.spellLevel <= 0) return input.pickLevel;

  for (let classLevel = input.pickLevel; classLevel <= MAX_CLASS_LEVEL; classLevel += 1) {
    const counts = findSpellCounts2024(input.className, classLevel, input.subclassName);
    if (counts && counts.maxSpellLevel >= input.spellLevel) return classLevel;
  }
  return null;
}

export function buildSubclassOptionSpellSources(options: readonly ChosenSubclassOption[]): AlwaysPreparedSpellSource[] {
  return options.flatMap((option) => {
    const spells = option.spells.flatMap((spell) => {
      const classLevel = findSubclassOptionSpellClassLevel({
        className: option.className,
        subclassName: option.subclassName,
        pickLevel: option.pickLevel,
        spellLevel: spell.spellLevel,
      });
      return classLevel === null ? [] : [{ spellId: spell.spellId, classLevel }];
    });
    if (!spells.length) return [];

    return [{
      sourceKey: option.optionNameEng,
      sourceName: option.optionName,
      classLevel: option.classLevel,
      ability: option.ability,
      spells,
    }];
  });
}
