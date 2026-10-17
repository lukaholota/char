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

function collectFiles(directory: string, extension: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [path] : [];
  });
}

const activeFiles = [
  ...JSON_ROOTS.flatMap((directory) => collectFiles(join(ROOT, directory), ".json")),
  ...REGISTRY_FILES.map((file) => join(ROOT, file)),
];

/// Рішення власника 2026-10-18: навичка Insight всюди «Аналіз поведінки». Назви риси Keenness of
/// the Stone Giant, риси раси Scribe's Insight і Каменя Йун власник вирішить окремо; чернетки
/// RPGbot у workbench на сайт не потрапляють.
const RETIRED_INSIGHT_SKILL = /(?<!\p{L}|Камінь Йун \()Прониклив[іо]ст(?!\p{L}* (?:велетнів|писаря|\(дуже рідкісний\)))\p{L}*/giu;
/// Тут «проникливість» — звичайне слово або назва риси Telepathic Insight, а не навичка.
const EVERYDAY_INSIGHT_PHRASES = [
  "ваша проникливість у тактичних обставинах",
  "інтуїцію, проникливість",
  "інтуїцію і проникливість",
  "завдяки проникливості він може",
  "Телепатична проникливість",
];
const INSIGHT_CARRIER_FILES = [...new Set([
  ...activeFiles.filter((file) => !relative(ROOT, file).startsWith("data/rpgbot/workbench/")),
  ...collectFiles(join(ROOT, "prisma/seed"), ".ts"),
  ...collectFiles(join(ROOT, "scripts/data"), ".ts"),
  ...collectFiles(join(ROOT, "src"), ".json"),
  ...[".ts", ".tsx"].flatMap((extension) => collectFiles(join(ROOT, "src"), extension)).filter(isShippedSource),
])];

function isShippedSource(file: string): boolean {
  return !/\.(test|spec)\.tsx?$/.test(file);
}

function isEverydayInsightWord(line: string, matchIndex: number): boolean {
  return EVERYDAY_INSIGHT_PHRASES.some((phrase) => {
    const phraseIndex = line.indexOf(phrase, Math.max(0, matchIndex - phrase.length));
    return phraseIndex !== -1 && phraseIndex <= matchIndex && matchIndex < phraseIndex + phrase.length;
  });
}

function findRetiredInsightMentions(): string[] {
  return INSIGHT_CARRIER_FILES.flatMap((file) =>
    readFileSync(file, "utf-8")
      .split("\n")
      .flatMap((line, index) =>
        Array.from(line.matchAll(RETIRED_INSIGHT_SKILL))
          .filter((match) => !isEverydayInsightWord(line, match.index))
          .map((match) =>
            `${relative(ROOT, file)}:${index + 1}: ${line.slice(Math.max(0, match.index - 40), match.index + 40)}`),
      ),
  );
}

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

  it("називає навичку Insight «Аналіз поведінки»", () => {
    expect(findRetiredInsightMentions()).toEqual([]);
  });
});
