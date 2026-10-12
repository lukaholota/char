import type { Ruleset } from "@prisma/client";

import { findCharacterCreatorOptions } from "@/lib/content/creator-content";
import { buildClassTable, type ClassTable } from "@/rules/class-table";

/// Лише для серверних сторінок каталогу: дані конструктора важкі, а таблиці з них — 20 рядків
/// на клас, тож у браузер їде готовий результат, а не джерело.
export function findClassTables(ruleset: Ruleset): Record<string, ClassTable> {
  return Object.fromEntries(
    findCharacterCreatorOptions(ruleset).classes.map((characterClass) => [
      characterClass.name,
      buildClassTable(characterClass, characterClass.subclasses),
    ]),
  );
}

export function findClassTable(classKey: string, ruleset: Ruleset): ClassTable | undefined {
  const characterClass = findCharacterCreatorOptions(ruleset).classes.find((candidate) => candidate.name === classKey);
  return characterClass ? buildClassTable(characterClass, characterClass.subclasses) : undefined;
}
