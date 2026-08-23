import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { ParsedMagicItem } from "./magic-item-schema";
import { parseMagicItem2014 } from "./parse-magic-item-2014";
import { isKnownTerm, normalize, readKnownEnglishTerms, readRatifiedSpellNames } from "./known-terms";

const REGISTRY_PATH = join(AIDEDD_DIR, "magic-item-terms.md");
const UNKNOWN_PATH = join(AIDEDD_DIR, "unknown-terms-magic-items.md");

type TermUse = { term: string; count: number; example: string; ratified: string };

type TermGroup = { title: string; note: string; terms: TermUse[] };

type Page = { slug: string; html: string; item: ParsedMagicItem };

function buildItemTermsRegistry(): void {
  const pages = readCachedPages();
  const known = readKnownEnglishTerms();
  const groups = collectGroups(pages);

  writeFileSync(REGISTRY_PATH, renderRegistry(groups, known, pages.length), "utf-8");
  writeFileSync(UNKNOWN_PATH, renderUnknownTerms(groups, known, readBatchAdditions()), "utf-8");

  const fresh = countFresh(groups, known);
  console.log(`✅ ${REGISTRY_PATH}`);
  console.log(`✅ ${UNKNOWN_PATH}`);
  console.log(`   ${pages.length} сторінок, ${fresh} термінів поза словником`);
}

function readCachedPages(): Page[] {
  const dir = findRawDir("magic-items-2014");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .sort()
    .map((file) => {
      const slug = file.replace(/\.html$/, "");
      const html = readFileSync(join(dir, file), "utf-8");
      return { slug, html, item: parseMagicItem2014(html, slug) };
    });
}

/// Every phrase a translator has to render the same way twice. Collected as patterns rather than
/// as free words, because what diverges in the existing 248 records is whole formulas
/// («regains 1d6+1 expended charges daily at dawn»), not single nouns.
const PHRASE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "has N charges", pattern: /\bhas \d+ charges\b/i },
  { label: "expend(s) N charge(s)", pattern: /\bexpend(?:ing|s)? \d+ charges?\b/i },
  { label: "regains Nd? expended charges daily at dawn", pattern: /regains [^.]*expended charges daily at dawn/i },
  { label: "regains all expended charges", pattern: /regains all (?:its |of its )?expended charges/i },
  { label: "last charge → roll a d20 → item is destroyed", pattern: /last charge[^.]*d20/i },
  { label: "command word", pattern: /\bcommand word\b/i },
  { label: "while you wear (this|these)", pattern: /while you wear\b/i },
  { label: "while wearing", pattern: /while wearing\b/i },
  { label: "while you are attuned / while attuned", pattern: /while (?:you are )?attuned\b/i },
  { label: "while you hold / while holding", pattern: /while (?:you )?hold(?:ing)?\b/i },
  { label: "while you carry / while carrying", pattern: /while (?:you )?carry(?:ing)?\b/i },
  { label: "you can use an action to", pattern: /use an action to\b/i },
  { label: "as a bonus action", pattern: /\bas a bonus action\b/i },
  { label: "you can use a reaction", pattern: /\buse (?:your |a )?reaction\b/i },
  { label: "curse / cursed", pattern: /\bcursed?\b/i },
  { label: "attunement ends only if …", pattern: /remove curse|curse (?:can|is) (?:only )?(?:be )?(?:broken|lifted|removed)/i },
  { label: "+N bonus to AC", pattern: /\+\d bonus to AC\b/i },
  { label: "+N bonus to attack and damage rolls", pattern: /\+\d bonus to attack and damage rolls\b/i },
  { label: "+N bonus to saving throws", pattern: /\+\d bonus to saving throws\b/i },
  { label: "+N bonus to spell attack rolls", pattern: /\+\d bonus to spell attack rolls\b/i },
  { label: "spell save DC", pattern: /\bspell save DC\b/i },
  { label: "your spell save DC / spellcasting ability", pattern: /\bspellcasting ability\b/i },
  { label: "cast the … spell (from it)", pattern: /cast the [^.]{2,40} spell\b/i },
  { label: "requires no material components", pattern: /(?:no|without) material components?\b/i },
  { label: "the spell is cast at Nth level", pattern: /\b\d(?:st|nd|rd|th)[- ]level (?:version|spell slot)\b/i },
  { label: "hit points (regain/lose)", pattern: /\bhit points?\b/i },
  { label: "advantage on … saving throws", pattern: /advantage on [^.]{0,40}saving throws?\b/i },
  { label: "disadvantage on …", pattern: /\bdisadvantage on\b/i },
  { label: "resistance to … damage", pattern: /resistance to [a-z]+ damage/i },
  { label: "immunity to … damage", pattern: /immun(?:e|ity) to [a-z]+ damage/i },
  { label: "difficult terrain", pattern: /\bdifficult terrain\b/i },
  { label: "short rest / long rest", pattern: /\b(?:short|long) rest\b/i },
  { label: "until the next dawn", pattern: /until (?:the )?next dawn\b/i },
  { label: "daily at dawn", pattern: /\bdaily at dawn\b/i },
  { label: "once per day / N times per day", pattern: /\b\d+ times? per day\b|\bonce per day\b/i },
  { label: "a creature of your choice", pattern: /creature of your choice\b/i },
  { label: "within N feet of you", pattern: /within \d+ feet of you\b/i },
  { label: "DC N ability check", pattern: /\bDC \d+ [A-Z][a-z]+ \([A-Za-z ]+\) check\b/ },
  { label: "sentience / personality", pattern: /\bSentience\b|\bPersonality\b/ },
];

