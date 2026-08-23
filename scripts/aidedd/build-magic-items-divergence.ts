import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { ParsedMagicItem } from "./magic-item-schema";
import { parseMagicItem2014 } from "./parse-magic-item-2014";
import { ExistingMagicItem, indexExistingByMatchKey, toMatchKey } from "./existing-magic-items";
import { MagicItemManifestRow } from "./build-magic-items-manifest";
import { readMagicItemBaseline } from "../../prisma/seed/magicItemBaseline";
import {
  applyBatchesToBaseline,
  readMagicItemBatches,
  COVERED_BY_EXISTING_ENTRIES,
  SOURCE_ITEM_TYPE_OVERRIDES,
} from "../../prisma/seed/magicItemBatches";

/// Той самий предмет двома назвами: aidedd друкує назву 2014, а наш каталог завів ще й
/// запис під назвою 2024, коли 224 предмети приїхали з нормалізованого 2024-JSON. Обидва
/// записи живі, id обох — публічні адреси, тому звіт їх називає, а не зшиває.
const SAME_ITEM_UNDER_TWO_NAMES: Array<{ pageName: string; ourDuplicate: string }> = [
  { pageName: "Apparatus of Kwalish", ourDuplicate: "Apparatus of the Crab" },
  { pageName: "Nolzur's Marvelous Pigments", ourDuplicate: "Marvelous Pigments" },
  { pageName: "Quiver of Ehlonna", ourDuplicate: "Efficient Quiver" },
];

const DIVERGENCE_PATH = join(AIDEDD_DIR, "divergence-magic-items.md");
const MANIFEST_PATH = join(AIDEDD_DIR, "magic-items-manifest.json");
const POOL_2024_PATH = join(process.cwd(), "data/2024/normalized/magic-items.json");

type SeededCatalogItem = ExistingMagicItem & { description: string };

function buildDivergenceReport(): void {
  const items = readParsedItems();
  const baseline = readBaselineCorpus();
  const existing = readSeededCorpus();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as MagicItemManifestRow[];

  writeFileSync(DIVERGENCE_PATH, renderReport(items, baseline, existing, manifest), "utf-8");
  console.log(`✅ ${DIVERGENCE_PATH}`);
}

