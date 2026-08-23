import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { ParsedCreature } from "./creature-schema";
import { stripHtmlToText } from "./html-statblock";
import { parseMonster2024 } from "./parse-monster-2024";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { isKnownTerm, readKnownEnglishTerms } from "./known-terms";

const REGISTRY_PATH = join(AIDEDD_DIR, "terms-registry.md");

type TermUse = { term: string; count: number; example: string };

type TermGroup = { title: string; note: string; terms: TermUse[] };

function buildTermsRegistry(): void {
  const pages = readCachedPages();
  const creatures = pages.map(({ slug, html }) => parseMonster2024(html, slug));
  const known = readKnownEnglishTerms();

  const groups = collectGroups(pages, creatures);
  writeFileSync(REGISTRY_PATH, renderRegistry(groups, known, creatures.length), "utf-8");

  const fresh = groups.flatMap((group) => group.terms).filter((use) => !isKnownTerm(use.term, known));
  console.log(`✅ ${REGISTRY_PATH}`);
  console.log(`   ${creatures.length} сторінок, ${fresh.length} термінів поза словником`);
}

function readCachedPages(): Array<{ slug: string; html: string }> {
  const dir = findRawDir("monsters-2024");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .sort()
    .map((file) => ({
      slug: file.replace(/\.html$/, ""),
      html: readFileSync(join(dir, file), "utf-8"),
    }));
}

function collectGroups(
  rawPages: Array<{ slug: string; html: string }>,
  parsedCreatures: ParsedCreature[]
): TermGroup[] {
  const pages = rawPages.map(({ slug, html }) => ({ slug, value: html }));
  const creatures = parsedCreatures.map((creature) => ({ slug: creature.slug, value: creature }));

  return [
    {
      title: "Поля статблока",
      note: "підписи `<strong>` усередині шапки `<div class='red'>`",
      terms: countTerms(pages, (html) =>
        [...cutHeader(html).matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi)]
          .map((match) => stripHtmlToText(match[1]))
          .filter((label) => /^[A-Za-z][A-Za-z ]{0,20}$/.test(label))
      ),
    },
    {
      title: "Заголовки секцій",
      note: "`<h2 class='rub'>` на сторінках",
      terms: countTerms(pages, (html) =>
        [...html.matchAll(/<h2 class='rub'>([\s\S]*?)<\/h2>/gi)].map((match) =>
          stripHtmlToText(match[1])
        )
      ),
    },
    {
      title: "Граматика кидків 2024",
      note:
        "маркери `<em>` у тексті записів — назви самих записів (`<strong><em>`) і посилання " +
        "на заклинання виключені, лишається сама граматика редакції",
      terms: countTerms(pages, (html) =>
        [...dropEntryNames(html).matchAll(/<em>((?:(?!<a\b)[\s\S])*?)<\/em>/gi)]
          .map((match) => stripHtmlToText(match[1]))
          .filter((value) => /^[A-Z][A-Za-z ]*$/.test(value) && value.split(" ").length <= 4)
      ),
    },
    {
      title: "Стани, названі за граматикою 2024",
      note: "усе, що вжито як «<Назва> condition»",
      terms: countTerms(pages, (html) =>
        [...stripHtmlToText(html).matchAll(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*) condition\b/g)]
          .map((match) => dropLeadingFillers(match[1]))
          .filter((term) => term !== "")
      ),
    },
    {
      title: "Типи ушкоджень",
      note: "усе, що вжито як «<Тип> damage»",
      terms: countTerms(pages, (html) =>
        [...stripHtmlToText(html).matchAll(/\b([A-Z][a-z]+) damage\b/g)]
          .map((match) => dropLeadingFillers(match[1]))
          .filter((term) => term !== "")
      ),
    },
    {
      title: "Теги типу істоти",
      note: "дужковий тег у рядку типу",
      terms: countTerms(creatures, (creature) => readParenthesisTags(creature.type)),
    },
    {
      title: "Режими руху",
      note: "перше слово кожного сегмента швидкості",
      terms: countTerms(creatures, (creature) => readLeadingWords(creature.speed)),
    },
    {
      title: "Чуття",
      note: "перше слово кожного сегмента поля Senses",
      terms: countTerms(creatures, (creature) => readLeadingWords(creature.senses)),
    },
    {
      title: "Обмеження використання",
      note: "дужковий суфікс у назві дії або риси",
      terms: countTerms(creatures, (creature) =>
        readAllEntries(creature).flatMap((entry) => readParenthesisTags(entry.name))
      ),
    },
    {
      title: "Спорядження (Gear)",
      note: "поле Gear, розбите на предмети",
      terms: countTerms(creatures, (creature) => splitList(creature.gear)),
    },
    {
      title: "Середовище (Habitat)",
      note: "поле Habitat, розбите на значення",
      terms: countTerms(creatures, (creature) => splitList(creature.habitat)),
    },
    {
      title: "Скарби (Treasure)",
      note: "поле Treasure, розбите на значення",
      terms: countTerms(creatures, (creature) => splitList(creature.treasure)),
    },
    {
      title: "Мови",
      note: "поле Languages, розбите на значення",
      terms: countTerms(creatures, (creature) => splitList(creature.languages)),
    },
  ];
}

