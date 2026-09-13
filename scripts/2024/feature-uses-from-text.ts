/**
 * KR31.3 — форми книги, за якими з тексту фічі 2024 читаються число використань, відпочинок,
 * що їх повертає, і тип дії.
 *
 * Модуль спільний для всіх чотирьох носіїв — класів (`class-feature-uses.ts`), підкласів
 * (`subclass-feature-uses.ts`), видів (`species-trait-uses.ts`) і рис персонажа (`feat-uses.ts`):
 * формулювання в їхніх корпусах ті самі, і другий набір регексів розійшовся б із першим мовчки.
 * Диска модуль не торкається.
 */

export type RestTypeName = "SHORT_REST" | "LONG_REST";

export type UsesByLevel = { lvl: number; uses: number };

export type UsesFormula = {
  type: "FORMULA";
  group: "STAT_BASED" | "LEVEL_BASED";
  operation: "ADD" | "MULTIPLY";
  base?: number;
  stat?: string;
  multiplier?: number;
  minimum?: number;
};

export type FeatureUses2024 = {
  limitedUsesPer: RestTypeName;
  usesCount?: number;
  usesCountSpecial?: UsesByLevel[] | UsesFormula;
  usesCountDependsOnProficiencyBonus?: true;
  usesPoolKey?: string;
};

export type UsesCounts = Pick<
  FeatureUses2024,
  "usesCount" | "usesCountSpecial" | "usesCountDependsOnProficiencyBonus"
>;

/// Таблиця повторює число щорівня; у базі потрібні лише рівні, на яких воно змінюється.
export function compressUsesByLevel(byLevel: UsesByLevel[]): UsesByLevel[] {
  return byLevel.filter((entry, index) => index === 0 || entry.uses !== byLevel[index - 1].uses);
}

