import { subclassTranslations, subclassTranslationsEng } from "@/lib/refs/translation";

const SUBCLASS_NAMES: Readonly<Record<string, string>> = subclassTranslations;
const SUBCLASS_NAMES_ENG: Readonly<Record<string, string>> = subclassTranslationsEng;

/// Рядок підкласу 2024 у базі зветься `FIEND_PATRON`, а переклад лежить під `FIEND_PATRON_2024`.
export function findSubclassName(name: string): string | null {
  return SUBCLASS_NAMES[name] ?? SUBCLASS_NAMES[`${name}_2024`] ?? null;
}

export function translateSubclassName(name: string): string {
  return findSubclassName(name) ?? name;
}

export function translateSubclassNameEng(name: string): string {
  return SUBCLASS_NAMES_ENG[name] ?? SUBCLASS_NAMES_ENG[`${name}_2024`] ?? name;
}
