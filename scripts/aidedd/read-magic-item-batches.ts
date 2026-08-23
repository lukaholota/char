import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR } from "./aidedd-catalogs";

export const TRANSLATIONS_DIR = join(AIDEDD_DIR, "translations/magic-items-2014");

/// One batch row. `name` keeps the catalogue-wide «Українська [English]» format; `shortDescription`
/// is the line the catalogue list renders, so it is never English and never empty.
export type MagicItemTranslation = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  deferred?: string;
};

export function readTranslationBatches(): MagicItemTranslation[] {
  if (!existsSync(TRANSLATIONS_DIR)) return [];

  return readdirSync(TRANSLATIONS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap(
      (file) =>
        JSON.parse(readFileSync(join(TRANSLATIONS_DIR, file), "utf-8")) as MagicItemTranslation[]
    );
}

export function readTranslatedSlugs(): Set<string> {
  return new Set(
    readTranslationBatches()
      .filter((translation) => translation.deferred === undefined)
      .map((translation) => translation.slug)
  );
}
