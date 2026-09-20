// Рішення власника 2026-09-14: вибір інструментів від риси — рядок у тексті володінь, а
// обирає гравець на листі, як мови. Кроку в конструкторі немає.
const TOOL_CHOICE_COUNT_BY_FEAT: Readonly<Record<string, number>> = {
  // «You gain proficiency with three different Artisan's Tools of your choice from the Fast Crafting table.»
  CRAFTER: 3,
  // «You gain proficiency with three Musical Instruments of your choice.»
  MUSICIAN: 3,
};

export function countFeatToolChoices(featName: string | null | undefined): number {
  return featName ? TOOL_CHOICE_COUNT_BY_FEAT[featName] ?? 0 : 0;
}
