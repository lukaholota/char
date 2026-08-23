import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { decomposeMarkup, KNOWN_MARKUP_TAGS } from "./markup";
import { MIRROR_REPOSITORY, MIRROR_REVISION, readLockedSourceLock } from "./mirror";
import {
  collectStringsDeep,
  findLooseNameKey,
  readCorpusFiles,
  readCreatures,
  readFacilities,
  readItems,
  readMagicVariants,
  readSpells,
  SourceCreature,
  SourceItem,
  SourceRecord,
  SourceSpell,
} from "./schema";

const REPORT_PATH = join(process.cwd(), "data", "5etools", "coverage.md");

type NameMatch = {
  total: number;
  matched: number;
  missing: string[];
};

function buildCoverageReport(): void {
  const lock = readLockedSourceLock();
  const creatures = readCreatures();
  const spells = readSpells();
  const items = readItems();
  const variants = readMagicVariants();
  const facilities = readFacilities();

  const sections = [
    describeSource(lock.capturedAt, Object.keys(lock.files).length, sumBytes(lock)),
    describeCreatures(creatures),
    describeMagicItems(items, variants),
    describeSpells(spells),
    describeFacilities(facilities),
    describeMarkup(),
  ];

  writeFileSync(REPORT_PATH, `${sections.join("\n\n")}\n`, "utf-8");
  console.log(`✅ Звіт покриття → ${REPORT_PATH}`);
}

function describeSource(capturedAt: string, fileCount: number, bytes: number): string {
  return [
    "# Покриття 5etools — що джерело дає проти того, що в нас відкладено",
    "",
    "Згенеровано `npx tsx scripts/5etools/build-coverage.ts`. **Числа обчислені з даних і",
    "маніфестів, не переписані з README** — інакше вони застаріють мовчки.",
    "",
    `- Дзеркало: \`${MIRROR_REPOSITORY}\``,
    `- Ревізія: \`${MIRROR_REVISION}\``,
    `- Замок знято: ${capturedAt} · ${fileCount} файлів · ${(bytes / 1_048_576).toFixed(1)} МіБ`,
  ].join("\n");
}

function describeCreatures(creatures: SourceCreature[]): string {
  const playable = creatures.filter((creature) => creature.isFullStatblock);
  const classic = buildNameIndex(playable.filter((creature) => creature.edition === "RULES_2014"));
  const modern = buildNameIndex(playable.filter((creature) => creature.edition === "RULES_2024"));

  const pending2014 = findPendingCreatures("RULES_2014");
  const pending2024 = findPendingCreatures("RULES_2024");

  const match2014 = matchNames(pending2014, classic);
  const match2024 = matchNames(pending2024, modern);

  return [
    "## Істоти",
    "",
    `Усього записів у бестіарії: **${creatures.length}**, із них із повним статблоком —`,
    `**${playable.length}**. «Повний» означає AC, HP, швидкість і шість характеристик;`,
    "`cr` навмисно не в переліку — у заклинальних статблоків 2024 його немає.",
    "",
    "| Що відкладено в нас | Скільки | Є в 5etools |",
    "|---|---:|---:|",
    `| Істоти 2014 (\`import-manifest.json\`, \`pending\`) | ${match2014.total} | **${match2014.matched}** |`,
    `| Істоти 2024 | ${match2024.total} | **${match2024.matched}** |`,
    "",
    describeMissing("Не знайшлися серед 2014", match2014.missing),
    describeMissing("Не знайшлися серед 2024", match2024.missing),
  ].join("\n");
}

function describeMagicItems(items: SourceItem[], variants: SourceItem[]): string {
  const deferred = findDeferredMagicItems();
  const classic = (record: SourceItem) => record.edition === "RULES_2014" && record.hasFullText;

  const byContainer = {
    item: buildNameIndex(items.filter((it) => it.container === "item" && classic(it))),
    itemGroup: buildNameIndex(items.filter((it) => it.container === "itemGroup" && classic(it))),
    magicvariant: buildNameIndex(variants.filter(classic)),
  };

  const counts = { item: 0, itemGroup: 0, magicvariant: 0 };
  const residue: string[] = [];

  for (const name of deferred) {
    const key = findLooseNameKey(name);
    if (byContainer.item.has(key)) counts.item += 1;
    else if (byContainer.itemGroup.has(key)) counts.itemGroup += 1;
    else if (byContainer.magicvariant.has(key)) counts.magicvariant += 1;
    else residue.push(name);
  }

  return [
    "## Магічні предмети",
    "",
    `Відкладено в \`magic-items-manifest.json\`: **${deferred.length}** (сторінка aidedd мала`,
    "лише резюме). Де вони знайшлися в 5etools, за редакцією 2014 і з непорожнім текстом:",
    "",
    "| Де | Скільки |",
    "|---|---:|",
    `| \`items.json\` → \`item\` | **${counts.item}** |`,
    `| \`items.json\` → \`itemGroup\` | ${counts.itemGroup} |`,
    `| \`magicvariants.json\` | ${counts.magicvariant} |`,
    `| ніде за точною назвою | ${residue.length} |`,
    "",
    "Останній рядок — не прогалина джерела, а різниця зернистості: 5etools розписує",
    "`+1/+2/+3 Amulet of the Devout` трьома записами, а тату — за типом шкоди. Розпил і",
    "звірка назв — робота KR16.4.",
    "",
    describeMissing("Ніде за точною назвою", residue),
  ].join("\n");
}

