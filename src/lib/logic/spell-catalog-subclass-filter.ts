import { subclassTranslations } from "@/lib/refs/translation";
import { isLegacySubclass2024 } from "@/rules/legacy-subclasses-2024";

type ClassRow = { className?: string | null; subclassName?: string | null };

/** O43: легасі-підкласу 2024 у каталозі 2024 немає — фільтр `sub` за ним дав би порожній список. */
export function listCatalogSubclassNames(rows: readonly ClassRow[]): string[] {
  const names = rows.flatMap(({ className, subclassName }) => {
    if (!subclassName || isLegacySubclass2024(String(className ?? ""), subclassName)) return [];
    return [subclassTranslations[subclassName as keyof typeof subclassTranslations] ?? subclassName];
  });
  return [...new Set(names)];
}
