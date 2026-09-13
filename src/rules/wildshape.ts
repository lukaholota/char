/**
 * Дика форма обох редакцій. Це **одна назва на дві різні фічі**, тому редакція тут — параметр
 * кожного правила, а не прапорець усередині одного: у 2014 персонаж отримує окремий стос хітів
 * звіра, у 2024 лишається у своїх і бере тимчасові; у 2014 плавання заблоковане до 4 рівня, у
 * 2024 не блокується ніколи; у 2024 форм скінченна кількість — «відомі форми».
 *
 * Числа 2014 узяті з PHB, а не з корпусу в репозиторії: у `data/2014/srd/` класів немає взагалі.
 * Решта 2014 виведена з власного контенту проєкту — `prisma/seed/subclassFeatureSeed.ts`, риса
 * «Форми кола»: коло Місяця «ігнорує стовпчик Max. CR таблиці Звіриних форм, але мусить
 * дотримуватися решти її обмежень», тобто обмеження на політ і плавання лишаються й для нього.
 *
 * Числа 2024, навпаки, лежать у репозиторії дослівно: таблиця «Beast Shapes» —
 * `data/2024/srd/classes.md` (колонки Druid Level | Known Forms | Max CR | Fly Speed, колонки
 * плавання там немає взагалі), «Форми кола» Кола місяця —
 * `data/2024/source/raw/subclass/druid-circle-of-the-moon.html`.
 */

import type { Ruleset } from "./types";

/// Ратифікована назва типу створіння — `dictionary.json`, `creatureTypes.beast`.
const BEAST_TYPE = "звір";

export interface WildshapeLimits {
  maxChallengeRating: number;
  allowsFlySpeed: boolean;
  allowsSwimSpeed: boolean;
}

/// Швидкості беруться числами з каталогу, а не шукаються підрядком у рядку статблока: у «Духа
/// звіра» режими взаємовиключні («лазіння … **або** плавання … **або** політ …»), і пошук
/// підрядком вважав його водночас літаючим і плаваючим. Розбирає їх `parseCreatureSpeeds`
/// у скрипті збірки каталогу; умовний режим не приїжджає сюди зовсім.
export interface WildshapeCandidate {
  nameEng: string;
  type: string;
  challenge: string;
  flySpeed: number | null;
  swimSpeed: number | null;
  climbSpeed: number | null;
  hasConditionalSpeed: boolean;
}

/// Чому причина, а не просто «ні»: рядок обмежень «КР до 1 · без польоту, без плавання» не сказав
/// власникові, що лазіння дозволене свідомо, і година пішла на перевірку правила, яке весь час
/// було правильне. Причина несе поріг, тож текст пишеться тут, а не збирається в UI зі шматків.
export type EligibilityReason =
  | { kind: "noWildshape"; blocking: true; text: string }
  | { kind: "notABeast"; blocking: true; text: string }
  | { kind: "noChallengeRating"; blocking: true; text: string }
  | { kind: "challengeTooHigh"; blocking: true; text: string; maxChallengeRating: number }
  | { kind: "flySpeedLocked"; blocking: true; text: string; unlocksAtLevel: number }
  | { kind: "swimSpeedLocked"; blocking: true; text: string; unlocksAtLevel: number }
  | { kind: "moonCircleChallenge"; blocking: false; text: string; maxChallengeRating: number }
  | { kind: "climbSpeedAllowed"; blocking: false; text: string }
  | { kind: "conditionalSpeed"; blocking: false; text: string };

export type WildshapeEligibility = {
  eligible: boolean;
  reasons: EligibilityReason[];
};

/// Рівень друїда, коло й редакція — усе, від чого залежить придатність форми.
export type WildshapeContext = DruidStanding & { ruleset: Ruleset };

/// `knownForms` — стовпчик «Known Forms» таблиці 2024. У 2014 такого стовпчика немає, і `null`
/// тут означає саме це: набір форм не обмежений, а не обмежений нулем.
type BeastShapesRow = { fromLevel: number; knownForms: number | null; limits: WildshapeLimits };

