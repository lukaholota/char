/// Наш запис заклинання українською і запис 5etools зводяться тут до однакового набору
/// фактів, і вже їх порівнює KR16.2. Розбирачі **падають на нерозпізнаному значенні**:
/// мовчазне «не збіглося» на невідомому формулюванні — це фальшива розбіжність, а вона
/// коштує дорожче за пропущену.

import { spellSchoolTranslations } from "../../src/lib/refs/translation";

export type SpellSchoolCode = "A" | "C" | "D" | "E" | "V" | "I" | "N" | "T";

export type SpellFacts = {
  level: number;
  school: SpellSchoolCode;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  classes: string[];
  dice: string[];
};

export type FactMismatch = {
  field: keyof SpellFacts;
  ours: string;
  theirs: string;
};

/// Назви шкіл беремо з `spellSchoolTranslations` — після рішення власника 2026-08-23 словник
/// і дані називають школи однаково, тож другого переліку тут бути не повинно.
const SCHOOL_CODES_BY_ENUM: Record<string, SpellSchoolCode> = {
  ABJURATION: "A",
  CONJURATION: "C",
  DIVINATION: "D",
  ENCHANTMENT: "E",
  EVOCATION: "V",
  ILLUSION: "I",
  NECROMANCY: "N",
  TRANSMUTATION: "T",
};

export const RATIFIED_SCHOOL_WORDS = Object.fromEntries(
  Object.entries(SCHOOL_CODES_BY_ENUM).map(([enumName, code]) => [
    code,
    spellSchoolTranslations[enumName],
  ])
) as Record<SpellSchoolCode, string>;

const SCHOOLS_BY_UKRAINIAN: Record<string, SpellSchoolCode> = Object.fromEntries(
  Object.entries(RATIFIED_SCHOOL_WORDS).map(([code, word]) => [word, code as SpellSchoolCode])
);

const CLASSES_BY_UKRAINIAN: Record<string, string> = {
  Винахідник: "Artificer",
  Варвар: "Barbarian",
  Бард: "Bard",
  Клірик: "Cleric",
  Друїд: "Druid",
  Воїн: "Fighter",
  Монах: "Monk",
  Паладин: "Paladin",
  Слідопит: "Ranger",
  Пройдисвіт: "Rogue",
  Чародій: "Sorcerer",
  Чорнокнижник: "Warlock",
  Чарівник: "Wizard",
};

const TIME_UNITS_BY_UKRAINIAN: [RegExp, string][] = [
  [/^бонусн\S*\s+ді\S*/u, "bonus"],
  [/^реакц\S*/u, "reaction"],
  [/^ді\S*/u, "action"],
  [/^хвилин\S*/u, "minute"],
  [/^годин\S*/u, "hour"],
  [/^дн\S*|^день/u, "day"],
  [/^раунд\S*/u, "round"],
];

/// Порядок значущий: форма 2024 «Випромінювання радіусом 10 футів» містить і «радіус», тож
/// випромінювання мусить впізнаватися першим, інакше воно тихо читається як `radius`.
const AREA_SHAPES_BY_UKRAINIAN: [RegExp, string][] = [
  [/випромінюванн/u, "emanation"],
  [/конус/u, "cone"],
  [/лінія|лінії|лінію/u, "line"],
  [/куб/u, "cube"],
  [/напівсфер/u, "hemisphere"],
  [/сфер/u, "sphere"],
  [/радіус/u, "radius"],
];

const UKRAINIAN_BY_CLASS: Record<string, string> = Object.fromEntries(
  Object.entries(CLASSES_BY_UKRAINIAN).map(([ukrainian, english]) => [english, ukrainian])
);

export function isBaseClass(ukrainianName: string): boolean {
  return ukrainianName in CLASSES_BY_UKRAINIAN;
}

export function findUkrainianClassName(englishName: string): string | null {
  return UKRAINIAN_BY_CLASS[englishName] ?? null;
}

export function readSchoolFromUkrainian(school: string, where: string): SpellSchoolCode {
  const code = SCHOOLS_BY_UKRAINIAN[school.trim()];
  if (code) return code;
  throw new Error(`${where}: невідома школа «${school}»`);
}

export function readClassFromUkrainian(className: string): string | null {
  return CLASSES_BY_UKRAINIAN[className.trim()] ?? null;
}

/// Умову реакції («1 реакція, яку ви здійснюєте, коли…») відкидаємо: структурно це не поле,
/// а проза, і саме в ній сидить «або», через яке розбір розсипався б на 11 заклинаннях.
export function readCastingTimeFromUkrainian(raw: string, where: string): string {
  return raw
    .split(",")[0]
    .split(/\s+або\s+/u)
    .map((option) => readSingleCastingTime(option, where))
    .filter((option) => option !== "")
    .join(" or ");
}

function readSingleCastingTime(option: string, where: string): string {
  const trimmed = option.trim();
  if (/^ритуал/iu.test(trimmed)) return "";

  const match = /^(\d+)\s+(.+)$/u.exec(trimmed);
  if (!match) throw new Error(`${where}: не розібрано час створення «${option}»`);

  const [, amount, rest] = match;
  const unit = findTimeUnit(rest.trim());
  if (!unit) throw new Error(`${where}: невідома одиниця часу в «${option}»`);

  return `${amount} ${unit}`;
}

function findTimeUnit(word: string): string | null {
  const lowered = word.toLocaleLowerCase("uk");
  for (const [pattern, unit] of TIME_UNITS_BY_UKRAINIAN) {
    if (pattern.test(lowered)) return unit;
  }
  return null;
}