/// Числівники книги. Той самий перелік читають і форми зростання за рівнем, і кубикові пули.
export const COUNT_WORDS: Record<string, number> = {
  once: 1,
  twice: 2,
  "three times": 3,
  "four times": 4,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export type DisplayTypeName = "ACTION" | "BONUSACTION" | "REACTION" | "PASSIVE" | "CLASS_RESOURCE";

/**
 * Апостроф у корпусах різний, а форми книги написані з ASCII-апострофом: `data/2024/srd/*.md`
 * несе `can't`, вікі-сторінки підкласів — `can’t` (149 фіч із 400). Без зведення форма
 * «більше не можна до відпочинку» мовчки не збігається, і фіча лишається без лічильника —
 * саме так перший прохід недорахував 32 підкласові фічі. Зводиться тільки те, з чим
 * порівнюють; текст, що їде у файл і базу, лишається таким, як у джерелі.
 */
function normalizeApostrophes(body: string): string {
  return body.replace(/[’ʼ‘]/g, "'");
}

/// Порядок — від найвужчої форми до найширшої: перша, що збіглася, і дає число.
export function findUsesInText(featureName: string, level: number, rawBody: string): UsesCounts | null {
  const body = normalizeApostrophes(rawBody);
  return (
    findUsesFromAbilityModifier(featureName, body) ??
    findUsesFromNamedPointPool(body) ??
    findUsesFromProficiencyBonus(body) ??
    findUsesFromHealingPool(body) ??
    findUsesGrowingByLevelSentence(featureName, level, body) ??
    findFlatUses(body)
  );
}

const ABILITY_BY_NAME: Record<string, string> = {
  Strength: "str",
  Dexterity: "dex",
  Constitution: "con",
  Intelligence: "int",
  Wisdom: "wis",
  Charisma: "cha",
};

/**
 * «a number of times equal to your Charisma modifier (minimum of once)» — Натхнення барда,
 * Невтомність і Покров природи слідопита, Місячний крок друїда.
 *
 * Дві необовʼязкові частини, обидві з книги: слово «total» («a total number of times equal to
 * your Wisdom modifier» — Шквал зцілення й шкоди) і сама обмовка «(minimum of once)». Мінімум
 * ставиться **лише** там, де книга його написала: без обмовки відʼємний модифікатор справді
 * не дає жодного використання, і дописати одиницю означало б вигадати правило.
 */
function findUsesFromAbilityModifier(featureName: string, body: string): UsesCounts | null {
  const match = /a (?:total )?number of times equal to your (\w+) modifier( \(minimum of once\))?/.exec(body);
  if (!match) return null;

  const stat = ABILITY_BY_NAME[match[1]];
  if (!stat) throw new Error(`${featureName}: невідома характеристика «${match[1]}».`);

  return {
    usesCountSpecial: {
      type: "FORMULA",
      group: "STAT_BASED",
      operation: "ADD",
      base: 0,
      stat,
      ...(match[2] ? { minimum: 1 } : {}),
    },
  };
}

/**
 * Іменований запас очок на бонус майстерності: «You have a number of Luck Points equal to your
 * Proficiency Bonus… You regain your expended Luck Points when you finish a Long Rest»
 * (Щасливчик).
 *
 * Ім'я запасу мусить стояти в **обох** реченнях — і там, де книга його оголошує, і там, де
 * повертає. Без цієї пари форма зловила б усе, що книга рахує бонусом майстерності й запасом не
 * є: страви кухаря, дози отрути отруйника, ритуальні заклинання Ритуаліста.
 *
 * Ціни застосування форма не читає: у книзі кожна перевага Щасливчика коштує рівно «1 Luck
 * Point». Запас, який витрачають більшими порціями (Sorcery Points, Focus Points), лишається
 * поза проходом, доки немає `use_price` — так само, як у класовому й підкласовому.
 */
function findUsesFromNamedPointPool(body: string): UsesCounts | null {
  const declared = /You have a number of ([A-Z][\w' ]*?) equal to your Proficiency Bonus/.exec(body);
  if (!declared) return null;

  const regained = new RegExp(String.raw`regain your expended ${declared[1]} when you finish a`);
  return regained.test(body) ? { usesCountDependsOnProficiencyBonus: true } : null;
}

/**
 * «a number of times equal to your Proficiency Bonus» — Подих дракононародженого, Камʼяне чуття
 * дворфа, Велетенське походження голіафа, Адреналіновий ривок орка, Лісовий гном.
 *
 * Іде окремою колонкою `uses_count_depends_on_proficiency_bonus`, а не формулою в
 * `usesCountSpecial`: так уже записані 44 фічі 2014, і саме цю колонку читає
 * `calculateMaxUsesForFeature`. Формула `group: "PROFICIENCY_BONUS"` лишається для кратних БМ
 * («twice your Proficiency Bonus»), яких у видах і рисах немає.
 *
 * Слово «times» тут обовʼязкове. Книга тим самим зворотом рахує геть інші речі — «roll a number
 * of d4s equal to your Proficiency Bonus» (Цілющі руки) і «you gain a number of Temporary Hit
 * Points equal to your Proficiency Bonus» (Адреналіновий ривок), — і без нього Цілющі руки
 * дістали б БМ використань замість одного.
 */
function findUsesFromProficiencyBonus(body: string): UsesCounts | null {
  return /a number of times equal to your Proficiency Bonus/.test(body)
    ? { usesCountDependsOnProficiencyBonus: true }
    : null;
}

/// «a total number of Hit Points equal to five times your Paladin level» — Накладання рук.
function findUsesFromHealingPool(body: string): UsesCounts | null {
  const match = /a total number of Hit Points equal to five times your \w+ level/.exec(body);
  if (!match) return null;

  return {
    usesCountSpecial: { type: "FORMULA", group: "LEVEL_BASED", operation: "MULTIPLY", multiplier: 5 },
  };
}

/**
 * Книга дописує наступні використання прозою, а не колонкою: «Starting at level 17, you can use
 * it twice» (Сплеск дій) і «twice before a Long Rest starting at level 13 and three times …
 * level 17» (Незламність). Обидві форми загальні — третя фіча з таким формулюванням підхопиться
 * сама.
 */
const LEVEL_SENTENCE_SHAPES: RegExp[] = [
  /Starting at level (\d+), you can use it (once|twice|three times|four times)/gi,
  /you can use this feature (once|twice|three times|four times) before a Long Rest starting at level (\d+)/gi,
  /and (once|twice|three times|four times) before a Long Rest starting at level (\d+)/gi,
];

function findUsesGrowingByLevelSentence(featureName: string, level: number, body: string): UsesCounts | null {
  const byLevel: UsesByLevel[] = [];

  for (const shape of LEVEL_SENTENCE_SHAPES) {
    // Реєстр форм спільний, а `lastIndex` у /g-регекса — свій на обʼєкт і переживає виклик:
    // друга фіча починала б пошук там, де скінчила перша, і мовчки губила рівень.
    for (const match of body.matchAll(new RegExp(shape.source, shape.flags))) {
      const [levelText, countWord] = /^\d+$/.test(match[1]) ? [match[1], match[2]] : [match[2], match[1]];
      const uses = COUNT_WORDS[countWord.toLowerCase()];
      if (uses === undefined) throw new Error(`${featureName}: невідома кількість «${countWord}».`);
      byLevel.push({ lvl: Number(levelText), uses });
    }
  }

  if (!byLevel.length) return null;
  if (!findOncePerRestPhrase(body)) {
    throw new Error(`${featureName}: рівні зростання є, а базового «раз на відпочинок» — ні.`);
  }

  byLevel.push({ lvl: level, uses: 1 });
  return { usesCountSpecial: byLevel.sort((left, right) => left.lvl - right.lvl) };
}

const FLAT_TWICE = /You can use (?:this feature|this class's Channel Divinity|it|Wild Shape) twice/;

function findFlatUses(body: string): UsesCounts | null {
  if (FLAT_TWICE.test(body)) return { usesCount: 2 };
  if (findOncePerRestPhrase(body)) return { usesCount: 1 };
  return null;
}

/**
 * Формулювання «більше не можна до відпочинку». Форм пʼять, усі — з книги дослівно; шосту
 * зловить гейт, бо фіча просто лишиться без лічильника й зникне з очікуваного набору.
 */
const ONCE_PER_REST_SHAPES: RegExp[] = [
  /can't use (?:this feature|it|this benefit) again until you finish a (Short or Long|Short|Long) Rest/,
  /can't do so(?: in this way)? again until you finish a (Short or Long|Short|Long) Rest/,
  /can't cast (?:it|them|that spell) in this way again until you finish a (Short or Long|Short|Long) Rest/,
  /must finish a (Long) Rest before you can cast it in this way again/,
  /you regain the ability to do so when you finish a (Long) Rest/,
  // Безкоштовне застосування заклинання родоводу: ельф, тифлінг, «Посвячений у магію» ([Р38]).
  /you regain the ability to cast it in that way when you finish a (Short or Long|Short|Long) Rest/,
  // «Дар долі»: ініціатива повертає використання нарівні з відпочинком, тобто не рідше за нього.
  /can't use it again until you roll Initiative or finish a (Short or Long|Short|Long) Rest/,
];

function findOncePerRestPhrase(body: string): boolean {
  return ONCE_PER_REST_SHAPES.some((shape) => shape.test(body));
}

/**
 * Який відпочинок повертає **використання цієї фічі**. Питання не таке просте, як «чи згадано
 * короткий відпочинок»: Невтомність слідопита знімає коротким відпочинком Виснаження, а власні
 * використання повертає довгим, а Відновлення чаклунства **дає** очки на короткому, лишаючись
 * раз на довгий. Тому кожна форма привʼязана до речення саме про використання, і порядок у
 * переліку — це порядок сили: «повертаю одне на короткому» сильніше за «повертаю все на довгому»,
 * бо в носіїв правила 2024 стоять обидва речення.
 */
const RECOVERY_SHAPES: RegExp[] = [
  /regain one (?:of (?:its|your) )?expended (?:uses?|[\w' ]*?Dice) when you finish a (Short or Long|Short|Long) Rest/,
  ...ONCE_PER_REST_SHAPES,
  /regain all (?:your )?expended [\w' ]*?(?:uses|points|Points|Dice)[\w' ]*? when you finish a (Short or Long|Short|Long) Rest/,
  // Іменований запас очок — пара до `findUsesFromNamedPointPool`; без `all`, бо книга там пише
  // «You regain your expended Luck Points when you finish a Long Rest».
  /regain your expended [A-Z][\w' ]*? when you finish a (Short or Long|Short|Long) Rest/,
  /unavailable until you finish a (Short or Long|Short|Long) Rest/,
  /replenishes when you finish a (Short or Long|Short|Long) Rest/,
];

export function findRecoveryRest(rawBody: string): RestTypeName | null {
  const body = normalizeApostrophes(rawBody);
  for (const shape of RECOVERY_SHAPES) {
    const match = shape.exec(body);
    if (match) return match[1] === "Long" ? "LONG_REST" : "SHORT_REST";
  }
  return null;
}

const ACTION_SHAPES: Array<{ shape: RegExp; type: DisplayTypeName }> = [
  { shape: /\bas a Magic action\b|\bas an Action\b|\btake the Magic action\b/i, type: "ACTION" },
  { shape: /\bas a Bonus Action\b/i, type: "BONUSACTION" },
  { shape: /\bas a Reaction\b|\btake a Reaction\b/i, type: "REACTION" },
];

export function findDisplayTypes(rawBody: string, hasUses: boolean): DisplayTypeName[] {
  const body = normalizeApostrophes(rawBody);
  const actions = ACTION_SHAPES.filter(({ shape }) => shape.test(body)).map(({ type }) => type);
  const displayType: DisplayTypeName[] = actions.length ? actions : ["PASSIVE"];

  return hasUses ? [...displayType, "CLASS_RESOURCE"] : displayType;
}