/// Стовпчик Max. CR, обмеження руху й кількість відомих форм за рівнем друїда. Пороги в обох
/// редакціях однакові — 2, 4, 8 — і саме тому таблиці стоять поруч: єдина відмінність, яку
/// легко проґавити, це плавання, дозволене в 2024 з першого ж рядка.
const BEAST_SHAPES_TABLES: Record<Ruleset, BeastShapesRow[]> = {
  RULES_2014: [
    { fromLevel: 8, knownForms: null, limits: { maxChallengeRating: 1, allowsFlySpeed: true, allowsSwimSpeed: true } },
    { fromLevel: 4, knownForms: null, limits: { maxChallengeRating: 0.5, allowsFlySpeed: false, allowsSwimSpeed: true } },
    { fromLevel: 2, knownForms: null, limits: { maxChallengeRating: 0.25, allowsFlySpeed: false, allowsSwimSpeed: false } },
  ],
  RULES_2024: [
    { fromLevel: 8, knownForms: 8, limits: { maxChallengeRating: 1, allowsFlySpeed: true, allowsSwimSpeed: true } },
    { fromLevel: 4, knownForms: 6, limits: { maxChallengeRating: 0.5, allowsFlySpeed: false, allowsSwimSpeed: true } },
    { fromLevel: 2, knownForms: 4, limits: { maxChallengeRating: 0.25, allowsFlySpeed: false, allowsSwimSpeed: true } },
  ],
};

export interface ClassStanding {
  className: string;
  classLevel: number;
  subclassName: string | null;
}

export interface DruidStanding {
  druidLevel: number;
  isMoonCircle: boolean;
}

/// Клас у базі носить редакцію в самій назві, підклас — ні: 2024-ве Коло місяця приїхало сідом
/// під тим самим ключем `CIRCLE_OF_THE_MOON`, тільки з `ruleset: RULES_2024` і власним
/// `classId` (виміряно в `spells_test` 2026-09-01). Тому клас шукається за списком, а коло — за
/// однією назвою.
const DRUID_CLASSES = ["DRUID_2014", "DRUID_2024"];
const MOON_CIRCLE_SUBCLASS = "CIRCLE_OF_THE_MOON";

/// Коло місяця 2024 починається з 3 рівня, а не з 2, і множить тимчасові хіти на три.
const MOON_CIRCLE_LEVEL_2024 = 3;
const MOON_CIRCLE_TEMPORARY_HP_MULTIPLIER_2024 = 3;
const MOON_CIRCLE_ARMOR_CLASS_BASE_2024 = 13;

/// Рівень друїда, а не рівень персонажа: мультиклас 3 воїн / 2 друїд отримує Дику форму 2 рівня.
export function findDruidStanding(classes: ClassStanding[]): DruidStanding {
  const druid = classes.find((standing) => DRUID_CLASSES.includes(standing.className));
  if (!druid) return { druidLevel: 0, isMoonCircle: false };

  return {
    druidLevel: Math.max(0, Math.trunc(druid.classLevel)),
    isMoonCircle: druid.subclassName === MOON_CIRCLE_SUBCLASS,
  };
}

/// `null` — Дикої форми немає взагалі. Не «межа нуль»: у каталозі повно звірів із КР 0, і
/// нульова межа пропустила б їх усіх недруїду. Відсутність фічі — не найсуворіша її межа.
export function findWildshapeLimits(context: WildshapeContext): WildshapeLimits | null {
  const row = findBeastShapesRow(context);
  if (!row) return null;

  return context.isMoonCircle
    ? { ...row.limits, maxChallengeRating: findMoonCircleChallengeRating(context, row.limits.maxChallengeRating) }
    : row.limits;
}

/// Скільки форм персонаж може тримати відомими. `null` — редакція такого обмеження не знає
/// (2014) або Дикої форми немає взагалі.
export function findKnownFormsLimit(context: WildshapeContext): number | null {
  return findBeastShapesRow(context)?.knownForms ?? null;
}

function findBeastShapesRow(context: WildshapeContext): BeastShapesRow | undefined {
  const level = Math.trunc(context.druidLevel);
  return BEAST_SHAPES_TABLES[context.ruleset].find((entry) => level >= entry.fromLevel);
}

/// «Форми кола» 2014: з 2 рівня КР до 1, з 6 — до третини рівня друїда, округленої донизу.
/// 2024: підклас починається з 3 рівня, і третина рівня діє одразу, без сходинки на 1.
function findMoonCircleChallengeRating(context: WildshapeContext, tableChallengeRating: number): number {
  const level = Math.trunc(context.druidLevel);

  if (context.ruleset === "RULES_2024") {
    return level >= MOON_CIRCLE_LEVEL_2024 ? Math.floor(level / 3) : tableChallengeRating;
  }

  return level >= 6 ? Math.floor(level / 3) : 1;
}

