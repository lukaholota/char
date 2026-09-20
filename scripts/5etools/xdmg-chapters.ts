/**
 * Глави книжок 5etools (`book/book-*.json`) з пінованого дзеркала (Р19): DMG 2024, глави 1–3
 * (KR23.4) і 8 (L14-bastions-06) і PHB 2014, глави 1 і 4 (KR29.1). Дерево тут інше, ніж `variantrules.json`: блок
 * вкладений у блок (глава → підрозділ → под-блок), а не плаский список записів — тому окремий
 * розкладач, а не параметризація `variant-rules.ts`.
 *
 * Дві книжки — два фільтри глав і дві таблиці статей, але один шлях рендеру. Назва файла
 * лишилася від першої з них; перейменувати варто разом із KR23.6, яка додасть наступні книжки.
 */

import { readFileSync } from "fs";

import { findCachePath, MIRROR_REPOSITORY, MIRROR_REVISION } from "./mirror";
import { renderEntries } from "./source-item";
import { BeyondSrdSource, ParsedBeyondSrdArticle } from "./variant-rules";
import {
  buildSummary,
  claimSlug,
  kebabCase,
  numberArticlesWithinCategory,
  ParsedRuleCategoryKey,
  ParsedRuleSubSection,
} from "../srd/rules-markdown";

const BOOK_SOURCE: BeyondSrdSource = "XDMG";

const CHAPTER_NAMES = [
  "Chapter 1: The Basics",
  "Chapter 2: Running the Game",
  "Chapter 3: DM's Toolbox",
] as const;

/// Категорія й індекс глави (для якоря 5etools) на кожен підрозділ, що лишається після звірки
/// з наявним корпусом. Підрозділів, яких тут немає, розкладач пропускає — див. `SKIPPED_*` нижче.
const ARTICLE_META: Record<string, { category: ParsedRuleCategoryKey; chapterIndex: number }> = {
  "What Does a DM Do?": { category: "gamemaster", chapterIndex: 0 },
  "Things You Need": { category: "gamemaster", chapterIndex: 0 },
  "Preparing a Session": { category: "gamemaster", chapterIndex: 0 },
  "How to Run a Session": { category: "gamemaster", chapterIndex: 0 },
  "Example of Play": { category: "gamemaster", chapterIndex: 0 },
  "Every DM Is Unique": { category: "gamemaster", chapterIndex: 0 },
  "Ensuring Fun for All": { category: "gamemaster", chapterIndex: 0 },

  "Know Your Players": { category: "gamemaster", chapterIndex: 1 },
  "Group Size": { category: "gamemaster", chapterIndex: 1 },
  "Multiple DMs": { category: "gamemaster", chapterIndex: 1 },
  Narration: { category: "gamemaster", chapterIndex: 1 },
  "Resolving Outcomes": { category: "gamemaster", chapterIndex: 1 },
  "Running Social Interaction": { category: "gamemaster", chapterIndex: 1 },
  "Running Exploration": { category: "gamemaster", chapterIndex: 1 },
  "Running Combat": { category: "gamemaster", chapterIndex: 1 },
  "Character Advancement": { category: "gamemaster", chapterIndex: 1 },

  Alignment: { category: "gamemaster", chapterIndex: 2 },
  Chases: { category: "adventuring", chapterIndex: 2 },
  "Creating a Creature": { category: "gamemaster", chapterIndex: 2 },
  "Creating a Magic Item": { category: "gamemaster", chapterIndex: 2 },
  "Creating a Spell": { category: "gamemaster", chapterIndex: 2 },
  Death: { category: "gamemaster", chapterIndex: 2 },
  Doors: { category: "adventuring", chapterIndex: 2 },
  Dungeons: { category: "adventuring", chapterIndex: 2 },
  "Firearms and Explosives": { category: "equipment", chapterIndex: 2 },
  "Gods and Other Powers": { category: "gamemaster", chapterIndex: 2 },
  "Marks of Prestige": { category: "gamemaster", chapterIndex: 2 },
  Mobs: { category: "combat", chapterIndex: 2 },
  "Nonplayer Characters": { category: "gamemaster", chapterIndex: 2 },
  Renown: { category: "gamemaster", chapterIndex: 2 },
  Settlements: { category: "adventuring", chapterIndex: 2 },
  "Supernatural Gifts": { category: "gamemaster", chapterIndex: 2 },

  Bastions: { category: "adventuring", chapterIndex: 7 },
};

