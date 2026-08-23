import { readFileSync, writeFileSync } from "fs";
import { isAbsolute, join } from "path";
import { MIRROR_REVISION } from "./mirror";
import {
  findEditionBySource,
  findLooseNameKey,
  readSpellClassIndex,
  readSpells,
  SourceSpell,
  SpellClassEntry,
} from "./schema";
import { readFactsFromSource } from "./source-spell-facts";
import {
  collectUkrainianDice,
  compareSpellFacts,
  FactMismatch,
  isBaseClass,
  RATIFIED_SCHOOL_WORDS,
  readCastingTimeFromUkrainian,
  readClassFromUkrainian,
  readComponentsFromUkrainian,
  readDurationFromUkrainian,
  readRangeFromUkrainian,
  readSchoolFromUkrainian,
  SpellFacts,
} from "./spell-facts";

type Edition = "2024" | "2014";

type CatalogSpell = {
  engName: string;
  nameUkr: string;
  facts: SpellFacts;
  schoolWord: string;
  subclassesInClasses: string[];
  flaggedAsUnchanged: boolean | null;
  source: string;
};

type Comparison = {
  engName: string;
  nameUkr: string;
  flaggedAsUnchanged: boolean | null;
  mismatches: FactMismatch[];
};

type Skipped = {
  engName: string;
  reason: string;
};

type ExpandedClass = {
  name: string;
  definedIn: string;
};

/// 5etools зараховує до переліку класу й заклинання, які дає фіча, а не список. Монах списку
/// заклинань не має взагалі: `Astral Projection` він дістає з «Empty Body» на 18 рівні. Такий
/// рядок у `spell_classes` зробив би заклинання «монашим» у каталозі й у створювачі.
const CLASSES_GRANTED_BY_FEATURE: Record<string, string[]> = {
  "Astral Projection": ["Monk"],
};

/// Наші коди джерел 2014 і те, як їх звуть у 5etools.
const SOURCE_ALIASES: Record<string, string> = {
  PHB: "PHB",
  XGTE: "XGE",
  TCOE: "TCE",
  EGTW: "EGW",
  FTOD: "FTD",
  PHB_2024: "XPHB",
};

const TWENTY_FOUR_CATALOG = "data/2024/normalized/spells.json";
const CLASSIC_CATALOG = "src/lib/generated/spells.json";

function compareSpellCatalog(): void {
  const edition = readEdition();
  const sourceSpells = readSpells();
  const classIndex = readSpellClassIndex();

  const { catalog, skipped, path: catalogPath } = readCatalog(edition);
  const wanted = edition === "2024" ? "RULES_2024" : "RULES_2014";
  const bySource = indexSourceSpells(sourceSpells, wanted);

  const comparisons: Comparison[] = [];
  const unmatched: Skipped[] = [];
  const classesUnknown: string[] = [];
  const variantOnly: { engName: string; classes: ExpandedClass[] }[] = [];
  const featureGranted: { engName: string; classes: string[] }[] = [];

  for (const spell of catalog) {
    const counterpart = findCounterpart(bySource, spell);
    if (!counterpart) {
      unmatched.push({ engName: spell.engName, reason: "немає запису з такою назвою" });
      continue;
    }

    const where = `${counterpart.nameEng}|${counterpart.source}`;
    const classes = classIndex.get(`${counterpart.source}|${findLooseNameKey(counterpart.nameEng)}`);
    const grantedByFeature = (CLASSES_GRANTED_BY_FEATURE[spell.engName] ?? []).filter((name) =>
      (classes ?? []).some(
        (entry) => entry.name === name && findEditionBySource(entry.source) === wanted
      )
    );
    const { expected, expanded } = pickClassesOfEdition(classes, wanted, grantedByFeature);
    if (grantedByFeature.length > 0) {
      featureGranted.push({ engName: spell.engName, classes: grantedByFeature });
    }
    const theirs = readFactsFromSource(counterpart, expected, where);
    const compareClasses = expected.length > 0;
    if (!compareClasses) classesUnknown.push(spell.engName);

    const missingExpanded = expanded.filter((entry) => !spell.facts.classes.includes(entry.name));
    if (missingExpanded.length > 0) {
      variantOnly.push({ engName: spell.engName, classes: missingExpanded });
    }

    comparisons.push({
      engName: spell.engName,
      nameUkr: spell.nameUkr,
      flaggedAsUnchanged: spell.flaggedAsUnchanged,
      mismatches: compareSpellFacts(spell.facts, theirs, { compareClasses }),
    });
  }

  writeReport(
    edition,
    catalogPath,
    catalog,
    comparisons,
    [...skipped, ...unmatched],
    classesUnknown,
    variantOnly,
    featureGranted
  );
}

