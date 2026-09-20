import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const JSON_ROOTS = ["data", "prisma/seed", "src/lib/generated"];
const REGISTRY_FILES = ["src/lib/refs/translation.ts", "src/lib/refs/dictionary.json"];

const OLD_FORMS = [
  /Ковалівськ/,
  /Лімбо(?![а-яіїєґʼ])/,
  /Девʼять Пеклів/,
  /Далекий Обшир/,
  /Міжчасся заново/,
  /Іссгард/,
  /Байтопі/,
  /(?<![а-яіїєґА-ЯІЇЄҐ])Аід/,
  /Земля Звірів/,
  /Фейвальд/,
  /[Мм]улярськ|мулярств/,
  /Шевські інструменти/,
  /Гончарн[а-яіїєґ]* інструмент/,
  /Теслярські інструменти/,
  /Інструменти маляра/,
  /Інструменти кухаря/,
];

/// Стара форма тут — не дефект файла, а стан робочої бази або навмисний ключ пошуку.
/// Каталоги нижче складаються з бази й полагодяться самі після прогону сідів власником;
/// у файлах корекцій ліва половина заміни мусить містити саме стару форму, інакше сід її не
/// знайде. Рядок знімається, коли зникає причина, а не «щоб було зелено».
const EXPECTED_OLD_FORMS: Record<string, RegExp[]> = {
  "src/lib/generated/backgrounds.json": [/Теслярські інструменти/],
  "src/lib/generated/creator-content-2014.json": [/Теслярські інструменти/],
  "src/lib/generated/creator-content-2024.json": [/Інструменти кухаря/, /Теслярські інструменти/],
};

function isExpected(file: string, pattern: RegExp): boolean {
  return (EXPECTED_OLD_FORMS[file] ?? []).some((expected) => expected.source === pattern.source);
}

function collectJsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(path);
    return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
  });
}

const activeFiles = [
  ...JSON_ROOTS.flatMap((directory) => collectJsonFiles(join(ROOT, directory))),
  ...REGISTRY_FILES.map((file) => join(ROOT, file)),
];

function findMatches(patterns: RegExp[]): string[] {
  const matches: string[] = [];

  for (const file of activeFiles) {
    for (const [index, line] of readFileSync(file, "utf-8").split("\n").entries()) {
      for (const pattern of patterns) {
        if (!pattern.test(line)) continue;
        if (isExpected(relative(ROOT, file), pattern)) continue;
        matches.push(`${relative(ROOT, file)}:${index + 1}: ${pattern}`);
      }
    }
  }

  return matches;
}

/// До 2026-09-02 тут стояла й друга перевірка — «не маркує ратифіковані терміни як неоднозначні»
/// на пʼять термінів KR23.7. Вона втілювала речення «ратифікований термін маркера не потребує»,
/// якого власник не встановлював ([Р20](../../docs/DECISIONS.md#р20) у редакції 2026-09-02:
/// ратифікація маркера не знімає). Знята в KR30.2; що маркер стоїть на кожній назві риси й
/// дії, стереже `section-name-markers.test.ts`.
describe("KR23.7 / KR23.8 — ратифіковані терміни", () => {
  it("не лишає старих форм у реєстрах, рукописних корпусах і похідних JSON", () => {
    expect(findMatches(OLD_FORMS)).toEqual([]);
  });
});