function countTerms<T>(
  sources: Array<{ slug: string; value: T }>,
  read: (value: T) => string[]
): TermUse[] {
  const uses = new Map<string, TermUse>();

  for (const source of sources) {
    for (const term of new Set(read(source.value))) {
      const trimmed = term.trim();
      if (trimmed === "") continue;
      const existing = uses.get(trimmed);
      if (existing) existing.count += 1;
      else uses.set(trimmed, { term: trimmed, count: 1, example: source.slug });
    }
  }

  return [...uses.values()].sort(
    (left, right) => right.count - left.count || left.term.localeCompare(right.term)
  );
}

function cutHeader(html: string): string {
  const match = /<div class='red'>([\s\S]*?)<h2/i.exec(html);
  return match ? match[1] : "";
}

function dropEntryNames(html: string): string {
  return html.replace(/<strong>\s*<em>[\s\S]*?<\/em>\s*<\/strong>/gi, "");
}

function readAllEntries(creature: ParsedCreature) {
  return [
    ...creature.traits,
    ...creature.actions,
    ...creature.bonusActions,
    ...creature.reactions,
    ...creature.legendaryActions,
  ];
}

function readParenthesisTags(value: string): string[] {
  return [...value.matchAll(/\(([^)]*)\)/g)].flatMap((match) => splitList(match[1]));
}

function readLeadingWords(value: string): string[] {
  return splitList(value)
    .map((segment) => {
      const match = /^([A-Za-z]+(?: [A-Za-z]+)?)/.exec(segment.trim());
      return match ? match[1].replace(/\s+(?:only|or|and)$/i, "") : "";
    })
    .filter((word) => word !== "" && !/^\d/.test(word));
}

const FILLER_WORDS = new Set(["the", "a", "an", "if", "it", "this", "that", "each", "any"]);

function dropLeadingFillers(phrase: string): string {
  const words = phrase.split(" ").filter((word) => !FILLER_WORDS.has(word.toLowerCase()));
  return words.join(" ");
}

/// Splits on separators outside parentheses, so "Planar (Acheron, Feywild)" stays one value.
function splitList(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);

    if (depth === 0 && (character === "," || character === ";")) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);

  return parts.map((part) => part.trim()).filter((part) => part !== "" && !/^[—-]$/.test(part));
}

function renderRegistry(groups: TermGroup[], known: Set<string>, pageCount: number): string {
  const isKnown = (use: TermUse) => isKnownTerm(use.term, known);
  const freshTotal = groups.flatMap((group) => group.terms).filter((use) => !isKnown(use)).length;

  const header = [
    "# Реєстр термінів 2024 — зібраний машинно зі сторінок aidedd",
    "",
    "> **Згенеровано** `bunx tsx scripts/aidedd/build-terms-registry.ts` з " +
      `${pageCount} кешованих сторінок \`data/aidedd/raw/monsters-2024/\`.`,
    "> Руками не редагувати — правити генератор або словник і перегенерувати.",
    "",
    "**Це стоп-гейт KR12.1.** Доки власник не затвердив переклад для кожного ❓, жоден статблок",
    "2024 не перекладається. Затверджені терміни йдуть у `src/lib/refs/dictionary.json` →",
    "`DND_DICTIONARY.rules2024`, а не в паралельний словник.",
    "",
    "Позначки: ✅ — англійський термін уже має ключ у `dictionary.json` або `translation.ts`;",
    "❓ — нового ключа немає, потрібне рішення власника.",
    "",
    `**Разом термінів поза словником: ${freshTotal}.**`,
    "",
  ];

  const body = groups.flatMap((group) => {
    const fresh = group.terms.filter((use) => !isKnown(use));
    return [
      `## ${group.title}`,
      "",
      `_Як зібрано: ${group.note}. Усього ${group.terms.length}, з них нових ${fresh.length}._`,
      "",
      "| | Термін | Сторінок | Приклад | Український відповідник |",
      "|---|---|---:|---|---|",
      ...group.terms.map(
        (use) =>
          `| ${isKnown(use) ? "✅" : "❓"} | ${escapeCell(use.term)} | ${use.count} | ` +
          `\`${use.example}\` | ${isKnown(use) ? "— (є у словнику)" : ""} |`
      ),
      "",
    ];
  });

  return `${[...header, ...body].join("\n")}\n`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

buildTermsRegistry();