/// Глава 8 — одна стаття на всю главу, а не стаття на підрозділ: «Gaining a Bastion» чи «Fall
/// of a Bastion» — по двісті слів, і система читається лише разом. Статблоки 29 спеціальних
/// приміщень уже є в каталозі бастіонів (`src/lib/generated/bastions.json`), тому не дублюються.
const WHOLE_CHAPTER_ARTICLES: Record<string, string> = {
  "Chapter 8: Bastions": "Bastions",
};

/// Ці сім підрозділів SRD 5.2.1 «Gameplay Toolbox» (`data/2024/srd/gameplay-toolbox.md`)
/// уже надрукувала майже дослівно — звірено текстово абзац за абзацом проти всіх файлів
/// `data/2024/srd/*.md` (KR23.4, журнал): збіг ≥45% абзаців попри інший синтаксис заголовків
/// (`#### Імʼя` у SRD проти `**Імʼя.**` у книзі 5etools), решта — вступне речення й перелік
/// імен без власного тексту. Різниця в назвах статей SRD навмисна: одна стаття книги («Fear
/// and Mental Stress») там розбита на три («Fear and Mental Stress», «Fear Effects», «Mental
/// Stress Effects»), і разом вони покривають підрозділ повністю.
const ALREADY_IN_SRD_GAMEPLAY_TOOLBOX = new Set([
  "Creating a Background",
  "Curses and Magical Contagions",
  "Fear and Mental Stress",
  "Poison",
  "Traps",
]);

/// Ці три підрозділи — не проза, а покажчик імен без власного тексту: усе, на що вони
/// посилаються, вже імпортовано іншим конвеєром і формою (не `RuleArticle`).
const INDEX_ONLY_SUBSECTIONS = new Set([
  "Environmental Effects", // Deep Water/Extreme Cold/…/Planar Effects — уже статті SRD/beyond-srd
  "Hazards", // Brown Mold/Fireball Fungus/… — уже `TrapHazardStatblockCard` (KR23.3)
  "Siege Equipment", // ті самі 9 знарядь, що вже `ObjectStatblockCard` (KR23.5)
]);

const SKIPPED_SUBSECTIONS = new Set([...ALREADY_IN_SRD_GAMEPLAY_TOOLBOX, ...INDEX_ONLY_SUBSECTIONS]);

const PHB_SOURCE: BeyondSrdSource = "PHB";

/// Глави PHB 2014, яких немає в SRD 5.1: покрокове створення персонажа і деталі персонажа.
/// Решту глав ціль свідомо не бере — обґрунтування в docs/o29-character-creation-2014/README.md.
const PHB_CHAPTER_NAMES = ["Step-by-Step Characters", "Personality and Background"] as const;

/// Стаття PHB — це блок верхнього рівня глави (на відміну від XDMG, де це `section`: глава 1
/// PHB тримає кроки як `entries`, а не як `section`). Вступ глави ключується назвою самої
/// глави. Кожен блок, якого тут немає, має бути в `PHB_ALREADY_IN_SRD` або
/// `PHB_BOOK_NAVIGATION` — інакше розкладач падає, щоб зміст не зник мовчки.
///
/// Категорія одна на всі девʼять: «Характеристики та Правила», де KR20.10 уже поклала
/// «Передісторії», «Расові особливості» й «Риси». Розкидати сім кроків по категоріях означало б
/// розірвати послідовність, заради якої ціль і робиться.
const PHB_ARTICLE_META: Record<string, { category: ParsedRuleCategoryKey; chapterIndex: number }> = {
  "Step-by-Step Characters": { category: "abilities", chapterIndex: 1 },
  "1. Choose a Race": { category: "abilities", chapterIndex: 1 },
  "2. Choose a Class": { category: "abilities", chapterIndex: 1 },
  "3. Determine Ability Scores": { category: "abilities", chapterIndex: 1 },
  "4. Describe Your Character": { category: "abilities", chapterIndex: 1 },
  "5. Choose Equipment": { category: "abilities", chapterIndex: 1 },
  "6. Come Together": { category: "abilities", chapterIndex: 1 },
  /// Піднято з «Beyond 1st Level»: сам підрозділ дублює SRD, а цей блок у SRD 5.1 відсутній.
  "Tiers of Play": { category: "abilities", chapterIndex: 1 },

  "Character Details": { category: "abilities", chapterIndex: 4 },
};