function renderReport(
  items: ParsedMagicItem[],
  baseline: SeededCatalogItem[],
  existing: SeededCatalogItem[],
  manifest: MagicItemManifestRow[]
): string {
  const byMatchKey = indexExistingByMatchKey(existing);
  const pageKeys = new Set(items.map((item) => toMatchKey(item.nameEng)));

  const matched = items.filter((item) => byMatchKey.has(toMatchKey(item.nameEng)));
  const newToUs = items.filter((item) => !byMatchKey.has(toMatchKey(item.nameEng)));
  const summaryMatched = matched.filter((item) => item.isSummaryOnly);
  const bundles = findBundles(manifest);
  const coveredNames = new Set(bundles.flatMap((row) => row.covers));
  const oursOnly = existing.filter(
    (item) => !pageKeys.has(toMatchKey(item.engName)) && !coveredNames.has(item.engName)
  );
  const coveredItems = existing.filter((item) => coveredNames.has(item.engName));
  const bothPageAndBundle = coveredItems.filter((item) => pageKeys.has(toMatchKey(item.engName)));
  const namesFrom2024 = read2024PoolKeys();
  const duplicates = findDuplicatesUnderTwoNames(existing, pageKeys);
  const fieldRows = findFieldDivergences(items, baseline, existing, manifest);
  const unresolvedFields = fieldRows.filter((row) => row.state === UNRESOLVED_FIELD_STATE);

  return [
    "# Розбіжності: наш каталог проти aidedd (magic-items-2014)",
    "",
    "> Згенеровано `npx tsx scripts/aidedd/build-magic-items-divergence.ts`. Руками не редагувати.",
    "",
    "«Наш каталог» тут — корпус, який кладе в базу сід: `prisma/seed/magic-items/baseline.json`",
    "плюс партії перекладу. Не `src/lib/generated/magicItems.json` — той не в git і відстає.",
    "",
    "| | Скільки |",
    "|---|---:|",
    `| Сторінок aidedd | ${items.length} |`,
    `| Записів у нашому каталозі | ${existing.length} |`,
    `| Збіг за назвою | ${matched.length} |`,
    `| З них сторінка aidedd має **лише резюме** (не OGL) | ${summaryMatched.length} |`,
    `| Сторінок aidedd, яких у нас немає | ${newToUs.length} |`,
    `| З них лише резюме | ${newToUs.filter((item) => item.isSummaryOnly).length} |`,
    `| Наших записів, покритих сторінкою-бандлом | ${coveredNames.size} на ${bundles.length} сторінок |`,
    `| Наших записів без сторінки й без бандла | ${oursOnly.length} |`,
    `| З них — той самий предмет уже є під назвою 2014 | ${duplicates.length} |`,
    `| Збігів, де тип, рідкість чи налаштування розійшлися з джерелом | ${fieldRows.length} |`,
    `| З них ще не розвʼязано | ${unresolvedFields.length} |`,
    "",
    "Числа сходяться в обидва боки, і це варто перевіряти щоразу:",
    "",
    `- сторінки: ${matched.length} збігів + ${newToUs.length} нових = **${items.length}**;`,
    `- наші записи: ${matched.length} зі сторінкою + ${coveredItems.length} у бандлі − ` +
      `${bothPageAndBundle.length} на два боки (${bothPageAndBundle.map((item) => item.engName).join(", ")}) + ` +
      `${oursOnly.length} без нічого = **${existing.length}**.`,
    "",
    "## 1. Збіг, але джерело дає тільки резюме",
    "",
    "aidedd не публікує текст правил для не-OGL предметів — замість опису там рядок",
    "«Description not available (not OGL)» і один рядок переказу. Для цих предметів імпорт із",
    "джерела **не дає тексту**: наш наявний опис довший і змістовніший, тож переклад заново тут",
    "означав би втрату правил. Вони позначені `deferred` у маніфесті й не входять у жодну партію.",
    "",
    "**Рішення: свідомо не беремо** — наш опис лишається.",
    "",
    "| Предмет | Наш опис, символів | aidedd, символів |",
    "|---|---:|---:|",
    ...summaryMatched
      .map((item) => ({ item, existing: byMatchKey.get(toMatchKey(item.nameEng)) }))
      .sort((left, right) => readLength(right.existing) - readLength(left.existing))
      .map(
        ({ item, existing: row }) =>
          `| ${item.nameEng} | ${readLength(row)} | ${item.descriptionEng.length} |`
      ),
    "",
    "## 2. Сторінки aidedd, яких у нас немає",
    "",
    `${newToUs.length} предметів. З них ${newToUs.filter((item) => item.isSummaryOnly).length} — ` +
      "тільки резюме, тобто доімпортувати їх з aidedd означає завести запис із однорядковим описом.",
    `Реально придатних до імпорту: **${newToUs.filter((item) => !item.isSummaryOnly).length}**.`,
    "Брати їх чи ні — відкрите питання 3 O14.",
    "",
    "| Предмет | Джерело | Рішення |",
    "|---|---|---|",
    ...newToUs.map(
      (item) =>
        `| ${item.nameEng} | ${item.source} | ${
          item.isSummaryOnly ? "свідомо не беремо — лише резюме" : "придатний, чекає рішення 3"
        } |`
    ),
    "",
    "## 3. Наш розпил бандлів",
    "",
    "Одна сторінка aidedd — кілька наших записів. Політика розпилу — відкрите питання 2 O14.",
    "Джерело покриття: `м` — маніфест (сторінку розписано в партії), `к` —",
    "`COVERED_BY_EXISTING_ENTRIES` (сторінку пропущено, текст уже стоїть на варіантах).",
    "",
    "| Сторінка aidedd | Джерело | Наших записів | Які саме |",
    "|---|---|---:|---|",
    ...bundles.map(
      (row) => `| ${row.name} | ${row.origin} | ${row.covers.length} | ${row.covers.join(", ")} |`
    ),
    "",
    "## 4. Наші записи без сторінки aidedd і без бандла",
    "",
    `${oursOnly.length} записів, і кожен має причину.`,
    "",
    "| Предмет | id | Рідкість | Чому немає сторінки |",
    "|---|---:|---|---|",
    ...oursOnly
      .sort((left, right) => left.engName.localeCompare(right.engName))
      .map(
        (item) =>
          `| ${item.engName} | ${item.magicItemId} | ${item.rarity} | ${explainMissingPage(
            item,
            namesFrom2024,
            duplicates
          )} |`
      ),
    "",
    "## 5. Той самий предмет двома назвами",
    "",
    "2024 перейменувала ці предмети, і в каталозі опинилися **обидва** записи: наш власний під",
    "назвою 2024 і завезений партією під назвою 2014. Обидва id — публічні адреси",
    "`/magic-items/NNNN`, тому звіт їх називає, а не зшиває: злиття означає прибрати одну адресу,",
    "а це рішення власника (питання 2).",
    "",
    "| Сторінка aidedd (назва 2014) | id | Наш дубль (назва 2024) | id |",
    "|---|---:|---|---:|",
    ...duplicates.map((pair) => {
      const page = byMatchKey.get(toMatchKey(pair.pageName));
      const ours = byMatchKey.get(toMatchKey(pair.ourDuplicate));
      return `| ${pair.pageName} | ${page?.magicItemId ?? "?"} | ${pair.ourDuplicate} | ${ours?.magicItemId ?? "?"} |`;
    }),
    "",
    "## 6. Поля збігів: тип, рідкість, налаштування",
    "",
    "Розділи 1–5 звіряють назви. Цей звіряє **механічну класифікацію** тих предметів, у яких",
    "сторінка aidedd і наш каталог зійшлися за назвою: `itemType`, `rarity`, `requiresAttunement`",
    "поле-в-поле. Порівнюються три стани: **базовий корпус** (`baseline.json` — те, що було до",
    "O14), **aidedd** (розпарсена сторінка) і **сід зараз** (базовий корпус плюс партії).",
    "",
    `Зіставилося за назвою з базовим корпусом: **${countBaselineMatches(items, baseline)}**. ` +
      `Розійшлися: **${fieldRows.length}**. Ще не розвʼязано: **${unresolvedFields.length}**.`,
    "",
    "| Предмет | Поле | Базовий корпус | aidedd | Сід зараз | Маніфест | Що це |",
    "|---|---|---|---|---|---|---|",
    ...fieldRows.map(
      (row) =>
        `| ${row.nameEng} | ${row.field} | ${row.baseline} | ${row.page} | ${row.seeded} | ` +
        `${row.status} | ${row.state} |`
    ),
    "",
    "Розбіжність вважається розвʼязаною, коли партія перекладу вже переписала поле значенням",
    "джерела, або коли значення джерела свідомо відхилене в `SOURCE_ITEM_TYPE_OVERRIDES`.",
    "Нерозвʼязані — це предмети зі сторінкою «лише резюме»: рядок типу на такій сторінці є, а",
    "тексту правил немає, тому предмет позначено `deferred` і в жодну партію він не входить —",
    "виправити поле нема кому. Це відкрите питання власника, а не дефект конвеєра.",
    "",
  ].join("\n");
}

