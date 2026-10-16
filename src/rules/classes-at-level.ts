import type { AbilityKey } from "./types";

export type ClassAtLevelRow = { classId: number; subclassId: number | null; classLevel: number; ability: AbilityKey | null };

/**
 * Класи персонажа після підвищення. Клас, у який персонаж увійшов цим підвищенням, теж тут:
 * без нього підклас 1-го рівня й заклинання класу приходили лише наступним підвищенням (BUG-036).
 */
export function collectClassesAfterLevelUp(classesBefore: readonly ClassAtLevelRow[], leveledClass: ClassAtLevelRow): ClassAtLevelRow[] {
  const isEnteredClass = !classesBefore.some((row) => row.classId === leveledClass.classId);
  if (isEnteredClass) return [...classesBefore, leveledClass];

  return classesBefore.map((row) =>
    row.classId === leveledClass.classId
      ? { ...row, classLevel: leveledClass.classLevel, subclassId: leveledClass.subclassId ?? row.subclassId }
      : row,
  );
}
