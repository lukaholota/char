import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { AIDEDD_DIR, findRawDir } from "./aidedd-catalogs";
import { MagicItemManifestRow } from "./build-magic-items-manifest";
import { MagicItemTranslation, readTranslationBatches } from "./read-magic-item-batches";
import { parseMagicItem2014 } from "./parse-magic-item-2014";

const MANIFEST_PATH = join(AIDEDD_DIR, "magic-items-manifest.json");

/// The four defect classes measured on the existing 248 records (O14 README) plus the two that
/// produced them: text left in English, and a name spelled one way in the title and another in the
/// body. Every check here exists because the old corpus failed it.
type Failure = { slug: string; check: string; detail: string };

function verifyMagicItems(): void {
  const translations = readTranslationBatches();
  const manifest = readManifest();

  const failures = [
    ...findManifestMismatches(translations, manifest),
    ...translations.flatMap(findRecordFailures),
    ...findMixedHitPointSpellings(translations),
  ];

  report(translations.length, failures);
  if (failures.length > 0) process.exit(1);
}

function findRecordFailures(translation: MagicItemTranslation): Failure[] {
  if (translation.deferred !== undefined) return [];

  return [
    ...findWrongDamageWord(translation),
    ...findEnglishLeftovers(translation),
    ...findForeignScript(translation),
    ...findBadNameFormat(translation),
    ...findEmptyShortDescription(translation),
    ...findProperNameMismatch(translation),
    ...findTruncatedDescription(translation),
  ];
}

/// JS `\b` is an ASCII word boundary and never fires next to a Cyrillic letter, so the boundary
/// has to be spelled out as "no letter before".
const WRONG_DAMAGE_WORD = /(?<!\p{L})урон\p{L}*/iu;

/// «урон» is the single most common defect in the current corpus: 87 occurrences in 56 items,
/// while `dictionary.json → rules.damage` says «Шкода».
function findWrongDamageWord(translation: MagicItemTranslation): Failure[] {
  const hits = readTextFields(translation).filter((field) => WRONG_DAMAGE_WORD.test(field.value));
  return hits.map((field) => ({
    slug: translation.slug,
    check: "урон замість шкоди",
    detail: `${field.name}: ${findContext(field.value, WRONG_DAMAGE_WORD)}`,
  }));
}

/// Latin runs are legal only inside the «Українська [English]» brackets and in unit glosses.
function findEnglishLeftovers(translation: MagicItemTranslation): Failure[] {
  return readTextFields(translation).flatMap((field) => {
    const stripped = field.value.replace(/\[[^\]]*\]/g, "").replace(/°[CF]/g, "");
    const runs = [...stripped.matchAll(/[A-Za-z]{2,}/g)].map((match) => match[0]);
    if (runs.length === 0) return [];
    return [
      {
        slug: translation.slug,
        check: "англійська поза дужками",
        detail: `${field.name}: ${[...new Set(runs)].join(", ")}`,
      },
    ];
  });
}

function findForeignScript(translation: MagicItemTranslation): Failure[] {
  return readTextFields(translation)
    .filter((field) => /[^\p{Script=Cyrillic}\p{Script=Latin}\p{P}\p{S}\p{N}\p{Zs}\n•…]/u.test(field.value))
    .map((field) => ({
      slug: translation.slug,
      check: "чужий алфавіт у тексті",
      detail: `${field.name}: ${findContext(field.value, /[^\p{Script=Cyrillic}\p{Script=Latin}\p{P}\p{S}\p{N}\p{Zs}\n•…]/u)}`,
    }));
}

function findBadNameFormat(translation: MagicItemTranslation): Failure[] {
  if (/^[^[\]]+ \[[^[\]]+\]$/.test(translation.name)) return [];
  return [
    {
      slug: translation.slug,
      check: "формат назви",
      detail: `очікували «Українська [English]», маємо «${translation.name}»`,
    },
  ];
}

function findEmptyShortDescription(translation: MagicItemTranslation): Failure[] {
  if (translation.shortDescription.trim() !== "") return [];
  return [
    {
      slug: translation.slug,
      check: "порожній shortDescription",
      detail: "це рядок, який рендериться у списку каталогу",
    },
  ];
}

/// «Камінь Йун» у назві й «Камінь Юна» в описі — 13 таких записів у наявному корпусі.
///
/// Вимога діє лише тоді, коли власну назву згадує САМЕ ДЖЕРЕЛО. Інакше перевірка вимагала б
/// вигадати те, чого в оригіналі немає: `Keoghtom's Ointment` починається зі слів «This glass
/// jar» і Кеогтома в тексті не називає жодного разу. Присвійних назв у каталозі 37, тож без
/// цієї умови перевірка ламала б кожну наступну партію. Випадок «Йун» вона ловить і далі —
/// англійський опис там каже «named after Ioun, a god of knowledge».
function findProperNameMismatch(translation: MagicItemTranslation): Failure[] {
  const ukrainian = translation.name.split(" [")[0];
  const properNouns = ukrainian
    .split(/\s+/)
    .slice(1)
    .filter((word) => /^[А-ЯЄІЇҐ]/.test(word));

  if (properNouns.length === 0) return [];

  const englishName = translation.name.split(" [")[1]?.replace(/\]$/, "") ?? "";
  if (!isNamedInSource(translation, englishName)) return [];

  return properNouns
    .filter((word) => !translation.description.includes(toStem(word)))
    .map((word) => ({
      slug: translation.slug,
      check: "власна назва не збігається з описом",
      detail: `«${word}» є в назві, але не в описі — а джерело її називає`,
    }));
}

