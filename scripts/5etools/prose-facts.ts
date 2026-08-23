/// Звірка **прози** заклинання з оригіналом — те, чого `spell-facts.ts` не бачить.
///
/// Поля `Darkvision` збігаються з XPHB до останнього, бо дальність у нього «Дотик», і вона
/// правильна. А в тексті стояв темний зір 60 футів замість 150. Тут ловиться саме це.
///
/// Звіряються ознаки, що переживають переклад: числа з одиницями, кубики, стани, типи дій,
/// характеристика ряткидка, типи шкоди. **Двосторонньо** — зайве в нас важить не менше за
/// відсутнє: `Counterspell` носив числа 3, 4 і 10, яких у XPHB немає взагалі, бо це залишок
/// механіки 2014.
///
/// **Чого це не доводить.** Що переклад правильний. Тільки що в тексті є ті самі величини,
/// стани й типи дій, що в оригіналі, і немає зайвих. Порядок і зміст речень лишаються за
/// людиною.
///
/// Українські корені **виводяться зі словника**, а не тримаються тут другим глосарієм:
/// кожен корінь мусить бути початком терміна з `dictionary.json`, інакше модуль не
/// завантажиться. Форми, яких словник ще не знає, стоять окремо, поіменно й з причиною —
/// у `VARIANT_STEMS`, а не порогом «дозволено N відсотків».

import dictionaryFile from "../../src/lib/refs/dictionary.json";
import { decomposeMarkup, findReferenceKey, MarkupReference } from "./markup";
import { collectStringsDeep, SourceSpell } from "./schema";
import { collectEnglishDice, collectUkrainianDice } from "./spell-facts";

export type ProseFactKind = "measure" | "dice" | "condition" | "action" | "save" | "damageType";

export type ProseFact = { kind: ProseFactKind; value: string };

export type ProseFactSide = "тільки в нас" | "тільки в XPHB";

export type ProseFactMismatch = ProseFact & { side: ProseFactSide };

const dictionary = dictionaryFile.DND_DICTIONARY;

export function collectSourceProseFacts(spell: SourceSpell, where: string): ProseFact[] {
  const { text, references } = readSourceProse(spell, where);

  return sortFacts([
    ...findEnglishMeasures(text),
    ...collectEnglishDice(text).map((die) => ({ kind: "dice" as const, value: die })),
    ...findSourceConditions(references, where),
    ...findSourceActions(text, references, where),
    ...findEnglishSaves(text),
    ...findEnglishDamageTypes(text),
  ]);
}

/// Терміни шукаються в тексті **як він написаний**, а не в зведеному до нижнього регістру:
/// назви дій відрізняються від звичайних слів саме великою літерою («дію Сховатися» проти
/// «не може сховатися»). Величини й ряткидки регістру не мають, тож їм дістається зведений.
export function collectUkrainianProseFacts(description: string, where: string): ProseFact[] {
  const written = normalizeApostrophes(description);
  const lowered = written.toLocaleLowerCase("uk");

  return sortFacts([
    ...findUkrainianMeasures(lowered, where),
    ...collectUkrainianDice(description).map((die) => ({ kind: "dice" as const, value: die })),
    ...findUkrainianTerms(written, CONDITION_TERMS, "condition"),
    ...findUkrainianTerms(written, ACTION_TERMS, "action"),
    ...findUkrainianSaves(lowered),
    ...findUkrainianDamageTypes(written),
  ]);
}

/// Двостороння: «тільки в нас» — залишок чужої редакції, «тільки в XPHB» — прогалина перекладу.
export function compareProseFacts(ours: ProseFact[], theirs: ProseFact[]): ProseFactMismatch[] {
  const oursKeys = new Set(ours.map(findFactKey));
  const theirsKeys = new Set(theirs.map(findFactKey));

  return sortFacts([
    ...theirs.filter((fact) => !oursKeys.has(findFactKey(fact))),
    ...ours.filter((fact) => !theirsKeys.has(findFactKey(fact))),
  ]).map((fact) => ({
    ...fact,
    side: theirsKeys.has(findFactKey(fact)) ? "тільки в XPHB" : "тільки в нас",
  }));
}

export function findFactKey(fact: ProseFact): string {
  return `${fact.kind}:${fact.value}`;
}

// ─── проза корпусу ─────────────────────────────────────────────────────────────────────────

