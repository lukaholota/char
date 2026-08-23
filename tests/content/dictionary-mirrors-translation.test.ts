import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { collectMirroredMaps } from "../../scripts/sync-dictionary-from-translation";

/// Два сховища перекладів коштували партії 03 реальної помилки: «Monster Manual» лежав у
/// translation.ts як `MM: "Бестіарій (2014)"`, сесія шукала його в dictionary.json, не знайшла
/// й вирішила, що терміна немає. Дзеркало прибирає саме цю пастку, але тільки поки воно свіже.
describe("словник дзеркалить translation.ts", () => {
  const dictionary = JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8"),
  ) as { CONTENT_TRANSLATIONS?: Record<string, Record<string, string>> };

  const mirrored = collectMirroredMaps();

  it("dictionary.json тримає CONTENT_TRANSLATIONS", () => {
    expect(dictionary.CONTENT_TRANSLATIONS).toBeDefined();
  });

  it("дзеркало збігається з translation.ts мапа в мапу", () => {
    expect(dictionary.CONTENT_TRANSLATIONS).toEqual(mirrored);
  });

  it("назви джерел доїхали — саме на них спіткнулася партія 03", () => {
    expect(dictionary.CONTENT_TRANSLATIONS?.sourceTranslations?.MM).toBe("Бестіарій (2014)");
    expect(dictionary.CONTENT_TRANSLATIONS?.sourceTranslations?.MM_2024).toBe("Бестіарій (2024)");
  });
});