/**
 * Придатність форми з усіма причинами одразу, а не з першою-ліпшою: КР завеликий **і** політ
 * зарано — це дві різні речі, які гравець має побачити разом. Непридатна форма за
 * [Р-3](docs/o24-wildshape-second-layer/README.md) не зникає зі списку, а додається з
 * попередженням, тож причина мусить називати, чого саме бракує.
 */
export function findWildshapeEligibility(
  candidate: WildshapeCandidate,
  context: WildshapeContext
): WildshapeEligibility {
  const limits = findWildshapeLimits(context);
  if (!limits) return blockWith({ kind: "noWildshape", blocking: true, text: "Персонаж не має Дикої форми" });
  if (!isBeast(candidate.type)) {
    return blockWith({ kind: "notABeast", blocking: true, text: "Дика форма перетворює лише на звіра" });
  }

  const reasons = [
    ...findChallengeReasons(candidate, context, limits),
    ...findSpeedReasons(candidate, context, limits),
  ];

  return { eligible: !reasons.some((reason) => reason.blocking), reasons };
}

function findChallengeReasons(
  candidate: WildshapeCandidate,
  context: WildshapeContext,
  limits: WildshapeLimits
): EligibilityReason[] {
  const challenge = parseChallengeRating(candidate.challenge);

  if (challenge === null) {
    return [
      {
        kind: "noChallengeRating",
        blocking: true,
        text: "Істота не має показника небезпеки, тож Дика форма її не пропонує",
      },
    ];
  }

  if (challenge > limits.maxChallengeRating) {
    return [
      {
        kind: "challengeTooHigh",
        blocking: true,
        maxChallengeRating: limits.maxChallengeRating,
        text: `Показник небезпеки ${formatChallengeRating(challenge)} вищий за дозволений ${formatChallengeRating(limits.maxChallengeRating)}`,
      },
    ];
  }

  /// Без цього гравець не розуміє, чому його список ширший за таблицю: у колі Місяця КР рахується
  /// не за стовпчиком Max. CR, а за рівнем друїда.
  const beyondTable = challenge > findTableChallengeRating(context);
  return context.isMoonCircle && beyondTable
    ? [
        {
          kind: "moonCircleChallenge",
          blocking: false,
          maxChallengeRating: limits.maxChallengeRating,
          text: `Доступна завдяки Колу місяця: воно піднімає межу до КР ${formatChallengeRating(limits.maxChallengeRating)}`,
        },
      ]
    : [];
}

function findSpeedReasons(
  candidate: WildshapeCandidate,
  context: WildshapeContext,
  limits: WildshapeLimits
): EligibilityReason[] {
  const reasons: EligibilityReason[] = [];

  if (!limits.allowsFlySpeed && candidate.flySpeed !== null) {
    const unlocksAtLevel = findSpeedUnlockLevel(context.ruleset, (row) => row.allowsFlySpeed);
    reasons.push({
      kind: "flySpeedLocked",
      blocking: true,
      unlocksAtLevel,
      text: `Швидкість польоту відкривається з ${unlocksAtLevel} рівня друїда`,
    });
  }

  if (!limits.allowsSwimSpeed && candidate.swimSpeed !== null) {
    const unlocksAtLevel = findSpeedUnlockLevel(context.ruleset, (row) => row.allowsSwimSpeed);
    reasons.push({
      kind: "swimSpeedLocked",
      blocking: true,
      unlocksAtLevel,
      text: `Швидкість плавання відкривається з ${unlocksAtLevel} рівня друїда`,
    });
  }

  /// Саме тут виникла підозра на баг: 23 лазячі форми 2024 виглядали як помилка фільтра. Лазіння
  /// не обмежене в жодній редакції, і форма це каже сама.
  if (candidate.climbSpeed !== null) {
    reasons.push({
      kind: "climbSpeedAllowed",
      blocking: false,
      text: "Швидкість лазіння Дика форма не обмежує на жодному рівні",
    });
  }

  if (candidate.hasConditionalSpeed) {
    reasons.push({
      kind: "conditionalSpeed",
      blocking: false,
      text: "Швидкості цієї форми взаємовиключні — режим обирається за столом",
    });
  }

  return reasons;
}