function collectGroups(pages: Page[]): TermGroup[] {
  const spellNames = readRatifiedSpellNames();

  return [
    {
      title: "Типи предметів",
      note: "перше слово рядка типу (`div.type`) — воно ж колонка `item_type`",
      terms: countTerms(pages, (page) => (page.item.itemType === "" ? [] : [page.item.itemType])),
    },
    {
      title: "Рідкості",
      note: "усі рідкості, перелічені в рядку типу; «rarity varies» — окремим рядком",
      terms: countTerms(pages, (page) => [
        ...page.item.rarityVariantsEng,
        ...(page.item.rarityVariesEng ? ["rarity varies"] : []),
        ...(page.item.rarity === "" && !page.item.rarityVariesEng ? [page.item.typeLineEng] : []),
      ]),
    },
    {
      title: "Підтипи в дужках",
      note: "дужковий уточнювач після типу: `Weapon (any sword)`, `Armor (medium or heavy)`",
      terms: countTerms(pages, (page) => (page.item.itemSubtypeEng === "" ? [] : [page.item.itemSubtypeEng])),
    },
    {
      title: "Умови налаштування",
      note: "хвіст `(requires attunement …)` — саме той рядок, який UI показує окремим полем",
      terms: countTerms(pages, (page) =>
        page.item.attunementConditionEng === "" ? [] : [page.item.attunementConditionEng]
      ),
    },
    {
      title: "Формули опису",
      note: "фрази-шаблони: заряди, командне слово, тригери носіння, бонуси, прокляття, відпочинок",
      terms: countTerms(pages, (page) =>
        PHRASE_PATTERNS.filter((entry) => entry.pattern.test(page.item.descriptionEng)).map(
          (entry) => entry.label
        )
      ),
    },
    {
      title: "Заклинання, названі в описах",
      note:
        "посилання `sorts.php?vo=` у тілі сторінки; український відповідник береться з " +
        "`dictionary.json → SPELLS` дослівно і наново не перекладається",
      terms: countTerms(
        pages,
        (page) => readLinkedSlugs(page.html, "sorts.php"),
        (slug) => spellNames.get(normalize(slug)) ?? ""
      ),
    },
    {
      title: "Перехресні посилання на інші предмети",
      note:
        "посилання `om.php?vo=` у тілі опису (самопосилання зі службової шапки виключені) — " +
        "назва такого предмета має збігатися з його власним записом у каталозі",
      terms: countTerms(pages, (page) =>
        readLinkedSlugs(readDescriptionHtml(page.html), "om.php").filter((slug) => slug !== page.slug)
      ),
    },
    {
      title: "Типи ушкоджень",
      note: "усе, що вжито як «<Тип> damage»",
      terms: countTerms(pages, (page) =>
        [...page.item.descriptionEng.matchAll(/\b([a-z]+) damage\b/gi)]
          .map((match) => match[1].toLowerCase())
          .filter((word) => !DAMAGE_NOISE.has(word))
      ),
    },
    {
      title: "Стани",
      note: "усе, що вжито як «<стан> condition» або як назва стану в дужках",
      terms: countTerms(pages, (page) =>
        [...page.item.descriptionEng.matchAll(/\b([a-z]+) condition\b/gi)].map((match) =>
          match[1].toLowerCase()
        )
      ),
    },
    {
      title: "Заголовки таблиць",
      note: "шапки `<table>` у описах — 34 сторінки мають таблиці",
      terms: countTerms(pages, (page) => page.item.tables.flatMap((table) => table.headers)),
    },
    {
      title: "Джерела",
      note: "рядок `div.source`; у колонках `MagicItem` джерела немає, це довідка для звірки",
      terms: countTerms(pages, (page) => (page.item.source === "" ? [] : [page.item.source])),
    },
  ];
}

const DAMAGE_NOISE = new Set(["extra", "the", "this", "that", "its", "half", "all", "more", "no", "any", "and", "or", "of", "takes", "deals", "bonus", "additional", "same", "d", "a", "an", "it", "one", "such"]);