/// Розмітку розкладаємо, а не зрізаємо: саме `{@condition Blinded|XPHB}` і `{@action Dodge}`
/// роблять англійський бік машинно розміченим, і звідти беруться стани й типи дій.
function readSourceProse(
  spell: SourceSpell,
  where: string
): { text: string; references: MarkupReference[] } {
  const record = spell.raw as Record<string, unknown>;
  const lines = [record.entries, record.entriesHigherLevel].flatMap((field) =>
    collectStringsDeep(field)
  );

  const references: MarkupReference[] = [];
  const parts = lines.map((line) => {
    const decomposed = decomposeMarkup(line, `${where} › проза`);
    references.push(...decomposed.references);
    return decomposed.text;
  });

  return { text: parts.join(" "), references };
}

// ─── числа з одиницями ─────────────────────────────────────────────────────────────────────

const ENGLISH_UNITS: Record<string, string> = {
  foot: "foot",
  feet: "foot",
  mile: "mile",
  miles: "mile",
  inch: "inch",
  inches: "inch",
  pound: "pound",
  pounds: "pound",
  round: "round",
  rounds: "round",
  minute: "minute",
  minutes: "minute",
  hour: "hour",
  hours: "hour",
  day: "day",
  days: "day",
  week: "week",
  weeks: "week",
  year: "year",
  years: "year",
};

const UKRAINIAN_UNITS: [RegExp, string][] = [
  [/^фут/u, "foot"],
  [/^мил/u, "mile"],
  [/^дюйм/u, "inch"],
  [/^фунт/u, "pound"],
  [/^раунд/u, "round"],
  [/^хвилин/u, "minute"],
  [/^годин/u, "hour"],
  [/^дн|^день|^доб/u, "day"],
  [/^тижн|^тиждень/u, "week"],
  [/^рок|^рік|^літ/u, "year"],
];

/// 5etools пише і «150 feet», і «150-foot», і «5-foot-radius» — усе це та сама величина.
function findEnglishMeasures(text: string): ProseFact[] {
  return [...text.matchAll(/(\d+)[-\s]+([A-Za-z]+)/gu)]
    .map((match) => ({ amount: match[1], unit: ENGLISH_UNITS[match[2].toLowerCase()] }))
    .filter((measure): measure is { amount: string; unit: string } => measure.unit !== undefined)
    .map((measure) => ({ kind: "measure" as const, value: `${measure.amount} ${measure.unit}` }));
}

function findUkrainianMeasures(text: string, where: string): ProseFact[] {
  return [...text.matchAll(/(\d+)[-\s]+(\p{L}+)/gu)]
    .map((match) => ({ amount: match[1], unit: findUkrainianUnit(match[2]) }))
    .filter((measure): measure is { amount: string; unit: string } => measure.unit !== null)
    .map((measure) => ({
      kind: "measure" as const,
      value: `${measure.amount} ${assertUnitHasEnglishName(measure.unit, where)}`,
    }));
}

function findUkrainianUnit(word: string): string | null {
  for (const [pattern, unit] of UKRAINIAN_UNITS) {
    if (pattern.test(word)) return unit;
  }
  return null;
}

function assertUnitHasEnglishName(unit: string, where: string): string {
  if (Object.values(ENGLISH_UNITS).includes(unit)) return unit;
  throw new Error(`${where}: одиниця «${unit}» не має відповідника в англійському переліку`);
}

// ─── терміни зі словника ───────────────────────────────────────────────────────────────────

type Term = {
  english: string;
  ukrainian: string;
  patterns: RegExp[];
};

/// Назви бойових дій збігаються зі звичайними словами: «Допомога» проти «за допомогою»,
/// «Сховатися» проти «не може сховатися», «Пошук» проти «для пошуку». Розрізняє їх велика
/// літера — house style пише ратифікований термін правил саме так. Терміни, що вже містять
/// слово «дія» («Магічна дія», «Дія Впливу»), і «Реакція» цього не потребують.
type TermOptions = { requireCapital?: boolean };