/// Проза, яку SRD 5.1 уже друкує — звірено реченнями проти `data/2014/srd/**/*.md` (журнал
/// KR29.1). Збіг занижують правки вичищення IP у самому SRD («Dungeon Master» → «game master»,
/// прибрані назви світів), тому кожен запис звірено ще й очима, а не лише числом.
///
/// Перевіряється на обох рівнях: блок глави пропускається цілком, названий блок усередині
/// статті — як підрозділ. Тому «Languages» покриває і вкладений блок «Character Details», і
/// однойменний блок усередині вже пропущених «Backgrounds».
const PHB_ALREADY_IN_SRD = new Set([
  "Beyond 1st Level", // 03_Characterization/Beyond_1st_Level.md
  "Inspiration", // 03_Characterization/Inspiration.md
  "Backgrounds", // 03_Characterization/Backgrounds.md (KR20.10)
  "Alignment", // 03_Characterization/Alignment.md
  "Languages", // 03_Characterization/Languages.md
]);

/// Вступ глави 4 — «про що ця глава», жодного правила. Не дубль, але й не стаття довідника.
const PHB_BOOK_NAVIGATION = new Set(["Personality and Background"]);

export function parseXdmgChapters(options: { reservedSlugs?: string[] } = {}): ParsedBeyondSrdArticle[] {
  const takenSlugs = new Set(options.reservedSlugs ?? []);
  const chapters = findChapters("book/book-xdmg.json", CHAPTER_NAMES);
  const articles: Omit<ParsedBeyondSrdArticle, "order">[] = [];

  for (const { chapter, index } of chapters) {
    const entries = Array.isArray(chapter.entries) ? chapter.entries : [];
    const subsections = entries.filter(isSection) as Record<string, unknown>[];

    for (const subsection of subsections) {
      const engTitle = String(subsection.name);
      if (SKIPPED_SUBSECTIONS.has(engTitle)) continue;

      const meta = ARTICLE_META[engTitle];
      if (!meta) {
        throw new Error(`XDMG-підрозділ «${engTitle}» (${chapter.name}) не описаний у ARTICLE_META`);
      }
      if (meta.chapterIndex !== index) {
        throw new Error(
          `XDMG-підрозділ «${engTitle}» очікувався в главі ${meta.chapterIndex}, а знайдений у ${index}`
        );
      }

      articles.push(buildArticle(subsection, meta.category, takenSlugs));
    }
  }

  articles.push(...buildWholeChapterArticles(takenSlugs));

  return numberArticlesWithinCategory(articles);
}

export function buildXdmgChapterUrl(article: { engTitle: string }): string {
  const meta = ARTICLE_META[article.engTitle];
  if (!meta) throw new Error(`«${article.engTitle}»: невідомий підрозділ XDMG для посилання`);

  if (Object.values(WHOLE_CHAPTER_ARTICLES).includes(article.engTitle)) {
    return `https://5e.tools/book.html#xdmg,${meta.chapterIndex}`;
  }

  const anchor = article.engTitle.toLowerCase().replace(/[^a-z0-9]+/g, "%20").trim();
  return `https://5e.tools/book.html#xdmg,${meta.chapterIndex},${anchor}`;
}

/// PHB 2014 (KR29.1). Одиниця статті інша, ніж у XDMG: не `section`, а будь-який названий блок
/// верхнього рівня глави плюс вступ самої глави — глава 1 PHB тримає кроки створення як
/// `entries`. Класифікація кожного блока обовʼязкова: стаття, дубль SRD або навігація книжкою.
export function parsePhbChapters(options: { reservedSlugs?: string[] } = {}): ParsedBeyondSrdArticle[] {
  const takenSlugs = new Set(options.reservedSlugs ?? []);
  const chapters = findChapters("book/book-phb.json", PHB_CHAPTER_NAMES);

  const articles = chapters.flatMap(({ chapter, index }) =>
    splitChapterIntoBlocks(chapter, index).flatMap((block) => buildPhbArticles(block, takenSlugs))
  );

  return numberArticlesWithinCategory(articles);
}