function readLinkedSlugs(html: string, page: string): string[] {
  const pattern = new RegExp(`${page.replace(".", "\\.")}\\?vo=([a-z0-9-]+)`, "g");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function readDescriptionHtml(html: string): string {
  const match = /<div class='description'>([\s\S]*?)<\/div>/i.exec(html);
  return match ? match[1] : "";
}

function countTerms(
  pages: Page[],
  read: (page: Page) => string[],
  findRatified: (term: string) => string = () => ""
): TermUse[] {
  const uses = new Map<string, TermUse>();

  for (const page of pages) {
    for (const term of new Set(read(page))) {
      const trimmed = term.trim();
      if (trimmed === "") continue;
      const existing = uses.get(trimmed);
      if (existing) existing.count += 1;
      else uses.set(trimmed, { term: trimmed, count: 1, example: page.slug, ratified: findRatified(trimmed) });
    }
  }

  return [...uses.values()].sort(
    (left, right) => right.count - left.count || left.term.localeCompare(right.term)
  );
}

function isSettled(use: TermUse, known: Set<string>): boolean {
  return use.ratified !== "" || isKnownTerm(use.term, known);
}

function countFresh(groups: TermGroup[], known: Set<string>): number {
  return groups.flatMap((group) => group.terms).filter((use) => !isSettled(use, known)).length;
}

function renderRegistry(groups: TermGroup[], known: Set<string>, pageCount: number): string {
  const header = [
    "# Реєстр термінів магічних предметів — зібраний машинно зі сторінок aidedd",
    "",
    "> **Згенеровано** `npx tsx scripts/aidedd/build-item-terms-registry.ts` з " +
      `${pageCount} кешованих сторінок \`data/aidedd/raw/magic-items-2014/\`.`,
    "> Руками не редагувати — правити генератор або словник і перегенерувати.",
    "",
    "**Це стоп-гейт [KR14.3](../../docs/o14-magic-items-aidedd/kr14.3-terms-registry.md).** Доки",
    "власник не затвердив переклад для кожного ❓, жодна партія предметів не перекладається.",
    "Затверджене йде в `src/lib/refs/dictionary.json`, а не в паралельний словник.",
    "",
    "Позначки: ✅ — англійський термін уже має ключ у `dictionary.json` або `translation.ts`",
    "(для заклинань — затверджену назву з `SPELLS`); ❓ — рішення власника потрібне.",
    "",
    `**Разом термінів поза словником: ${countFresh(groups, known)}.**`,
    "",
  ];

  const body = groups.flatMap((group) => {
    const fresh = group.terms.filter((use) => !isSettled(use, known));
    return [
      `## ${group.title}`,
      "",
      `_Як зібрано: ${group.note}. Усього ${group.terms.length}, з них нових ${fresh.length}._`,
      "",
      "| | Термін | Сторінок | Приклад | Український відповідник |",
      "|---|---|---:|---|---|",
      ...group.terms.map((use) => renderRow(use, known)),
      "",
    ];
  });

  return `${[...header, ...body].join("\n")}\n`;
}

function renderRow(use: TermUse, known: Set<string>): string {
  const settled = isSettled(use, known);
  const ukrainian = use.ratified !== "" ? use.ratified : settled ? "— (є у словнику)" : "";
  return (
    `| ${settled ? "✅" : "❓"} | ${escapeCell(use.term)} | ${use.count} | ` +
    `\`${use.example}\` | ${escapeCell(ukrainian)} |`
  );
}

/// The second file is the one a batch appends to: the rule is «немає терміна — не вигадуй», and a
/// batch needs somewhere to put the term it refused to invent.
const BATCH_ADDITIONS_HEADING = "## Дописано партіями";

/// The generated half is rewritten on every run; whatever a batch wrote below the heading is
/// carried over, otherwise a regeneration would silently delete the terms a batch refused to invent.
function readBatchAdditions(): string {
  if (!existsSync(UNKNOWN_PATH)) return "\n_Порожньо._\n";
  const previous = readFileSync(UNKNOWN_PATH, "utf-8");
  const at = previous.indexOf(BATCH_ADDITIONS_HEADING);
  return at < 0 ? "\n_Порожньо._\n" : previous.slice(at + BATCH_ADDITIONS_HEADING.length);
}

function renderUnknownTerms(groups: TermGroup[], known: Set<string>, additions: string): string {
  const fresh = groups.flatMap((group) =>
    group.terms.filter((use) => !isSettled(use, known)).map((use) => ({ group: group.title, use }))
  );

  return [
    "# Терміни магічних предметів без затвердженого перекладу",
    "",
    "> Верхню частину генерує `npx tsx scripts/aidedd/build-item-terms-registry.ts` — не редагувати.",
    "> Нижче, під розділом «Дописано партіями», партія руками дописує термін, на якому спинилась.",
    "",
    `Разом з корпусу: **${fresh.length}**.`,
    "",
    "| Група | Термін | Сторінок | Приклад |",
    "|---|---|---:|---|",
    ...fresh.map(
      ({ group, use }) =>
        `| ${escapeCell(group)} | ${escapeCell(use.term)} | ${use.count} | \`${use.example}\` |`
    ),
    "",
    BATCH_ADDITIONS_HEADING + additions,
  ].join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

buildItemTermsRegistry();
