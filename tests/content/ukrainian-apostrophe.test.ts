import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";
import { NONCANONICAL_APOSTROPHE_IN_WORD } from "../../src/lib/refs/ukrainian-apostrophe";

/// Рішення власника 2026-08-30: український апостроф — ʼ (U+02BC). Прохід 2026-09-02 звів
/// усі носії контенту разом зі словником, бо словник — реєстр, який каталоги цитують дослівно,
/// і зводити його окремо від них не можна. Гейт не пускає `'` і `’` усередині слова назад — ні
/// партією перекладу, ні генерацією з бази, ні правкою словника.
const CONTENT_ROOTS = ["data", "prisma/seed", "src/lib/refs", "src/lib/generated", "src/lib/rulesData.ts"];
const TEXT_EXTENSIONS = [".json", ".ts", ".tsx", ".md"];

function collectTextFiles(path: string): string[] {
  if (statSync(path).isFile()) return TEXT_EXTENSIONS.some((ext) => path.endsWith(ext)) ? [path] : [];
  return readdirSync(path).flatMap((entry) => collectTextFiles(join(path, entry)));
}

/// У джерелі TS апостроф у рядку в одинарних лапках екранується — `'З\'ява'`, і між літерою та
/// апострофом стоїть зворотна риска: так 69 входжень у сідах пройшли повз гейт і розвели сіди з базою.
const ESCAPED_APOSTROPHE_IN_WORD = /(?<=\p{Script=Cyrillic})\\['’‘`´](?=[яюєїЯЮЄЇ])/u;

function findNoncanonicalApostrophes(file: string): string[] {
  const patterns = [new RegExp(NONCANONICAL_APOSTROPHE_IN_WORD.source, "u"), ESCAPED_APOSTROPHE_IN_WORD];
  return readFileSync(file, "utf-8")
    .split("\n")
    .flatMap((line, index) => (patterns.some((pattern) => pattern.test(line)) ? [`${relative(process.cwd(), file)}:${index + 1}`] : []));
}

describe("апостроф усередині слова — тільки ʼ (U+02BC)", () => {
  it("жоден носій контенту не тримає ' чи ’ між кирилицею та я/ю/є/ї", () => {
    const offenders = CONTENT_ROOTS.flatMap((root) => collectTextFiles(join(process.cwd(), root))).flatMap(
      findNoncanonicalApostrophes
    );

    expect(offenders).toEqual([]);
  });
});