export function buildPhbChapterUrl(article: { engTitle: string }): string {
  const meta = PHB_ARTICLE_META[article.engTitle];
  if (!meta) throw new Error(`«${article.engTitle}»: невідомий блок PHB для посилання`);

  /// Стаття зі вступу глави — це сама глава, окремого якоря в неї немає.
  const isWholeChapter = PHB_CHAPTER_NAMES.includes(article.engTitle as (typeof PHB_CHAPTER_NAMES)[number]);
  const anchor = isWholeChapter ? "" : `,${buildBookAnchor(article.engTitle)}`;
  return `https://5e.tools/book.html#phb,${meta.chapterIndex}${anchor}`;
}

/// `String.prototype.toUrlified` пінованої ревізії (`js/utils.js`), яким `BookUtil` будує
/// частину хеша: `encodeURIComponent(name.toLowerCase()).toLowerCase()`. XDMG-посилання вище
/// лишили власне наближення KR23.4 — воно розходиться на назвах із «?», «'» і «:», і виправляти
/// його тут означало б мовчки переписати вже опубліковані якорі чужої цілі.
function buildBookAnchor(engTitle: string): string {
  return encodeURIComponent(engTitle.toLowerCase()).toLowerCase();
}

export const XDMG_MIRROR_ATTRIBUTION = { repository: MIRROR_REPOSITORY, revision: MIRROR_REVISION };

/// Глави книжки за назвою, з індексом у `data` — саме цей індекс 5etools кладе в хеш посилання.
function findChapters(
  cachedFile: string,
  wantedNames: readonly string[]
): { chapter: Record<string, unknown>; index: number }[] {
  const raw = JSON.parse(readFileSync(findCachePath(cachedFile), "utf-8")) as {
    data: Record<string, unknown>[];
  };

  const chapters = raw.data
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) => wantedNames.includes(String(chapter.name)));

  if (chapters.length !== wantedNames.length) {
    throw new Error(
      `Очікували ${wantedNames.length} глав (${wantedNames.join(", ")}), знайшли ${chapters.length}. ` +
        `Корпус розійшовся з тим, під який писано розкладач — перевірте ${cachedFile} свідомо.`
    );
  }

  return chapters;
}

type PhbBlock = {
  name: string;
  entries: unknown[];
  page: number;
  chapterIndex: number;
  /// Вузол, з якого беруться підстановки `{@variable}` — глава для вступу, сам блок для решти.
  substitutionSource: Record<string, unknown>;
};

function splitChapterIntoBlocks(chapter: Record<string, unknown>, chapterIndex: number): PhbBlock[] {
  const entries = Array.isArray(chapter.entries) ? chapter.entries : [];
  const chapterPage = Number(chapter.page ?? 0);

  return [
    {
      name: String(chapter.name),
      entries: entries.filter((entry) => !isNamedBlock(entry)),
      page: chapterPage,
      chapterIndex,
      substitutionSource: chapter,
    },
    ...readNamedBlocks(entries, chapterIndex, chapterPage),
  ];
}

function readNamedBlocks(entries: unknown[], chapterIndex: number, fallbackPage: number): PhbBlock[] {
  return (entries.filter(isNamedBlock) as Record<string, unknown>[]).map((block) => ({
    name: String(block.name),
    entries: Array.isArray(block.entries) ? block.entries : [],
    page: Number(block.page ?? fallbackPage),
    chapterIndex,
    substitutionSource: block,
  }));
}

function buildPhbArticles(block: PhbBlock, takenSlugs: Set<string>): Omit<ParsedBeyondSrdArticle, "order">[] {
  const meta = PHB_ARTICLE_META[block.name];

  if (meta) {
    if (meta.chapterIndex !== block.chapterIndex) {
      throw new Error(
        `Блок PHB «${block.name}» очікувався в главі ${meta.chapterIndex}, а знайдений у ${block.chapterIndex}`
      );
    }
    return [buildPhbArticle(block, meta.category, takenSlugs)];
  }

  if (PHB_ALREADY_IN_SRD.has(block.name)) return promoteBlocksMissingFromSrd(block, takenSlugs);
  if (PHB_BOOK_NAVIGATION.has(block.name)) return [];

  throw new Error(
    `Блок PHB «${block.name}» не класифіковано: додайте його в PHB_ARTICLE_META, ` +
      "PHB_ALREADY_IN_SRD або PHB_BOOK_NAVIGATION, звіривши текст із наявним корпусом 2014."
  );
}