/// Межа КР за самою таблицею, без «Форм кола» — потрібна, щоб сказати, що форму відкрило коло.
function findTableChallengeRating(context: WildshapeContext): number {
  return findBeastShapesRow(context)?.limits.maxChallengeRating ?? 0;
}

/// Поріг береться з тієї самої таблиці, за якою рахується придатність, — інакше UI мав би власну
/// копію чисел 4 і 8, і саме такі копії розходяться.
function findSpeedUnlockLevel(ruleset: Ruleset, allows: (limits: WildshapeLimits) => boolean): number {
  const rows = BEAST_SHAPES_TABLES[ruleset].filter((entry) => allows(entry.limits));
  return rows.length > 0 ? Math.min(...rows.map((entry) => entry.fromLevel)) : Infinity;
}

function blockWith(reason: EligibilityReason): WildshapeEligibility {
  return { eligible: false, reasons: [reason] };
}

/// Тексти причин пише цей модуль. Попередження при прикріпленні й позначка непридатної форми в
/// каталозі беруть їх звідси — щоб те саме правило не отримало двох формулювань.
export function listBlockingReasons(eligibility: WildshapeEligibility): string[] {
  return eligibility.reasons.filter((reason) => reason.blocking).map((reason) => reason.text);
}

/// Рядок обмежень для картки на листі. Лазіння названо явно: мовчання про нього вже коштувало
/// години перевірки правила, яке було правильне.
export function describeWildshapeLimits(context: WildshapeContext): string[] {
  const limits = findWildshapeLimits(context);
  if (!limits) return [];

  return [
    `КР до ${formatChallengeRating(limits.maxChallengeRating)}`,
    describeSpeedLimit("політ", limits.allowsFlySpeed, findSpeedUnlockLevel(context.ruleset, (row) => row.allowsFlySpeed)),
    describeSpeedLimit("плавання", limits.allowsSwimSpeed, findSpeedUnlockLevel(context.ruleset, (row) => row.allowsSwimSpeed)),
    "лазіння без обмежень",
    ...describe2024Additions(context),
  ];
}

function describeSpeedLimit(mode: string, allowed: boolean, unlocksAtLevel: number): string {
  return allowed ? `${mode} дозволено` : `${mode} з ${unlocksAtLevel} рівня`;
}

/// Те, чого в 2014 немає взагалі: вхід бонусною дією вже в базовому класі (у 2014 це давало
/// коло Місяця) і тимчасові хіти замість окремого стосу звіра. Рядок 2014 лишається таким, яким
/// його закрив KR24.2, — жодного нового пункту.
function describe2024Additions(context: WildshapeContext): string[] {
  if (context.ruleset !== "RULES_2024") return [];

  return [
    "вхід і вихід — бонусна дія",
    `тимчасові ХП +${findWildshapeTemporaryHitPoints(context)}`,
    "заміна однієї форми за довгий відпочинок",
  ];
}

/**
 * Тимчасові ХП при перевтіленні, правила 2024: «ви отримуєте тимчасові хіти, що дорівнюють
 * вашому рівню друїда», а Коло місяця потроює це число. У 2014 їх немає — там хіти звіра
 * окремий стос, і нуль тут означає саме «правило не застосовується», а не «нуль хітів».
 */
export function findWildshapeTemporaryHitPoints(context: WildshapeContext): number {
  if (context.ruleset !== "RULES_2024" || !findWildshapeLimits(context)) return 0;

  const level = Math.max(0, Math.trunc(context.druidLevel));
  return context.isMoonCircle ? level * MOON_CIRCLE_TEMPORARY_HP_MULTIPLIER_2024 : level;
}

/**
 * КБ у формі. Звичайний друїд обох редакцій бере КБ звіра; Коло місяця 2024 — «ваш КБ дорівнює
 * 13 плюс модифікатор Мудрості, якщо ця сума більша за КБ Звіра». У 2014 такого правила немає.
 */
export function findBeastFormArmorClass(input: {
  beastArmorClass: number;
  wisdomModifier: number;
  context: WildshapeContext;
}): number {
  if (input.context.ruleset !== "RULES_2024" || !input.context.isMoonCircle) return input.beastArmorClass;

  return Math.max(input.beastArmorClass, MOON_CIRCLE_ARMOR_CLASS_BASE_2024 + input.wisdomModifier);
}