type FieldDivergence = {
  nameEng: string;
  field: string;
  baseline: string;
  page: string;
  seeded: string;
  status: string;
  state: string;
};

const UNRESOLVED_FIELD_STATE = "не розвʼязано — сторінка лише резюме, у партію не входить";

/// KR14.2 вимагала звірити тип, рідкість і налаштування на кожному збігу за назвою й пояснити
/// кожен розхід, а не полагодити його мовчки. Тому звіт показує всі три стани поля: партія
/// могла вже взяти значення джерела, могла його свідомо відхилити, а могла не існувати зовсім.
function findFieldDivergences(
  items: ParsedMagicItem[],
  baseline: SeededCatalogItem[],
  existing: SeededCatalogItem[],
  manifest: MagicItemManifestRow[]
): FieldDivergence[] {
  const byBaseline = indexExistingByMatchKey(baseline);
  const bySeeded = indexExistingByMatchKey(existing);
  const statuses = new Map(manifest.map((row) => [row.slug, row.status]));

  return items.flatMap((item) => {
    const before = byBaseline.get(toMatchKey(item.nameEng));
    const now = bySeeded.get(toMatchKey(item.nameEng));
    if (!before || !now) return [];

    return [
      readFieldRow(item, "тип", before.itemType, item.itemType, now.itemType, statuses),
      readFieldRow(item, "рідкість", before.rarity, item.rarity, now.rarity, statuses),
      readFieldRow(
        item,
        "налаштування",
        String(before.requiresAttunement),
        String(item.requiresAttunement),
        String(now.requiresAttunement),
        statuses
      ),
    ].filter((row): row is FieldDivergence => row !== null);
  });
}