export function readRangeFromUkrainian(raw: string, where: string): string {
  const trimmed = raw.trim();

  if (/^дотик/iu.test(trimmed)) return "touch";
  if (/^особлив/iu.test(trimmed)) return "special";
  if (/^(необмежена|без обмежень)/iu.test(trimmed)) return "unlimited";
  if (/(видимост|видимість|поле зору)/iu.test(trimmed)) return "sight";

  if (/^на себе/iu.test(trimmed)) return readSelfRange(trimmed, where);

  const distance = readDistance(trimmed);
  if (distance) return distance;

  throw new Error(`${where}: не розібрано дальність «${raw}»`);
}

function readSelfRange(raw: string, where: string): string {
  const inside = /\(([^)]*)\)/u.exec(raw);
  if (!inside) return "self";

  const body = inside[1];
  const shape = findAreaShape(body);
  const amount = /(\d+)/u.exec(body);
  if (!shape || !amount) throw new Error(`${where}: не розібрано область «${raw}»`);

  const unit = /мил/iu.test(body) ? "mile" : "foot";
  return `self (${amount[1]}-${unit} ${shape})`;
}

function findAreaShape(body: string): string | null {
  const lowered = body.toLocaleLowerCase("uk");
  for (const [pattern, shape] of AREA_SHAPES_BY_UKRAINIAN) {
    if (pattern.test(lowered)) return shape;
  }
  return null;
}

function readDistance(raw: string): string | null {
  const match = /^(\d+)\s+(фут\S*|мил\S*)$/u.exec(raw);
  if (!match) return null;
  return `${match[1]} ${/^фут/u.test(match[2]) ? "feet" : "miles"}`;
}

export function readComponentsFromUkrainian(raw: string): string {
  const head = raw.split("(")[0];
  const letters = new Set(
    head
      .split(",")
      .map((piece) => piece.trim().toLocaleUpperCase("uk"))
      .filter((piece) => piece !== "")
  );

  return [letters.has("В") && "V", letters.has("С") && "S", letters.has("М") && "M"]
    .filter((letter): letter is string => letter !== false)
    .join("");
}

export function readDurationFromUkrainian(raw: string, where: string): string {
  const trimmed = raw.trim().replace(/\.$/u, "");

  if (/^миттєв/iu.test(trimmed)) return "instant";
  if (/^особлив/iu.test(trimmed)) return "special";
  if (/(розвію|розвіют|розсієт|розсіют)/iu.test(trimmed)) {
    return /спрацюван/iu.test(trimmed) ? "until dispelled or triggered" : "until dispelled";
  }

  const concentration = /^концентрац/iu.test(trimmed);
  const timed = /(\d+)\s+(\S+)/u.exec(trimmed);
  if (!timed) throw new Error(`${where}: не розібрано тривалість «${raw}»`);

  const unit = findTimeUnit(timed[2]);
  if (!unit) throw new Error(`${where}: невідома одиниця тривалості в «${raw}»`);

  return `${concentration ? "concentration, up to " : ""}${timed[1]} ${unit}`;
}

/// «к» мусить стояти впритул до числа: у корпусі немає жодного «1 к 8», зате є «більш **як**
/// 10 фунтів» — на пробілі розбір давав фальшивий `1d10` і хибну розбіжність.
/// Голе «к8» («перетворюється на к8») — законна форма, тому число перед «к» необов'язкове.
export function collectUkrainianDice(description: string): string[] {
  return sortDice(
    [...description.matchAll(/(?:^|[^\p{L}\d])(\d*)к(\d+)/gu)].map(
      (match) => `${match[1] === "" ? "1" : match[1]}d${match[2]}`
    )
  );
}

export function collectEnglishDice(text: string): string[] {
  return sortDice(
    [...text.matchAll(/(\d*)d(\d+)/gu)].map(
      (match) => `${match[1] === "" ? "1" : match[1]}d${match[2]}`
    )
  );
}

/// d20 — кубик перевірки, а не шкоди: жодне заклинання не завдає «1к20». У 5etools він
/// приходить із таблиць статблоків (`{@dice 1d20 - 3|4}` у `Animate Objects`) і з прози
/// `Bigby's Hand`, тобто завжди з боку джерела — і дає розбіжність на порожньому місці.
function sortDice(dice: string[]): string[] {
  return [...new Set(dice)].filter((die) => !die.endsWith("d20")).sort();
}

/// `compareClasses: false` — коли джерело взагалі не подає списку класів для цього
/// заклинання (частина книг у `spells/sources.json` його не має). Порівнювати з порожнім
/// переліком означало б вигадати розбіжність там, де просто немає даних.
export function compareSpellFacts(
  ours: SpellFacts,
  theirs: SpellFacts,
  { compareClasses }: { compareClasses: boolean } = { compareClasses: true }
): FactMismatch[] {
  const mismatches: FactMismatch[] = [];

  const note = (field: keyof SpellFacts, a: string, b: string) => {
    if (a !== b) mismatches.push({ field, ours: a, theirs: b });
  };

  note("level", String(ours.level), String(theirs.level));
  note("school", ours.school, theirs.school);
  note("castingTime", ours.castingTime, theirs.castingTime);
  note("range", ours.range, theirs.range);
  note("components", ours.components, theirs.components);
  note("duration", ours.duration, theirs.duration);
  note("concentration", String(ours.concentration), String(theirs.concentration));
  note("ritual", String(ours.ritual), String(theirs.ritual));
  if (compareClasses) note("classes", ours.classes.join(", "), theirs.classes.join(", "));
  note("dice", ours.dice.join(" "), theirs.dice.join(" "));

  return mismatches;
}
