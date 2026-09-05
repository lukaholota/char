import { sourceTranslations } from "@/lib/refs/translation";

const SOURCE_LABELS: Record<string, string> = sourceTranslations;

/// Українська назва книги-джерела; код без ратифікованої назви лишається як є. Живе окремо від
/// каталогів, бо картка істоти чи приміщення потребує тільки цього рядка — а через `bestiaryData`
/// тягнула за ним увесь `creatures*.json` (docs/STATE.md дефект №9).
///
/// Каталоги спорядження пишуть код по-своєму — `PHB_2014`, `TCoE` — тож пошук іде й за
/// нормалізованим кодом, щоб один словник обслуговував усі каталоги без другого запису.
export function findSourceLabel(source: string): string {
  return (
    SOURCE_LABELS[source] ??
    SOURCE_LABELS[source.toUpperCase()] ??
    SOURCE_LABELS[source.replace(/_2014$/i, "").toUpperCase()] ??
    source
  );
}
