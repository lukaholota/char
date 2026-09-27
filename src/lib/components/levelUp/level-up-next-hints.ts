export function findPathStepHint(levelUpPath: string | undefined | null, chosenClassId: number | undefined | null): string | null {
  if (!levelUpPath) return "Оберіть: підняти рівень наявного класу чи взяти новий клас.";
  if (chosenClassId) return null;
  return levelUpPath === "MULTICLASS" ? "Оберіть новий клас." : "Оберіть клас, рівень якого підвищуєте.";
}

export function findHpStepHint(mode: string, hpIncrease: number | undefined): string | null {
  if (typeof hpIncrease === "number" && hpIncrease >= 0) return null;
  if (mode === "MANUAL") return "Введіть приріст хітів — ціле число від 0.";
  return "Оберіть, як додати хіти: «Середнє», «Рандом» або «Ручне введення».";
}
