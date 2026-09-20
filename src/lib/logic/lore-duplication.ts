/// Опис істоти під статблоком у каталозі 2024 часто-густо не її власний, а той самий вступ до
/// групи, лише перекладений іншим проходом: у книзі запис дракона успадковує текст «Black Dragons»
/// і додає свій абзац, а імпорт узяв успадковане. Доки власні абзаци не перезалиті, той самий текст
/// стоїть двічі — курсивом під статблоком і в блоці «Лор». Слова двох перекладів не збігаються
/// дослівно, тож повтор упізнається за часткою спільних слів і за тим, що опис не коротший за вступ
/// у рази: власний абзац істоти — одне-два речення проти сторінки групового тексту.
const MIN_SHARED_WORDS = 0.5;
const MIN_LENGTH_OF_LORE = 0.4;

export function isDescriptionRepeatingLore(description: string | null | undefined, lore: string | null | undefined): boolean {
  if (!description || !lore) return false;

  const describing = collectMeaningfulWords(description);
  const loreWords = collectMeaningfulWords(lore);
  if (describing.length === 0 || loreWords.length === 0) return false;

  const known = new Set(loreWords);
  const shared = describing.filter((word) => known.has(word)).length;
  return shared / describing.length >= MIN_SHARED_WORDS && describing.length / loreWords.length >= MIN_LENGTH_OF_LORE;
}

/// Коротші слова — службові: вони збігаються в будь-яких двох українських текстах.
function collectMeaningfulWords(text: string): string[] {
  return (
    text
      .replace(/<[^>]+>/g, " ")
      .replace(/\{\{[^}]*\}\}/g, " ")
      .toLowerCase()
      .match(/[а-яіїєґʼ]{4,}/g) ?? []
  );
}
