const SEED_NAMES = [
  "Вогнеслав",
  "Зоряна",
  "Громовиця",
  "Лісодух",
  "Камнелом",
  "Буревій",
  "Олдрік",
  "Терон",
  "Лісандра",
  "Елара",
  "Кейл",
  "Міра",
  "Серафіна",
  "Вален",
  "Ізольда",
  "Аеліндор",
  "Фаелар",
  "Сільваніс",
  "Тандоріель",
  "Лутієн",
  "Торін",
  "Балін",
  "Двалін",
  "Гімлі",
  "Дурін",
  "Ґроґ",
  "Круск",
  "Рогар",
  "Акмен",
  "Інферно",
  "Надія",
  "Відчай",
  "Сутінь",
  "Промінь",
  "Хмара",
] as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function capFirst(value: string) {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function squeeze(value: string) {
  // Light de-dup for accidental double separators.
  return value
    .replace(/--+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

const UA_TRAD = [
  "Ярослав",
  "Святослав",
  "Богдан",
  "Володимир",
  "Ростислав",
  "Людмила",
  "Оксана",
  "Соломія",
  "Марія",
  "Злата",
  "Мирослав",
  "Мирослава",
  "Станіслав",
  "Вікторія",
  "Данило",
  "Іван",
  "Тарас",
  "Леся",
  "Назар",
  "Калина",
] as const;

const UA_ROOTS = [
  "вогн",
  "зор",
  "грім",
  "ліс",
  "вод",
  "кам",
  "світ",
  "темн",
  "бур",
  "вітр",
  "місяц",
  "сонц",
  "криж",
  "попіл",
  "зіл",
  "тін",
  "град",
  "клин",
  "крил",
  "душ",
] as const;

const UA_PREFIX = [
  "Вогне",
  "Зоре",
  "Громо",
  "Лісо",
  "Водо",
  "Камне",
  "Світло",
  "Темно",
  "Буре",
  "Вітро",
  "Місяце",
  "Сонце",
  "Криго",
  "Попело",
  "Тіне",
] as const;

const UA_SUFFIX = [
  "слав",
  "слава",
  "вик",
  "вій",
  "бій",
  "бор",
  "риц(я)",
  "дух",
  "пад",
  "мор",
  "крила",
  "ликий",
  "хід",
  "мудр",
] as const;

const UA_SUFFIX_CLEAN = [
  "слав",
  "слава",
  "вик",
  "вій",
  "бій",
  "бор",
  "риця",
  "дух",
  "пад",
  "мор",
  "крила",
  "ликий",
  "хід",
  "мудр",
] as const;

const ELF_PRE = [
  "Ае",
  "Ела",
  "Ілі",
  "Лу",
  "Сі",
  "Та",
  "Ке",
  "Фае",
  "Мі",
  "Гала",
  "Ні",
  "Ері",
] as const;

const ELF_MID = [
  "лін",
  "ріо",
  "ндор",
  "віа",
  "фел",
  "сіль",
  "тір",
  "мар",
  "дор",
  "ніель",
  "ран",
  "лен",
] as const;

const ELF_SUF = [
  "іель",
  "ор",
  "он",
  "іс",
  "ель",
  "ан",
  "іна",
  "іон",
  "ає",
  "ер",
] as const;

const DWARF_PRE = [
  "Тор",
  "Бал",
  "Двал",
  "Дур",
  "Гім",
  "Брун",
  "Хіль",
  "Рун",
  "Крем",
  "Гран",
  "Вуг",
  "Заліз",
] as const;

const DWARF_SUF = [
  "ін",
  "ар",
  "ур",
  "ім",
  "ек",
  "дор",
  "бород",
  "молот",
  "коп",
  "кам",
] as const;

const ORC_PRE = [
  "Ґро",
  "Кру",
  "Ток",
  "Ро",
  "Шар",
  "Гру",
  "Дро",
  "Зур",
  "Храг",
  "Бру",
] as const;

const ORC_SUF = [
  "ґ",
  "ск",
  "к",
  "р",
  "ш",
  "г",
  "т",
  "м",
  "шк",
] as const;

const TIEF_WORDS = [
  "Надія",
  "Відчай",
  "Страх",
  "Ідеал",
  "Покора",
  "Воля",
  "Гордість",
  "Помста",
  "Слава",
  "Таїна",
] as const;

const TIEF_PRE = [
  "Ак",
  "Зе",
  "Мор",
  "Інф",
  "Дем",
  "Пек",
  "Сар",
  "Ве",
  "Кал",
] as const;

const TIEF_SUF = [
  "мен",
  "ріан",
  "фір",
  "зіс",
  "тор",
  "на",
  "іс",
  "іон",
] as const;

const GNOME_PRE = [
  "Ол",
  "Бод",
  "Дім",
  "Брок",
  "Тін",
  "Флік",
  "Блим",
  "Цікав",
  "Штуч",
] as const;

const GNOME_SUF = [
  "стон",
  "дінок",
  "бл",
  "лер",
  "ік",
  "ко",
  "авка",
  "чик",
] as const;

const HALFLING_PRE = [
  "Лай",
  "Мер",
  "Кал",
  "Ко",
  "Джі",
  "Лін",
  "Ос",
] as const;

const HALFLING_SUF = [
  "л",
  "рік",
  "лі",
  "ра",
  "іан",
  "ет",
  "ік",
] as const;

const EXOTIC_PRE = [
  "Ґітх",
  "Крук",
  "Лап",
  "Крил",
  "Таба",
  "Кен",
  "Аара",
  "Сах",
] as const;

const EXOTIC_SUF = [
  "-Вар",
  "ар",
  "астик",
  "ань",
  "ік",
  "ра",
  "ок",
] as const;

function buildUkrFantasy(rng: () => number) {
  const prefix = pick(rng, UA_PREFIX);
  const suffix = pick(rng, UA_SUFFIX_CLEAN);

  // Two simple patterns for variety.
  if (rng() < 0.5) {
    return squeeze(`${prefix}${capFirst(suffix)}`);
  }
  const root = pick(rng, UA_ROOTS);
  return squeeze(`${prefix}${capFirst(root)}${capFirst(suffix)}`);
}

function buildElf(rng: () => number) {
  const pre = pick(rng, ELF_PRE);
  const mid = pick(rng, ELF_MID);
  const suf = pick(rng, ELF_SUF);
  return squeeze(`${pre}${mid}${suf}`);
}

function buildDwarf(rng: () => number) {
  const pre = pick(rng, DWARF_PRE);
  const suf = pick(rng, DWARF_SUF);
  const maybeTitle = rng() < 0.15 ? `-${pick(rng, ["Камнесік", "Залізобород", "Рудокоп", "Молотобій"] as const)}` : "";
  return squeeze(`${pre}${suf}${maybeTitle}`);
}

function buildOrc(rng: () => number) {
  const pre = pick(rng, ORC_PRE);
  const suf = pick(rng, ORC_SUF);
  return squeeze(`${pre}${suf}`);
}

function buildTiefling(rng: () => number) {
  if (rng() < 0.35) return pick(rng, TIEF_WORDS);
  const pre = pick(rng, TIEF_PRE);
  const suf = pick(rng, TIEF_SUF);
  return squeeze(`${pre}${suf}`);
}

function buildGnome(rng: () => number) {
  const pre = pick(rng, GNOME_PRE);
  const suf = pick(rng, GNOME_SUF);
  return squeeze(`${pre}${suf}`);
}

function buildHalfling(rng: () => number) {
  const pre = pick(rng, HALFLING_PRE);
  const suf = pick(rng, HALFLING_SUF);
  const cozy = rng() < 0.2 ? pick(rng, ["Смачненко", "Веселко", "Затишко", "Добряк", "Пиріжко"] as const) : "";
  return cozy ? cozy : squeeze(`${pre}${suf}`);
}

function buildExotic(rng: () => number) {
  const pre = pick(rng, EXOTIC_PRE);
  const suf = pick(rng, EXOTIC_SUF);
  return squeeze(`${pre}${suf}`);
}

function buildHuman(rng: () => number) {
  if (rng() < 0.35) return pick(rng, UA_TRAD);
  // Adapted classic fantasy-ish.
  const pre = pick(rng, ["Ал", "Ол", "Тер", "Ліс", "Ел", "Ка", "До", "Сер", "Вал", "Із"] as const);
  const mid = pick(rng, ["др", "ан", "ел", "ор", "іа", "ен", "ар", "іс", "ла", "он"] as const);
  const suf = pick(rng, ["ік", "ан", "ор", "а", "ія", "ель", "іна", "он", "ар"] as const);
  return squeeze(`${pre}${mid}${suf}`);
}

function generateFantasyNames(targetCount: number) {
  const rng = mulberry32(0xC0FFEE);
  const out = new Set<string>(SEED_NAMES);

  const builders = [
    buildHuman,
    buildElf,
    buildDwarf,
    buildOrc,
    buildTiefling,
    buildGnome,
    buildHalfling,
    buildExotic,
    buildUkrFantasy,
  ] as const;

  // Ensure at least some purely-UA compound names.
  for (let i = 0; i < 200 && out.size < targetCount; i++) {
    out.add(buildUkrFantasy(rng));
  }

  while (out.size < targetCount) {
    const builder = pick(rng, builders);
    const name = builder(rng);

    // Filter super short / weird cases.
    if (name.length < 3) continue;
    if (name.length > 24) continue;

    out.add(name);
  }

  return Array.from(out);
}

export const FANTASY_NAMES = generateFantasyNames(3000) as readonly string[];