/// Порожнє значення на сторінці — це «джерело не сказало» (rarity varies у бандлів), а не
/// розбіжність: заперечувати наш каталог мовчанням джерела не можна.
function readFieldRow(
  item: ParsedMagicItem,
  field: string,
  baseline: string,
  page: string,
  seeded: string,
  statuses: Map<string, string>
): FieldDivergence | null {
  if (page === "" || page === baseline) return null;

  return {
    nameEng: item.nameEng,
    field,
    baseline,
    page,
    seeded,
    status: statuses.get(item.slug) ?? "?",
    state: findFieldState(item.slug, field, page, seeded),
  };
}

function findFieldState(slug: string, field: string, page: string, seeded: string): string {
  if (seeded === page) return "виправлено партією за джерелом";
  if (field === "тип" && SOURCE_ITEM_TYPE_OVERRIDES[slug] === seeded) {
    return "дефект джерела — рядок типу заперечує текст тієї самої сторінки, `SOURCE_ITEM_TYPE_OVERRIDES`";
  }
  return UNRESOLVED_FIELD_STATE;
}

function countBaselineMatches(items: ParsedMagicItem[], baseline: SeededCatalogItem[]): number {
  const keys = new Set(baseline.map((item) => toMatchKey(item.engName)));
  return items.filter((item) => keys.has(toMatchKey(item.nameEng))).length;
}

type Bundle = { name: string; slug: string; covers: string[]; origin: string };

