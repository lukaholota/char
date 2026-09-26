// Варіант вибору з рівневою передумовою — `{ "level": 11 }` у `choice_option.prerequisites` — доступний лише
// з цього рівня КЛАСУ: мутагени мисливця за кровʼю (Відновлення з 7, Ефір з 11), пізні Багряні обряди з 14.

export function findRequiredClassLevel(prerequisites: unknown): number | null {
  if (!prerequisites || typeof prerequisites !== "object" || Array.isArray(prerequisites)) return null;
  const level = Number((prerequisites as Record<string, unknown>).level);
  return Number.isFinite(level) && level > 0 ? level : null;
}

export function isChoiceOptionLevelMet(prerequisites: unknown, classLevel: number): boolean {
  const required = findRequiredClassLevel(prerequisites);
  return required === null || classLevel >= required;
}