/// Клас потрапляє в перелік зі своєю книгою. Для звірки 2014 беремо лише класи з книг 2014,
/// інакше той самий «Sorcerer» приїжджає двічі — з PHB і з XPHB.
///
/// Розширені списки (`classVariant`, здебільшого TCE) входять в очікуваний перелік: рішення
/// власника 2026-08-23 — брати їх дефолтно, показуючи книгу, що їх дає. Тому вони ж і
/// перелічені окремо: не як «не рахуємо», а як «звідки цей клас узявся».
function pickClassesOfEdition(
  entries: SpellClassEntry[] | undefined,
  wanted: string,
  grantedByFeature: string[]
): { expected: string[]; expanded: ExpandedClass[] } {
  const ofEdition = (entries ?? []).filter(
    (entry) => findEditionBySource(entry.source) === wanted && !grantedByFeature.includes(entry.name)
  );

  const direct = [...new Set(ofEdition.filter((e) => !e.isVariant).map((e) => e.name))];
  const expanded = ofEdition
    .filter((e) => e.isVariant && !direct.includes(e.name))
    .map((e) => ({ name: e.name, definedIn: e.definedIn }));

  return {
    expected: [...new Set([...direct, ...expanded.map((e) => e.name)])],
    expanded: [...new Map(expanded.map((e) => [e.name, e])).values()],
  };
}

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function readEdition(): Edition {
  const edition = readFlag("edition") ?? "2024";
  if (edition !== "2024" && edition !== "2014") {
    throw new Error("Вкажіть --edition=2024 або --edition=2014");
  }
  return edition;
}