/// Бандли приходять із двох незалежних місць, і жодне з них не повне: маніфест знає ті
/// сторінки, які партія розписала на варіанти, а COVERED_BY_EXISTING_ENTRIES — ті, які
/// партія свідомо пропустила. Звіт, що дивиться лише в маніфест, показує варіанти
/// `Weapon +1/+2/+3` як записи без сторінки.
function findBundles(manifest: MagicItemManifestRow[]): Bundle[] {
  const bundles = new Map<string, Bundle>();

  for (const row of manifest) {
    if (row.coversExistingEngNames.length > 0) {
      bundles.set(row.slug, { name: row.nameEng, slug: row.slug, covers: [...row.coversExistingEngNames], origin: "м" });
    }
  }
  for (const [slug, covers] of Object.entries(COVERED_BY_EXISTING_ENTRIES)) {
    const known = bundles.get(slug);
    if (known) {
      known.covers = [...new Set([...known.covers, ...covers])];
      known.origin = "м+к";
      continue;
    }
    bundles.set(slug, { name: readManifestName(manifest, slug), slug, covers: [...covers], origin: "к" });
  }

  return [...bundles.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function readManifestName(manifest: MagicItemManifestRow[], slug: string): string {
  return manifest.find((row) => row.slug === slug)?.nameEng ?? slug;
}

function findDuplicatesUnderTwoNames(
  existing: SeededCatalogItem[],
  pageKeys: Set<string>
): Array<{ pageName: string; ourDuplicate: string }> {
  const byKey = new Set(existing.map((item) => toMatchKey(item.engName)));

  for (const pair of SAME_ITEM_UNDER_TWO_NAMES) {
    const bothInCatalog = byKey.has(toMatchKey(pair.pageName)) && byKey.has(toMatchKey(pair.ourDuplicate));
    const duplicateHasNoPage = !pageKeys.has(toMatchKey(pair.ourDuplicate));

    if (!bothInCatalog || !duplicateHasNoPage) {
      throw new Error(
        `SAME_ITEM_UNDER_TWO_NAMES застарів: «${pair.pageName}» / «${pair.ourDuplicate}» ` +
          "більше не є парою з каталогу без сторінки. Перевірте перелік."
      );
    }
  }

  return SAME_ITEM_UNDER_TWO_NAMES;
}

function explainMissingPage(
  item: SeededCatalogItem,
  namesFrom2024: Set<string>,
  duplicates: Array<{ ourDuplicate: string }>
): string {
  if (duplicates.some((pair) => pair.ourDuplicate === item.engName)) {
    return "дубль — той самий предмет уже є під назвою 2014, розділ 5";
  }
  if (namesFrom2024.has(toMatchKey(item.engName))) {
    return "є в data/2024/normalized/magic-items.json — приїхав із 2024-пулу, сторінки 2014 немає";
  }
  return "немає ні серед 473 сторінок aidedd, ні в 2024-пулі — потребує погляду власника";
}

function read2024PoolKeys(): Set<string> {
  const rows = JSON.parse(readFileSync(POOL_2024_PATH, "utf-8")) as Array<{ engName?: string }>;
  return new Set(rows.map((row) => toMatchKey(row.engName ?? "")));
}

/// «Наш каталог» для звіту — це те, що покладе в базу сід: базовий корпус плюс партії.
/// Порівнювати з src/lib/generated/magicItems.json не можна: він не в git і відстає на
/// три предмети, які партії 01/03/07 вже завели.
function readSeededCorpus(): SeededCatalogItem[] {
  const { items } = applyBatchesToBaseline(readMagicItemBaseline(), readMagicItemBatches());
  return items.map(toCatalogItem);
}

/// Базовий корпус — каталог до O14. Розділ 6 звіряє з ним, бо саме він показує, що імпорт
/// змінив, а що лишив як було.
function readBaselineCorpus(): SeededCatalogItem[] {
  return readMagicItemBaseline().map(toCatalogItem);
}

function toCatalogItem(item: {
  magicItemId?: number | null;
  engName: string;
  name: string;
  itemType: unknown;
  rarity: unknown;
  requiresAttunement?: boolean | null;
  shortDescription?: string | null;
  description: string;
}): SeededCatalogItem {
  return {
    magicItemId: item.magicItemId ?? 0,
    engName: item.engName,
    name: item.name,
    itemType: String(item.itemType),
    rarity: String(item.rarity),
    requiresAttunement: item.requiresAttunement === true,
    shortDescription: item.shortDescription ?? null,
    description: item.description,
  };
}

function readLength(item: SeededCatalogItem | undefined): number {
  return item?.description.length ?? 0;
}

function readParsedItems(): ParsedMagicItem[] {
  const dir = findRawDir("magic-items-2014");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".html"))
    .sort()
    .map((file) => parseMagicItem2014(readFileSync(join(dir, file), "utf-8"), file.replace(/\.html$/, "")));
}

buildDivergenceReport();