function isNamedInSource(translation: MagicItemTranslation, englishName: string): boolean {
  const path = join(findRawDir("magic-items-2014"), `${translation.slug}.html`);
  if (!existsSync(path)) return false;

  const source = parseMagicItem2014(readFileSync(path, "utf-8"), translation.slug);
  return findEnglishProperNouns(englishName).some((word) => source.descriptionEng.includes(word));
}

/// У присвійній назві ім'я носить лише слово перед «'s»: `Quaal's Feather Token` — це Кваал, а не
/// Feather і не Token. Без цього звуження слово «Feather» із таблиці джерела вважалося згадкою
/// імені, і перевірка вимагала вписати «Кваала» в опис, який його не називає жодного разу.
function findEnglishProperNouns(englishName: string): string[] {
  const owner = englishName.match(/([A-Z][A-Za-z]*)'s\b/);
  if (owner) return [owner[1]];

  return englishName
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word) && !ENGLISH_NAME_STOP_WORDS.has(word));
}

/// Слова, що пишуться з великої лише тому, що стоять у назві предмета, а не тому, що вони власні.
const ENGLISH_NAME_STOP_WORDS = new Set([
  "Of", "The", "And", "Or", "Armor", "Ointment", "Stone", "Ring", "Rod", "Staff", "Wand",
  "Potion", "Scroll", "Cloak", "Boots", "Gloves", "Helm", "Bag", "Deck", "Dust", "Gem",
]);

function toStem(word: string): string {
  const bare = word.replace(/[^\p{L}]/gu, "");
  return bare.length > 4 ? bare.slice(0, bare.length - 2) : bare;
}

/// A translation shorter than a third of its source is not a translation but a summary — the
/// failure mode the non-OGL pages push a batch towards.
function findTruncatedDescription(translation: MagicItemTranslation): Failure[] {
  const path = join(findRawDir("magic-items-2014"), `${translation.slug}.html`);
  if (!existsSync(path)) return [];

  const source = parseMagicItem2014(readFileSync(path, "utf-8"), translation.slug);
  if (translation.description.length * 3 >= source.descriptionEng.length) return [];

  return [
    {
      slug: translation.slug,
      check: "опис утричі коротший за джерело",
      detail: `${translation.description.length} проти ${source.descriptionEng.length} символів`,
    },
  ];
}

/// Same ASCII-`\b` trap as above: a Cyrillic letter never forms a word boundary, so each spelling
/// has to guard its edges with an explicit "not a letter" lookaround.
const HIT_POINT_SPELLINGS = [/(?<!\p{L})ХП(?!\p{L})/u, /[Хх]іт[- ][Пп]о[іиї]нт/u, /[Хх]іт[- ][Пп]ойнт/u];

function findMixedHitPointSpellings(translations: MagicItemTranslation[]): Failure[] {
  const corpus = translations.flatMap(readTextFields).map((field) => field.value).join("\n");
  const used = HIT_POINT_SPELLINGS.filter((pattern) => pattern.test(corpus));
  if (used.length <= 1) return [];

  return [
    {
      slug: "(весь корпус)",
      check: "кілька написань хіт-поїнтів",
      detail: `знайдено ${used.length} різних написань — у наявних 248 записах їх три`,
    },
  ];
}

function findManifestMismatches(
  translations: MagicItemTranslation[],
  manifest: MagicItemManifestRow[]
): Failure[] {
  const rows = new Map(manifest.map((row) => [row.slug, row]));

  return translations.flatMap((translation) => {
    const row = rows.get(translation.slug);
    if (!row) {
      return [{ slug: translation.slug, check: "немає в маніфесті", detail: MANIFEST_PATH }];
    }
    if (row.batch === 0 && translation.deferred === undefined) {
      return [
        {
          slug: translation.slug,
          check: "перекладено рядок поза чергою",
          detail: row.note,
        },
      ];
    }
    return [];
  });
}

function readTextFields(translation: MagicItemTranslation) {
  return [
    { name: "name", value: translation.name },
    { name: "shortDescription", value: translation.shortDescription },
    { name: "description", value: translation.description },
  ];
}

function findContext(value: string, pattern: RegExp): string {
  const match = pattern.exec(value);
  if (!match) return "";
  const from = Math.max(0, match.index - 30);
  return `…${value.slice(from, match.index + match[0].length + 30)}…`;
}

function readManifest(): MagicItemManifestRow[] {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Немає ${MANIFEST_PATH} — спершу build-magic-items-manifest.ts`);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as MagicItemManifestRow[];
}

function report(checked: number, failures: Failure[]): void {
  if (failures.length === 0) {
    console.log(`✅ ${checked} перекладених предметів — усі перевірки зелені`);
    return;
  }

  console.error(`❌ ${failures.length} проблем на ${checked} перекладених предметах:`);
  for (const failure of failures) {
    console.error(`  ${failure.slug} · ${failure.check}\n      ${failure.detail}`);
  }
}

verifyMagicItems();