/// `--catalog=` дозволяє звірити дамп бази, ще не доїхавши до `src/lib/generated/` — саме так
/// вимірюється, що виправлення справді впали, поки прод лишається незасіяним.
function readCatalog(edition: Edition): {
  catalog: CatalogSpell[];
  skipped: Skipped[];
  path: string;
} {
  const path = readFlag("catalog") ?? (edition === "2024" ? TWENTY_FOUR_CATALOG : CLASSIC_CATALOG);
  const rows = readJsonList(path);

  const catalog: CatalogSpell[] = [];
  const skipped: Skipped[] = [];

  for (const row of rows) {
    const engName = String(row.engName);
    try {
      catalog.push(buildCatalogSpell(row, engName));
    } catch (error) {
      skipped.push({ engName, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return { catalog, skipped, path };
}

function buildCatalogSpell(row: Record<string, unknown>, engName: string): CatalogSpell {
  const where = engName;
  const ukrainianClasses = readClassNames(row);
  const schoolWord = String(row.school);

  return {
    engName,
    nameUkr: String(row.name),
    schoolWord,
    subclassesInClasses: ukrainianClasses.filter((name) => !isBaseClass(name)),
    flaggedAsUnchanged:
      typeof row.differsFrom2014 === "boolean" ? row.differsFrom2014 === false : null,
    source: String(row.source ?? ""),
    facts: {
      level: Number(row.level),
      school: readSchoolFromUkrainian(schoolWord, where),
      castingTime: readCastingTimeFromUkrainian(String(row.castingTime), where),
      range: readRangeFromUkrainian(String(row.range), where),
      components: readComponentsFromUkrainian(String(row.components ?? "")),
      duration: readDurationFromUkrainian(String(row.duration), where),
      concentration: String(row.hasConcentration).trim() === "так",
      ritual: String(row.hasRitual).trim() === "так",
      classes: ukrainianClasses
        .map(readClassFromUkrainian)
        .filter((name): name is string => name !== null)
        .sort(),
      dice: collectUkrainianDice(String(row.description ?? "")),
    },
  };
}

/// 2024-каталог тримає класи рядками, 2014 — об'єктами `spellClasses[].className`.
function readClassNames(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.classes)) return row.classes.map(String);

  if (Array.isArray(row.spellClasses)) {
    return row.spellClasses.map((entry) =>
      entry !== null && typeof entry === "object"
        ? String((entry as { className?: unknown }).className ?? "")
        : ""
    );
  }

  return [];
}

function indexSourceSpells(spells: SourceSpell[], wanted: string): Map<string, SourceSpell> {
  const index = new Map<string, SourceSpell>();

  for (const spell of spells) {
    if (spell.edition !== wanted) continue;
    const key = `${spell.source}|${findLooseNameKey(spell.nameEng)}`;
    if (!index.has(key)) index.set(key, spell);

    const looseKey = findLooseNameKey(spell.nameEng);
    if (!index.has(looseKey)) index.set(looseKey, spell);
  }

  return index;
}

/// Спершу шукаємо запис саме з нашої книги, і лише тоді — будь-який тієї ж редакції.
/// Інакше 2014-заклинання з XGE звірялося б проти передруку в іншій книзі.
function findCounterpart(
  index: Map<string, SourceSpell>,
  spell: CatalogSpell
): SourceSpell | undefined {
  const loose = findLooseNameKey(spell.engName);
  const alias = SOURCE_ALIASES[spell.source];
  return (alias ? index.get(`${alias}|${loose}`) : undefined) ?? index.get(loose);
}

function writeReport(
  edition: Edition,
  catalogPath: string,
  catalog: CatalogSpell[],
  comparisons: Comparison[],
  skipped: Skipped[],
  classesUnknown: string[],
  variantOnly: { engName: string; classes: ExpandedClass[] }[],
  featureGranted: { engName: string; classes: string[] }[]
): void {
  const diverging = comparisons.filter((row) => row.mismatches.length > 0);
  const path =
    readFlag("out") ?? join(process.cwd(), "data", "5etools", `divergence-spells-${edition}.md`);

  const sections = [
    describeHeader(
      edition,
      catalogPath,
      catalog.length,
      comparisons.length,
      diverging.length,
      skipped.length,
      classesUnknown.length
    ),
    describeFlagCrossing(edition, comparisons),
    describeFieldCounts(diverging),
    describeTerminology(catalog),
    describeSubclasses(catalog),
    describeVariantClasses(variantOnly),
    describeFeatureGranted(featureGranted),
    describeDiverging(diverging),
    describeSkipped(skipped),
  ];

  writeFileSync(path, `${sections.filter((part) => part !== "").join("\n\n")}\n`, "utf-8");
  console.log(
    `✅ ${edition}: звірено ${comparisons.length}, розійшлося ${diverging.length}, ` +
      `не звірено ${skipped.length} → ${path}`
  );
}

function describeHeader(
  edition: Edition,
  catalogPath: string,
  total: number,
  compared: number,
  diverging: number,
  skipped: number,
  classesUnknown: number
): string {
  return [
    `# Розбіжності заклинань ${edition} проти 5etools`,
    "",
    "Згенеровано `npx tsx scripts/5etools/compare-spells.ts --edition=" + edition + "`.",
    `Джерело — пінута ревізія \`${MIRROR_REVISION}\`.`,
    `Каталог — \`${catalogPath}\`.`,
    "",
    `- У каталозі: **${total}**`,
    `- Звірено полем-у-поле: **${compared}**`,
    `- Розійшлося щонайменше в одному полі: **${diverging}**`,
    `- Не звірено: **${skipped}**`,
    `- Списку класів джерело не подає (порівняно решту полів): **${classesUnknown}**`,
  ].join("\n");
}

function describeFlagCrossing(edition: Edition, comparisons: Comparison[]): string {
  if (edition !== "2024") return "";

  const flagged = comparisons.filter((row) => row.flaggedAsUnchanged === true);
  const betrayed = flagged.filter((row) => row.mismatches.length > 0);
  const changed = comparisons.filter((row) => row.flaggedAsUnchanged === false);
  const quietlyEqual = changed.filter((row) => row.mismatches.length === 0);

  return [
    "## Прапорець `differsFrom2014` проти дійсності",
    "",
    "| | Записів | З них розійшлося з XPHB |",
    "|---|---:|---:|",
    `| позначені «не змінилося» | ${flagged.length} | **${betrayed.length}** |`,
    `| позначені «змінилося» | ${changed.length} | ${changed.length - quietlyEqual.length} |`,
    "",
    `Перший рядок і є дефект: ${betrayed.length} записів мають прапорець «як у 2014», але їхні`,
    "поля не збігаються з XPHB. Прапорець ставили не за змістом.",
  ].join("\n");
}

function describeFieldCounts(diverging: Comparison[]): string {
  const counts = new Map<string, number>();
  for (const row of diverging) {
    for (const mismatch of row.mismatches) {
      counts.set(mismatch.field, (counts.get(mismatch.field) ?? 0) + 1);
    }
  }

  return [
    "## За полями",
    "",
    "| Поле | Розбіжностей |",
    "|---|---:|",
    ...[...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([field, count]) => `| \`${field}\` | ${count} |`),
  ].join("\n");
}

function describeTerminology(catalog: CatalogSpell[]): string {
  const offenders = new Map<string, number>();

  for (const spell of catalog) {
    const ratified = RATIFIED_SCHOOL_WORDS[spell.facts.school];
    if (spell.schoolWord.trim() === ratified) continue;
    offenders.set(`${spell.schoolWord} → ${ratified}`, (offenders.get(`${spell.schoolWord} → ${ratified}`) ?? 0) + 1);
  }

  if (offenders.size === 0) return "";

  return [
    "## Школи: дані проти словника",
    "",
    "У даних лежать слова, яких немає в `dictionary.json → spellSchoolTranslations`.",
    "Це не розбіжність із 5etools, а розходження всередині проєкту.",
    "",
    "| У даних → у словнику | Записів |",
    "|---|---:|",
    ...[...offenders.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([pair, count]) => `| ${pair} | ${count} |`),
  ].join("\n");
}

function describeSubclasses(catalog: CatalogSpell[]): string {
  const affected = catalog.filter((spell) => spell.subclassesInClasses.length > 0);
  if (affected.length === 0) return "";

  const names = new Map<string, number>();
  for (const spell of affected) {
    for (const name of spell.subclassesInClasses) {
      names.set(name, (names.get(name) ?? 0) + 1);
    }
  }

  return [
    "## Підкласи в переліку класів",
    "",
    `У **${affected.length}** записів серед «класів» стоять підкласи — розширені списки`,
    "заклинань 2014-стилю. У 5etools список класів заклинання містить лише базові класи.",
    "",
    "| Підклас | Заклинань |",
    "|---|---:|",
    ...[...names.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name, count]) => `| ${name} | ${count} |`),
    "",
    `Усього різних підкласів: **${names.size}**.`,
  ].join("\n");
}