/// Форми, яких `dictionary.json` ще не знає, — поіменно й з причиною. Це не поблажка: це
/// перелік, який KR17.4 і KR17.5 мають спорожнити, звівши корпус до словника.
const VARIANT_STEMS: Record<string, { stems: string[][]; reason: string }> = {
  acid: {
    stems: [["кислот"]],
    reason: "корпус пише «кислотою»; словник дає прикметник «Кислотна»",
  },
  bludgeoning: {
    stems: [["дробильн"]],
    reason: "корпус пише «дробильних»; словник — «Дробляча». Зведення — KR17.5",
  },
  piercing: {
    stems: [["колюч"], ["колот"]],
    reason: "корпус пише «колючу» й «колотих»; словник — «Коляча». Зведення — KR17.5",
  },
  slashing: {
    stems: [["рубан"], ["рубальн"]],
    reason: "корпус пише «рубаних» і «рубальних»; словник — «Рубляча». Зведення — KR17.5",
  },
  radiant: {
    stems: [["променист"], ["променев"]],
    reason:
      "власник ратифікував «променева шкода» 2026-08-23, а словник ще тримає «Світлом»; " +
      "зміна словника атомарна із зачисткою каталогів — KR17.5",
  },
  dash: {
    stems: [["ривк"]],
    reason: "«Ривок» → «Ривка»: випадний голосний",
  },
};

/// Англійські терміни XPHB, для яких у словнику ще немає українського. Їхні ознаки не
/// звіряються з жодного боку — інакше кожне з таких заклинань дало б розбіжність, якої
/// перекладач не може закрити, не вигадавши термін. Перелік іде в questions.md.
export const UNRATIFIED_SOURCE_TERMS: Record<string, string> = {
  attack:
    "дія Attack: словник має «Кидок атаки» (rules.attackRoll), але не саму дію — " +
    "питання до власника, docs/o17-spells-canon/questions.md",
};

const CONDITION_TERMS = buildTerms(dictionary.conditions, "conditions");

const ACTION_TERMS = new Map([
  ...buildTerms(dictionary.combatActions, "combatActions", { requireCapital: true }),
  ...buildTerms(
    {
      magic: dictionary.rules2024.coreConceptTerms.magicAction,
      study: dictionary.rules2024.coreConceptTerms.studyAction,
      utilize: dictionary.rules2024.coreConceptTerms.utilizeAction,
      influence: dictionary.rules2024.coreConceptTerms.influenceAction,
      "bonus action": dictionary.rules.bonusAction,
      reaction: dictionary.rules.reaction,
    },
    "rules2024.coreConceptTerms + rules"
  ),
]);

const DAMAGE_TYPE_TERMS = buildTerms(dictionary.damageTypes, "damageTypes");

const ABILITY_TERMS = buildTerms(dictionary.attributes, "attributes");

/// Ключ словника → англійська назва так, як її пише 5etools (`{@action Opportunity Attack}`,
/// `{@condition Blinded}`); обидва боки зводяться через `findReferenceKey`.
function buildTerms(
  source: Record<string, string>,
  where: string,
  { requireCapital = false }: TermOptions = {}
): Map<string, Term> {
  const terms = new Map<string, Term>();

  for (const [key, ukrainian] of Object.entries(source)) {
    if (typeof ukrainian !== "string") continue;

    const english = findEnglishName(key);
    const fromDictionary = findDictionaryStems(ukrainian);
    for (const stems of fromDictionary) {
      assertStemsComeFromDictionary(stems, ukrainian, `${where}.${key}`);
    }

    terms.set(findReferenceKey(english), {
      english,
      ukrainian,
      patterns: [...fromDictionary, ...(VARIANT_STEMS[key]?.stems ?? [])].map((stems) =>
        buildStemPattern(stems, requireCapital)
      ),
    });
  }

  return terms;
}