/// Проза підрозділу дублює SRD, а вкладений у нього блок — ні («Tiers of Play» усередині
/// «Beyond 1st Level»). Лишити підрозділ статтею означало б надрукувати дубль удруге, а після
/// перекладу (KR29.2) ще й отримати другу статтю «Після 1-го рівня» — гейт дублів для 2014 не
/// дозволяє жодного повтору заголовка. Тому підрозділ пропускається, а блок стає своєю статтею.
function promoteBlocksMissingFromSrd(
  block: PhbBlock,
  takenSlugs: Set<string>
): Omit<ParsedBeyondSrdArticle, "order">[] {
  return readNamedBlocks(block.entries, block.chapterIndex, block.page)
    .filter((nested) => PHB_ARTICLE_META[nested.name])
    .map((nested) => buildPhbArticle(nested, PHB_ARTICLE_META[nested.name].category, takenSlugs));
}

function buildPhbArticle(
  block: PhbBlock,
  category: ParsedRuleCategoryKey,
  takenSlugs: Set<string>
): Omit<ParsedBeyondSrdArticle, "order"> {
  const slug = claimSlug(kebabCase(block.name), "phb", takenSlugs);
  const subsections = splitNamedSubSections(
    block.entries,
    block.name,
    slug,
    block.substitutionSource,
    (name) => PHB_ALREADY_IN_SRD.has(name)
  );

  if (subsections.length === 0) throw new Error(`Блок PHB «${block.name}» лишився без жодного підрозділу`);

  return {
    id: `beyond-${slug}`,
    slug,
    category,
    engTitle: block.name,
    engSummary: buildSummary(subsections[0].engContent),
    engTags: [block.name, PHB_SOURCE],
    bookSource: PHB_SOURCE,
    page: block.page,
    subsections,
  };
}

function buildWholeChapterArticles(takenSlugs: Set<string>): Omit<ParsedBeyondSrdArticle, "order">[] {
  return findChapters("book/book-xdmg.json", Object.keys(WHOLE_CHAPTER_ARTICLES)).map(({ chapter, index }) => {
    const engTitle = WHOLE_CHAPTER_ARTICLES[String(chapter.name)];
    const meta = ARTICLE_META[engTitle];
    if (meta.chapterIndex !== index) {
      throw new Error(`XDMG-глава «${engTitle}» очікувалася під індексом ${meta.chapterIndex}, а знайдена під ${index}`);
    }

    const entries = Array.isArray(chapter.entries) ? chapter.entries : [];
    const article = { ...chapter, name: engTitle, entries: entries.map(dropCatalogedBlocks) };
    return buildArticle(article, meta.category, takenSlugs);
  });
}

/// Статблок приміщення живе в каталозі бастіонів, а зображення з підписом-посиланням «Download
/// PDF» (бланк Bastion Tracker) — не ілюстрація з текстом, а кнопка сайту 5etools.
function dropCatalogedBlocks(entry: unknown): unknown {
  if (!isSection(entry)) return entry;
  const section = entry as Record<string, unknown>;
  const entries = Array.isArray(section.entries) ? section.entries : [];
  return { ...section, entries: entries.filter((block) => !isStatblock(block) && !isDownloadLinkImage(block)) };
}

function isStatblock(entry: unknown): boolean {
  return typeof entry === "object" && entry !== null && (entry as Record<string, unknown>).type === "statblock";
}

function isDownloadLinkImage(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) return false;
  const { type, title } = entry as Record<string, unknown>;
  return type === "image" && typeof title === "string" && title.startsWith("{@5etoolsImg");
}

function isSection(entry: unknown): boolean {
  return typeof entry === "object" && entry !== null && (entry as Record<string, unknown>).type === "section";
}

function buildArticle(
  subsection: Record<string, unknown>,
  category: ParsedRuleCategoryKey,
  takenSlugs: Set<string>
): Omit<ParsedBeyondSrdArticle, "order"> {
  const engTitle = String(subsection.name);
  const slug = claimSlug(kebabCase(engTitle), "xdmg", takenSlugs);
  const entries = Array.isArray(subsection.entries) ? subsection.entries : [];
  const subsections = splitNamedSubSections(entries, engTitle, slug, subsection);

  return {
    id: `beyond-${slug}`,
    slug,
    category,
    engTitle,
    engSummary: buildSummary(subsections[0]?.engContent ?? ""),
    engTags: [engTitle, BOOK_SOURCE],
    bookSource: BOOK_SOURCE,
    page: Number(subsection.page ?? 0),
    subsections,
  };
}