function describeSpells(spells: SourceSpell[]): string {
  const classic = buildNameIndex(spells.filter((spell) => spell.edition === "RULES_2014"));
  const xphb = spells.filter((spell) => spell.source === "XPHB");

  const ours2014 = findRatifiedSpellNames();
  const ours2024 = findNormalized2024SpellNames();

  const match2014 = matchNames(ours2014, classic);
  const match2024 = matchNames(ours2024, buildNameIndex(xphb));

  return [
    "## Заклинання",
    "",
    "| Наш каталог | Скільки | Знайшлося в 5etools |",
    "|---|---:|---:|",
    `| \`dictionary.json → SPELLS\` (2014) | ${match2014.total} | **${match2014.matched}** |`,
    `| \`data/2024/normalized/spells.json\` | ${match2024.total} | **${match2024.matched}** |`,
    "",
    `У \`spells-xphb.json\` — **${xphb.length}** заклинань. Це вхід для KR16.2, де 391 запис`,
    "2024 звіряється полем-у-поле.",
    "",
    describeMissing("Немає в корпусі 2014 за назвою", match2014.missing),
    describeMissing("Немає в XPHB за назвою", match2024.missing),
  ].join("\n");
}

function describeFacilities(facilities: ReturnType<typeof readFacilities>): string {
  const special = facilities.filter((facility) => facility.facilityType === "special").length;
  const basic = facilities.filter((facility) => facility.facilityType === "basic").length;

  return [
    "## Бастіони",
    "",
    `\`bastions.json\` — **${facilities.length}** споруд: ${special} особливих, ${basic} базових.`,
    "",
    "| Книга | Споруд |",
    "|---|---:|",
    ...countBySource(facilities).map(([source, count]) => `| ${source} | ${count} |`),
    "",
    "Цього контенту в проєкті не існує взагалі — KR16.6 створює каталог із нуля.",
  ].join("\n");
}

function describeMarkup(): string {
  const files = readCorpusFiles();
  const seen = new Map<string, number>();
  let decomposed = 0;

  for (const file of files) {
    for (const text of collectStringsDeep(file.content)) {
      if (!text.includes("{@")) continue;
      decomposed += 1;
      for (const tag of findTags(text)) seen.set(tag, (seen.get(tag) ?? 0) + 1);
      decomposeMarkup(text, file.path);
    }
  }

  const unknown = [...seen.keys()].filter((tag) => !KNOWN_MARKUP_TAGS.includes(tag));

  return [
    "## Розмітка",
    "",
    `Рядків із \`{@…}\` у корпусі: **${decomposed}** (усі ${files.length} файлів`,
    "пінутої ревізії). Кожен розкладено `scripts/5etools/markup.ts` без помилок — тобто",
    "жодного тега не викинуто мовчки.",
    "",
    `- Тегів у корпусі: **${seen.size}**`,
    `- Тегів знає розкладач: **${KNOWN_MARKUP_TAGS.length}**`,
    `- Невідомих: **${unknown.length}**${unknown.length > 0 ? ` — ${unknown.join(", ")}` : ""}`,
    "",
    "| Тег | Разів |",
    "|---|---:|",
    ...[...seen.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([tag, count]) => `| \`{@${tag}}\` | ${count} |`),
  ].join("\n");
}

function describeMissing(title: string, names: string[]): string {
  if (names.length === 0) return `**${title}:** жодного.`;
  return `**${title}** (${names.length}): ${names.map((name) => `\`${name}\``).join(", ")}.`;
}

function buildNameIndex(records: { nameEng: string }[]): Set<string> {
  return new Set(records.map((record) => findLooseNameKey(record.nameEng)));
}

function matchNames(names: string[], index: Set<string>): NameMatch {
  const missing = names.filter((name) => !index.has(findLooseNameKey(name)));
  return { total: names.length, matched: names.length - missing.length, missing };
}

function countBySource(records: SourceRecord[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.source, (counts.get(record.source) ?? 0) + 1);
  return [...counts.entries()].sort(([, a], [, b]) => b - a);
}

function findTags(text: string): string[] {
  return [...text.matchAll(/\{@([^ |}]+)/g)].map((match) => match[1]);
}

function findPendingCreatures(edition: string): string[] {
  return readJsonList("data/aidedd/import-manifest.json")
    .filter((row) => row.edition === edition && row.status === "pending")
    .map((row) => String(row.nameEng));
}

function findDeferredMagicItems(): string[] {
  return readJsonList("data/aidedd/magic-items-manifest.json")
    .filter((row) => row.status === "deferred")
    .map((row) => String(row.nameEng));
}

function findRatifiedSpellNames(): string[] {
  const dictionary = JSON.parse(
    readFileSync(join(process.cwd(), "src/lib/refs/dictionary.json"), "utf-8")
  ) as { SPELLS: Record<string, { eng_name: string }> };

  return Object.values(dictionary.SPELLS).map((spell) => spell.eng_name);
}

function findNormalized2024SpellNames(): string[] {
  return readJsonList("data/2024/normalized/spells.json").map((row) => String(row.engName));
}

function readJsonList(relativePath: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf-8"));
  if (!Array.isArray(parsed)) throw new Error(`${relativePath}: очікували масив`);

  return parsed.map((row, index) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${relativePath}[${index}]: очікували об'єкт`);
    }
    return row as Record<string, unknown>;
  });
}

function sumBytes(lock: { files: Record<string, { bytes: number }> }): number {
  return Object.values(lock.files).reduce((total, file) => total + file.bytes, 0);
}

try {
  buildCoverageReport();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