/// 2014 — окремий стос хітів звіра, у який бʼє шкода й з якого переливається надлишок; 2024 —
/// свої хіти плюс тимчасові. За цим прапорцем лист вирішує, чий блок хітів малювати, а сервер —
/// куди записувати шкоду.
export function usesSeparateBeastHitPoints(ruleset: Ruleset): boolean {
  return ruleset !== "RULES_2024";
}

/// Перевищення межі відомих форм не блокується ([Р-3], [Р26]): застосунок трекер, а не суддя.
/// `null` — межі немає (2014), і казати нема чого.
export function describeKnownFormsOverflow(input: { attached: number; limit: number | null }): string | null {
  if (input.limit === null || input.attached <= input.limit) return null;

  return `Відомих форм ${input.attached} при межі ${input.limit}. Зайві лишаються на листі — за столом заміняйте по одній за довгий відпочинок.`;
}

export function formatChallengeRating(value: number): string {
  if (value === 0.25) return "1/4";
  if (value === 0.5) return "1/2";
  return String(value);
}

export function findAvailableForms<T extends WildshapeCandidate>(
  candidates: T[],
  context: WildshapeContext
): T[] {
  return candidates.filter((candidate) => findWildshapeEligibility(candidate, context).eligible);
}

/// Збіг точний, а не входженням: «Рій дрібних звірів» — не звір для Дикої форми, і
/// «Бестія (перевертень)» теж ним не є.
function isBeast(type: string): boolean {
  return (type ?? "").trim().toLowerCase() === BEAST_TYPE;
}

export interface BeastFormHitPoints {
  beastCurrent: number;
  beastMax: number;
  persCurrent: number;
}

export interface BeastFormDamageOutcome {
  beastCurrent: number;
  persCurrent: number;
  reverted: boolean;
  carriedOver: number;
}

/**
 * Шкода у звіриній формі, правила 2014: бʼє по хітах звіра, а надлишок переливається в хіти
 * персонажа й викидає його з форми. Добровільний вихід хітів персонажа не чіпає взагалі — саме
 * тому вони тут окремий стос, а не одне число.
 */
export function applyDamageInBeastForm(
  state: BeastFormHitPoints,
  damage: number
): BeastFormDamageOutcome {
  const dealt = Math.max(0, Math.trunc(damage));
  const beastCurrent = Math.max(0, Math.min(state.beastCurrent, state.beastMax));

  if (dealt < beastCurrent) {
    return { beastCurrent: beastCurrent - dealt, persCurrent: state.persCurrent, reverted: false, carriedOver: 0 };
  }

  const carriedOver = dealt - beastCurrent;
  return {
    beastCurrent: 0,
    persCurrent: Math.max(0, state.persCurrent - carriedOver),
    reverted: true,
    carriedOver,
  };
}

/// Зцілення у формі лікує звіра, а не персонажа, і не перевищує хітів звіра.
export function applyHealingInBeastForm(state: BeastFormHitPoints, healing: number): number {
  const healed = Math.max(0, Math.trunc(healing));
  return Math.min(state.beastMax, Math.max(0, state.beastCurrent) + healed);
}

/// Хіти у статблоці — «34 (4к10 + 12)». Потрібне лише перше число.
export function parseCreatureHitPoints(hp: string): number | null {
  const match = (hp ?? "").trim().match(/^\d+/);
  return match ? Number(match[0]) : null;
}

/// Показник небезпеки в каталозі — «1/4», «2» або «-» у записів без нього.
export function parseChallengeRating(challenge: string): number | null {
  const raw = (challenge ?? "").trim();
  if (!raw || raw === "-" || raw === "—") return null;

  const fraction = raw.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }

  const whole = raw.match(/^\d+/);
  return whole ? Number(whole[0]) : null;
}

/// Характеристика у статблоці — «16 (+3)»: потрібне саме значення, модифікатор у дужках
/// виводиться з нього самого.
export function parseAbilityScore(score: string): number | null {
  const match = (score ?? "").trim().match(/^\d+/);
  return match ? Number(match[0]) : null;
}

/// КБ у статблоці — «11 (природний обладунок)» або «11 + рівень чарунку (природний обладунок)»:
/// число попереду це база, приріст прикликаної істоти від рівня чарунку сюди не входить.
export function parseArmorClass(ac: string): number | null {
  const match = (ac ?? "").trim().match(/^\d+/);
  return match ? Number(match[0]) : null;
}