/// Ці класи вже входять в очікуваний перелік, тому їхня відсутність рахується розбіжністю.
/// Розділ лишається, бо він відповідає на «звідки цей клас» — саме та атрибуція, якої
/// вимагало рішення власника.
function describeVariantClasses(variantOnly: { engName: string; classes: ExpandedClass[] }[]): string {
  if (variantOnly.length === 0) return "";

  const counts = new Map<string, number>();
  for (const row of variantOnly) {
    for (const entry of row.classes) {
      const key = `${entry.name} (${entry.definedIn})`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [
    "## Класи з розширених списків, яких у нас немає",
    "",
    `**${variantOnly.length}** заклинань дістають клас не з базового переліку, а з розширеного`,
    "списку іншої книги (`classVariant`). Рішення власника 2026-08-23 — брати їх дефолтно,",
    "показуючи книгу; тому їхня відсутність рахується розбіжністю поля `classes`.",
    "",
    "| Клас (книга розширеного списку) | Заклинань |",
    "|---|---:|",
    ...[...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => `| ${name} | ${count} |`),
  ].join("\n");
}

function describeFeatureGranted(featureGranted: { engName: string; classes: string[] }[]): string {
  if (featureGranted.length === 0) return "";

  return [
    "## Класи, які 5etools виводить із фічі, а не зі списку заклинань",
    "",
    "Ці рядки зі звірки виключені навмисно: клас дістає заклинання від своєї фічі, а не з",
    "переліку. Вписати їх у `spell_classes` означало б показати заклинання в каталозі класу.",
    "",
    "| Заклинання | Клас | Чому |",
    "|---|---|---|",
    ...featureGranted.map(
      (row) =>
        `| \`${row.engName}\` | ${row.classes.join(", ")} | у Монаха немає списку заклинань; ` +
        "`Empty Body`, 18 рівень |"
    ),
  ].join("\n");
}

function describeDiverging(diverging: Comparison[]): string {
  return [
    "## Поіменно",
    "",
    "| Заклинання | Прапорець | Поле | У нас | У 5etools |",
    "|---|---|---|---|---|",
    ...diverging.flatMap((row) =>
      row.mismatches.map(
        (mismatch, position) =>
          `| ${position === 0 ? `\`${row.engName}\`` : ""} | ` +
          `${position === 0 ? describeFlag(row.flaggedAsUnchanged) : ""} | ` +
          `\`${mismatch.field}\` | ${cut(mismatch.ours)} | ${cut(mismatch.theirs)} |`
      )
    ),
  ].join("\n");
}

function describeFlag(flaggedAsUnchanged: boolean | null): string {
  if (flaggedAsUnchanged === null) return "—";
  return flaggedAsUnchanged ? "«не змінилося»" : "«змінилося»";
}

function describeSkipped(skipped: Skipped[]): string {
  if (skipped.length === 0) return "**Не звірено:** жодного.";

  return [
    "## Не звірено",
    "",
    "| Заклинання | Чому |",
    "|---|---|",
    ...skipped.map((row) => `| \`${row.engName}\` | ${row.reason} |`),
  ].join("\n");
}

function cut(value: string): string {
  const cleaned = value.replace(/\|/g, "\\|");
  return cleaned.length > 70 ? `${cleaned.slice(0, 70)}…` : cleaned || "—";
}

function readJsonList(path: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(
    readFileSync(isAbsolute(path) ? path : join(process.cwd(), path), "utf-8")
  );
  if (!Array.isArray(parsed)) throw new Error(`${path}: очікували масив`);

  return parsed.map((row, index) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${path}[${index}]: очікували об'єкт`);
    }
    return row as Record<string, unknown>;
  });
}

try {
  compareSpellCatalog();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