/// `opportunityAttack` → `Opportunity Attack`, `bonus action` → `Bonus Action`.
function findEnglishName(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .split(/\s+/u)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/// «Засліплений» → `[[засліплен]]`, «Магічна дія» → `[[магічн, ді]]`.
/// «Холодна або Холодом» → `[[холодн], [холодом]]`: словник подає дві рівноправні форми
/// одного терміна, і відкидати другу означало б не побачити «ушкодження холодом».
/// Дужки й усе в них — уточнення для людини («Світлом (шкоди Світлом)»), не форма.
function findDictionaryStems(ukrainian: string): string[][] {
  return normalizeUkrainian(ukrainian)
    .split(/\s*\(/u)[0]
    .split(/\s+або\s+/u)
    .map((form) =>
      form
        .split(/\s+/u)
        .map(findWordStem)
        .filter((stem) => stem !== "")
    )
    .filter((stems) => stems.length > 0);
}

/// Словник подає терміни в називному; корінь — усе до закінчення.
///
/// «‑ість» зрізається цілком: у непрямих відмінках «і» чергується з «о» («Спритність» →
/// «Спритності», «Мудрість» → «Мудрості»), тож корінь «спритніст» не знайшов би жодного
/// ряткидка в корпусі. Це правило мови, а не виняток для двох слів.
function findWordStem(word: string): string {
  const stripped = word.replace(/[^\p{L}']/gu, "");
  if (/ість$/u.test(stripped)) return stripped.replace(/ість$/u, "");
  if (stripped.length > 2 && /(ий|ій|а|я|е|є|ь)$/u.test(stripped)) {
    return stripped.replace(/(ий|ій|а|я|е|є|ь)$/u, "");
  }
  return stripped;
}

function buildStemPattern(stems: string[], requireCapital = false): RegExp {
  const body = stems
    .map((stem, position) =>
      position === 0 && requireCapital ? capitalize(stem) : escapeForRegExp(stem)
    )
    .map((stem) => `${stem}\\p{L}*`)
    .join("\\s+");

  return new RegExp(body, requireCapital ? "u" : "iu");
}

function capitalize(stem: string): string {
  return `${escapeForRegExp(stem[0].toLocaleUpperCase("uk"))}${escapeForRegExp(stem.slice(1))}`;
}

function assertStemsComeFromDictionary(stems: string[], ukrainian: string, where: string): void {
  const words = normalizeUkrainian(ukrainian)
    .split(/[\s(]+/u)
    .map((word) => word.replace(/[^\p{L}']/gu, ""));

  for (const stem of stems) {
    if (words.some((word) => word.startsWith(stem))) continue;
    throw new Error(
      `${where}: корінь «${stem}» не починає жодного слова терміна «${ukrainian}». ` +
        "Корені виводяться зі словника; окрема форма вноситься у VARIANT_STEMS з причиною."
    );
  }
}

function findUkrainianTerms(
  text: string,
  terms: Map<string, Term>,
  kind: ProseFactKind
): ProseFact[] {
  return [...terms.values()]
    .filter((term) => term.patterns.some((pattern) => pattern.test(text)))
    .map((term) => ({ kind, value: term.english }));
}

// ─── стани й типи дій із корпусу ───────────────────────────────────────────────────────────

function findSourceConditions(references: MarkupReference[], where: string): ProseFact[] {
  return references
    .filter((reference) => reference.kind === "condition")
    .map((reference) => ({
      kind: "condition" as const,
      value: findRatifiedTerm(CONDITION_TERMS, reference, "стан", where),
    }))
    .filter((fact) => fact.value !== "");
}

/// Типи дій приходять двома тегами: `{@action Dodge|XPHB}` і `{@variantrule Bonus Action|XPHB}`.
/// Решта `variantrule` (Advantage, Speed, Cover…) — не типи дій і в межі KR17.1 не входить.
const ACTION_VARIANT_RULES: ReadonlySet<string> = new Set(["bonus action", "reaction"]);

/// XPHB розмічає тег лише при першій згадці: `Arms of Hadar` пише «can't take Reactions»
/// звичайним текстом, а `Confusion` — «can't take Bonus Actions or Reactions». Читати самі
/// теги означало б оголосити наш правильний переклад зайвим.
const UNTAGGED_ACTION_TYPES: [RegExp, string][] = [
  [/Bonus Actions?(?![A-Za-z])/u, "Bonus Action"],
  [/Reactions?(?![A-Za-z])/u, "Reaction"],
  [/Magic actions?(?![A-Za-z])/u, "Magic"],
];

function findSourceActions(
  text: string,
  references: MarkupReference[],
  where: string
): ProseFact[] {
  const tagged = references
    .filter(
      (reference) =>
        reference.kind === "action" ||
        (reference.kind === "variantrule" && ACTION_VARIANT_RULES.has(reference.key))
    )
    .map((reference) => ({
      kind: "action" as const,
      value: findRatifiedTerm(ACTION_TERMS, reference, "дію", where),
    }))
    .filter((fact) => fact.value !== "");

  const untagged = UNTAGGED_ACTION_TYPES.filter(([pattern]) => pattern.test(text)).map(
    ([, value]) => ({ kind: "action" as const, value })
  );

  return [...tagged, ...untagged];
}

/// Мовчазне «не знаю такого» — найгірший результат: ознака зникає з обох боків, і звірка
/// каже, що все гаразд. Тому невідомий термін зупиняє розбір, а свідомо неперекладений
/// стоїть у `UNRATIFIED_SOURCE_TERMS` і вимикається одночасно з обох боків.
function findRatifiedTerm(
  terms: Map<string, Term>,
  reference: MarkupReference,
  what: string,
  where: string
): string {
  const term = terms.get(reference.key);
  if (term) return term.english;
  if (reference.key in UNRATIFIED_SOURCE_TERMS) return "";

  throw new Error(
    `${where}: XPHB називає ${what} «${reference.nameEng}», якої немає в dictionary.json. ` +
      "Розбір зупиняється: вигадати термін не можна, його вносять рішенням власника " +
      "(docs/o17-spells-canon/questions.md)."
  );
}

// ─── рятівні кидки ─────────────────────────────────────────────────────────────────────────

function findEnglishSaves(text: string): ProseFact[] {
  const abilities = [...ABILITY_TERMS.values()].map((term) => term.english).join("|");
  const pattern = new RegExp(`(${abilities})\\s+saving\\s+throw`, "giu");

  return [...text.matchAll(pattern)].map((match) => ({
    kind: "save" as const,
    value: findEnglishName(match[1].toLowerCase()),
  }));
}

/// «рятівний кидок Статури», «рятівні кидки Спритності», «ряткидок Мудрості» — характеристика
/// стоїть після назви кидка, тож і читається після неї.
function findUkrainianSaves(text: string): ProseFact[] {
  const facts: ProseFact[] = [];

  for (const match of text.matchAll(/(?:рятівн\p{L}*\s+кид\p{L}*|ряткид\p{L}*)\s+(\p{L}+)/gu)) {
    const term = findTermMatchingWholeWord(ABILITY_TERMS, match[1]);
    if (term) facts.push({ kind: "save", value: term.english });
  }

  return facts;
}

function findTermMatchingWholeWord(terms: Map<string, Term>, word: string): Term | undefined {
  return [...terms.values()].find((term) =>
    term.patterns.some((pattern) => new RegExp(`^${pattern.source}$`, "u").test(word))
  );
}

// ─── типи шкоди ────────────────────────────────────────────────────────────────────────────

/// Тип шкоди читається лише з тих слів, що **впритул** прилягають до слова «шкода» —
/// суцільним рядом типів і сполучників, який уривається на першому сторонньому слові.
///
/// Вікно на кілька десятків символів було б заширокe: у `Friends` XPHB пише «or force
/// anyone to make a saving throw» через два слова від «damage», і «force»-дієслово тихо
/// ставало типом шкоди «Force». Ряд натомість уривається на «anyone».
///
/// Ряд читається в обидва боки, бо обидва трапляються: «некротичних ушкоджень» і
/// «ушкодження вогнем», «Fire damage» і «damage of the chosen type».
const DAMAGE_CONNECTORS = new Set([",", "or", "and", "або", "та", "і", "й", "чи"]);

/// Слова, через які список типів приєднується до слова «шкода»: «damage **type**: Acid,
/// Bludgeoning…», «This damage **is** Acid, Cold…», «тип ушкоджень». Вони не типи й самі по
/// собі нічого не дають — лише не уривають ряду.
const DAMAGE_LINKS = new Set(["is", "type", "types", "тип", "типу", "типи", "типів"]);

/// Ряд сам уривається на першому сторонньому слові, тож межа тут — не точність, а просто
/// стеля роботи. `Resistance` перелічує одинадцять типів поспіль, і шістьох було замало.
const DAMAGE_RUN_LIMIT = 40;

/// Англійський бік розрізняє тип шкоди й однокорінне слово **великою літерою**: правила 2024
/// пишуть «Force damage», а `Friends` — «or force anyone to make a saving throw». Тому тут
/// не корінь, а точна назва з великої, і тільки поблизу слова «damage» — бо список типів
/// стоїть і перед ним («Necrotic damage»), і після нього («damage type: Acid, Bludgeoning…»).
function findEnglishDamageTypes(text: string): ProseFact[] {
  return findDamageTypesAroundWord(text, /damage/giu, isEnglishTypeWord, (run) =>
    run.filter(isEnglishTypeWord)
  );
}

function isEnglishTypeWord(token: string): boolean {
  return [...DAMAGE_TYPE_TERMS.values()].some((term) => term.english === token);
}

/// Український бік не має великої літери як ознаки — типи відмінюються («некротичних»,
/// «вогнем»), — тож ознакою лишається суцільний ряд: слова типів і сполучники впритул до
/// «шкоди», що уривається на першому сторонньому слові. Ряд читається в обидва боки, бо
/// поширені й «некротичних ушкоджень», і «ушкодження вогнем».
///
/// Ряд, а не потокенна перевірка, ще й тому, що «силовим полем» — термін із двох слів.
function findUkrainianDamageTypes(text: string): ProseFact[] {
  return findDamageTypesAroundWord(text, /ушкодж\p{L}*|шкод\p{L}*/gu, isUkrainianTypeWord, (run) =>
    readWholeTerms(run.join(" "))
  );
}

function isUkrainianTypeWord(token: string): boolean {
  return [...DAMAGE_TYPE_TERMS.values()].some((term) =>
    term.patterns.some((pattern) =>
      pattern.source.split("\\s+").some((stem) => new RegExp(`^${stem}$`, pattern.flags).test(token))
    )
  );
}

/// Багатослівний термін («силовим полем») потокенно не впізнати, тож зібраний ряд звіряється
/// цілими термінами, а не по одному слову.
function readWholeTerms(run: string): string[] {
  return [...DAMAGE_TYPE_TERMS.values()]
    .filter((term) => term.patterns.some((pattern) => pattern.test(run)))
    .map((term) => term.english);
}

function findDamageTypesAroundWord(
  text: string,
  damageWord: RegExp,
  isTypeWord: (token: string) => boolean,
  readTypes: (run: string[]) => string[]
): ProseFact[] {
  const facts: ProseFact[] = [];

  for (const match of text.matchAll(damageWord)) {
    const before = tokenize(text.slice(0, match.index)).slice(-DAMAGE_RUN_LIMIT);
    const after = tokenize(text.slice(match.index + match[0].length)).slice(0, DAMAGE_RUN_LIMIT);

    /// Ряд назад набирається з кінця, тож перед звіркою цілими термінами його вертають у
    /// природний порядок — інакше «силовим полем» лишилося б «полем силовим».
    const runs = [
      readTypeRun([...before].reverse(), isTypeWord).reverse(),
      readTypeRun(after, isTypeWord),
    ];
    for (const run of runs) {
      facts.push(...readTypes(run).map((value) => ({ kind: "damageType" as const, value })));
    }
  }

  return facts;
}

/// Ряд уривається на першому слові, що не є ні типом шкоди, ні сполучником, ні сполучкою.
function readTypeRun(tokens: string[], isTypeWord: (token: string) => boolean): string[] {
  const run: string[] = [];

  for (const token of tokens) {
    const lowered = token.toLowerCase();
    if (!DAMAGE_CONNECTORS.has(lowered) && !DAMAGE_LINKS.has(lowered) && !isTypeWord(token)) break;
    run.push(token);
  }

  return run;
}

function tokenize(text: string): string[] {
  return text
    .replace(/,/gu, " , ")
    .split(/[\s—–-]+/u)
    .map((token) => token.replace(/^[^\p{L},]+|[^\p{L},]+$/gu, ""))
    .filter((token) => token !== "");
}

// ─── дрібниці ──────────────────────────────────────────────────────────────────────────────

/// Апостроф у корпусі трьох накреслень («Окам'янілий» проти «Окам’янілий»), і без зведення
/// стан просто не знаходився б.
function normalizeApostrophes(text: string): string {
  return text.replace(/[‘’ʼ`]/gu, "'");
}

function normalizeUkrainian(text: string): string {
  return normalizeApostrophes(text).toLocaleLowerCase("uk");
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function sortFacts<T extends ProseFact>(facts: T[]): T[] {
  return [...new Map(facts.map((fact) => [findFactKey(fact), fact])).values()].sort((a, b) =>
    findFactKey(a).localeCompare(findFactKey(b))
  );
}