/// Верхній рівень `entries` підрозділу ділиться на вступ (без імені) і названі блоки — той
/// самий поділ, що вже робить `variant-rules.ts` для `variantrules.json`. Вкладені названі
/// блоки глибше цього рівня (наприклад «Actions Indicate Alignment» усередині «Character
/// Alignment») лишаються всередині рендеру як `**Назва.** текст` — розкладач їх не розриває.
///
/// `isAlreadyImported` відкидає названий блок, чия проза вже є в довіднику з іншого джерела
/// (PHB: «Alignment» і «Languages» усередині «Character Details» — дослівний SRD 5.1).
function splitNamedSubSections(
  entries: unknown[],
  articleTitle: string,
  articleSlug: string,
  substitutionSource: Record<string, unknown>,
  isAlreadyImported: (name: string) => boolean = () => false
): ParsedRuleSubSection[] {
  const flow = liftNumberedBlocks(entries);
  const intro = flow.filter((entry) => !isNamedBlock(entry));
  const named = (flow.filter(isNamedBlock) as Record<string, unknown>[]).filter(
    (block) => !isAlreadyImported(String(block.name))
  );
  const takenIds = new Set<string>();

  const introContent = renderEntries(intro, substitutionSource, `${articleTitle} › intro`);
  const introSection = introContent
    ? [buildSubSection(articleSlug, articleTitle, introContent, takenIds)]
    : [];

  return [
    ...introSection,
    ...named.map((block) =>
      buildSubSection(
        articleSlug,
        String(block.name),
        renderEntries([block], substitutionSource, `${articleTitle} › ${block.name}`),
        takenIds
      )
    ),
  ].filter((subsection) => subsection.engContent.length > 0);
}

function buildSubSection(
  articleSlug: string,
  engTitle: string,
  engContent: string,
  takenIds: Set<string>
): ParsedRuleSubSection {
  return {
    id: `${articleSlug}--${claimSlug(kebabCase(engTitle), null, takenIds)}`,
    engTitle,
    engContent,
  };
}

/// «Example of Play» (XDMG) підписує репліки діалогу позначками «(1)»…«(7)», а нотатки Майстра
/// на полях — «1»…«7». Це не заголовки: позначка стає початком першої репліки свого блоку, а
/// нотатки йдуть після діалогу, як на полях сторінки, — інакше в довіднику зʼявлялися підрозділи
/// з назвою «3» (власник, 2026-09-18).
const NUMBERED_MARKER = /^\(?\d+\)?$/;

function liftNumberedBlocks(entries: unknown[]): unknown[] {
  const flow: unknown[] = [];
  const marginNotes: unknown[] = [];

  for (const entry of entries) {
    if (!isNamedBlock(entry) || !NUMBERED_MARKER.test(String((entry as { name: string }).name))) {
      flow.push(entry);
      continue;
    }
    const { name, ...block } = entry as Record<string, unknown> & { name: string };
    if (block.type === "list") flow.push({ ...block, items: markFirstListItem(block.items, name) });
    else marginNotes.push({ ...block, entries: markFirstEntry(block.entries, `**${name}.** `) });
  }

  return [...flow, ...marginNotes];
}

function markFirstListItem(items: unknown, marker: string): unknown[] {
  const [first, ...rest] = Array.isArray(items) ? items : [];
  if (typeof first === "string") return [`${marker} ${first}`, ...rest];
  if (isNamedBlock(first)) return [{ ...(first as Record<string, unknown>), name: `${marker} ${(first as { name: string }).name}` }, ...rest];
  return [first, ...rest].filter((item) => item !== undefined);
}

function markFirstEntry(entries: unknown, prefix: string): unknown[] {
  const [first, ...rest] = Array.isArray(entries) ? entries : [];
  return typeof first === "string" ? [`${prefix}${first}`, ...rest] : [first, ...rest].filter((item) => item !== undefined);
}

function isNamedBlock(entry: unknown): boolean {
  return typeof entry === "object" && entry !== null && typeof (entry as { name?: unknown }).name === "string";
}
