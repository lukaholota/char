import { describe, expect, it } from "vitest";
import { getAllCreatures } from "@/lib/bestiaryData";
import {
  type WildshapeContext,
  applyDamageInBeastForm,
  applyHealingInBeastForm,
  describeKnownFormsOverflow,
  describeWildshapeLimits,
  findAvailableForms,
  findBeastFormArmorClass,
  findDruidStanding,
  findKnownFormsLimit,
  findWildshapeEligibility,
  findWildshapeLimits,
  findWildshapeTemporaryHitPoints,
  parseAbilityScore,
  parseArmorClass,
  parseChallengeRating,
  parseCreatureHitPoints,
  usesSeparateBeastHitPoints,
} from "@/rules/wildshape";

/// KR22.3. Правила **2014**: таблиця Звіриних форм (2 / 4 / 8 рівень) плюс «Форми кола» для
/// кола Місяця. Найлегша помилка тут — прикласти 2024-ву Дику форму, у якої обмеження на
/// плавання немає взагалі, а політ відкривається на 8 рівні при чотирьох «відомих формах».

/// Швидкості приходять числами з каталогу (KR24.1), тож кандидат несе саме числа: рядок
/// статблока правила більше не читають.
const noSpeeds = { flySpeed: null, swimSpeed: null, climbSpeed: null, hasConditionalSpeed: false };

const WOLF = { nameEng: "Wolf", type: "Звір", challenge: "1/4", ...noSpeeds };
const GIANT_EAGLE = { nameEng: "Giant Eagle", type: "Звір", challenge: "1", ...noSpeeds, flySpeed: 80 };
const REEF_SHARK = { nameEng: "Reef Shark", type: "Звір", challenge: "1/2", ...noSpeeds, swimSpeed: 40 };
const BROWN_BEAR = { nameEng: "Brown Bear", type: "Звір", challenge: "1", ...noSpeeds, climbSpeed: 30 };
const SUCCUBUS = { nameEng: "Succubus", type: "Бестія (перевертень)", challenge: "4", ...noSpeeds, flySpeed: 60 };
const BESTIAL_SPIRIT = { nameEng: "Bestial Spirit", type: "Звір", challenge: "-", ...noSpeeds };

/// Рівень друїда, коло й редакція — один обʼєкт: пороги живуть у таблиці правил, і тест не має
/// свого набору чисел.
const druid = (druidLevel: number, isMoonCircle = false): WildshapeContext => ({
  druidLevel,
  isMoonCircle,
  ruleset: "RULES_2014",
});

/// KR24.6. Друїд 2024 — це та сама функція з іншою редакцією, а не інша функція.
const druid2024 = (druidLevel: number, isMoonCircle = false): WildshapeContext => ({
  druidLevel,
  isMoonCircle,
  ruleset: "RULES_2024",
});

const findReason = (
  candidate: Parameters<typeof findWildshapeEligibility>[0],
  context: WildshapeContext,
  kind: string
) => findWildshapeEligibility(candidate, context).reasons.find((reason) => reason.kind === kind);

const blockingKinds = (candidate: Parameters<typeof findWildshapeEligibility>[0], context: WildshapeContext) =>
  findWildshapeEligibility(candidate, context)
    .reasons.filter((reason) => reason.blocking)
    .map((reason) => reason.kind);

describe("показник небезпеки з каталогу", () => {
  it("читає дроби, цілі й відсутність", () => {
    expect(parseChallengeRating("1/4")).toBe(0.25);
    expect(parseChallengeRating("1/2")).toBe(0.5);
    expect(parseChallengeRating("3")).toBe(3);
    expect(parseChallengeRating("-")).toBeNull();
    expect(parseChallengeRating("")).toBeNull();
  });
});

describe("таблиця Звіриних форм 2014", () => {
  it("до 2 рівня Дикої форми немає — і це null, а не нульова межа", () => {
    expect(findWildshapeLimits(druid(1))).toBeNull();
    expect(findWildshapeLimits(druid(0, true))).toBeNull();
  });

  /// Зловили тестом: у каталозі повно звірів із КР 0, тому «межа нуль» пропускала б їх усіх
  /// персонажу, який Дикої форми не має взагалі.
  it("без Дикої форми не пропонується жодного звіра, навіть із КР 0", () => {
    const zeroChallengeBeast = { nameEng: "Cat", type: "Звір", challenge: "0", ...noSpeeds };

    expect(blockingKinds(zeroChallengeBeast, druid(1))).toEqual(["noWildshape"]);
    expect(findAvailableForms([zeroChallengeBeast], druid(1))).toEqual([]);
  });

  it("2 рівень — КР 1/4, без польоту й плавання", () => {
    expect(findWildshapeLimits(druid(2))).toEqual({
      maxChallengeRating: 0.25,
      allowsFlySpeed: false,
      allowsSwimSpeed: false,
    });
  });

  it("4 рівень — КР 1/2, плавання дозволене, політ ні", () => {
    expect(findWildshapeLimits(druid(4))).toEqual({
      maxChallengeRating: 0.5,
      allowsFlySpeed: false,
      allowsSwimSpeed: true,
    });
  });

  it("8 рівень — КР 1 і жодних обмежень руху", () => {
    expect(findWildshapeLimits(druid(8))).toEqual({
      maxChallengeRating: 1,
      allowsFlySpeed: true,
      allowsSwimSpeed: true,
    });
  });

  it("між порогами таблиця не рухається", () => {
    expect(findWildshapeLimits(druid(7))).toEqual(findWildshapeLimits(druid(4)));
    expect(findWildshapeLimits(druid(20))).toEqual(findWildshapeLimits(druid(8)));
  });
});

describe("коло Місяця", () => {
  it("з 2 рівня дає КР 1 замість 1/4", () => {
    expect(findWildshapeLimits(druid(2, true))!.maxChallengeRating).toBe(1);
  });

  it("з 6 рівня — третина рівня друїда донизу", () => {
    expect(findWildshapeLimits(druid(6, true))!.maxChallengeRating).toBe(2);
    expect(findWildshapeLimits(druid(8, true))!.maxChallengeRating).toBe(2);
    expect(findWildshapeLimits(druid(9, true))!.maxChallengeRating).toBe(3);
    expect(findWildshapeLimits(druid(20, true))!.maxChallengeRating).toBe(6);
  });

  /// «Ігноруєте стовпчик Max. CR… але мусите дотримуватися решти її обмежень» — тобто політ
  /// і плавання відкриваються за загальною таблицею, а не разом із КР.
  it("обмежень руху не скасовує", () => {
    expect(findWildshapeLimits(druid(2, true))!.allowsFlySpeed).toBe(false);
    expect(findWildshapeLimits(druid(2, true))!.allowsSwimSpeed).toBe(false);
    expect(findWildshapeLimits(druid(4, true))!.allowsSwimSpeed).toBe(true);
    expect(findWildshapeLimits(druid(4, true))!.allowsFlySpeed).toBe(false);
  });
});

describe("придатність конкретної форми", () => {
  it("вовк доступний друїду 2 рівня", () => {
    expect(findWildshapeEligibility(WOLF, druid(2)).eligible).toBe(true);
  });

  it("не-звір недоступний навіть за КР", () => {
    expect(blockingKinds(SUCCUBUS, druid(20, true))).toEqual(["notABeast"]);
  });

  /// Девʼять звірів каталогу — статблоки прикликання без КР узагалі. Казати про них «показник
  /// небезпеки завеликий» неправда: його немає.
  it("звір без показника небезпеки відхиляється своєю причиною, а не «завеликим КР»", () => {
    expect(blockingKinds(BESTIAL_SPIRIT, druid(20, true))).toEqual(["noChallengeRating"]);
  });

  /// Дві причини одразу, а не перша-ліпша: на 2 рівні акулу ріже і КР, і плавання, і гравець
  /// має бачити обидві — інакше він підніме рівень і зустріне ту саму відмову з іншим текстом.
  it("акула недоступна на 2 рівні через КР і плавання, а на 4 доступна", () => {
    expect(blockingKinds(REEF_SHARK, druid(2))).toEqual(["challengeTooHigh", "swimSpeedLocked"]);
    expect(findWildshapeEligibility(REEF_SHARK, druid(4)).eligible).toBe(true);
  });

  it("плавання ріже форму, яка проходить за КР", () => {
    expect(blockingKinds(REEF_SHARK, druid(2, true))).toEqual(["swimSpeedLocked"]);
  });

  it("політ ріже гігантського орла до 8 рівня навіть у колі Місяця", () => {
    expect(blockingKinds(GIANT_EAGLE, druid(6, true))).toEqual(["flySpeedLocked"]);
    expect(findWildshapeEligibility(GIANT_EAGLE, druid(8, true)).eligible).toBe(true);
  });

  it("ведмідь недоступний звичайному друїду 4 рівня й доступний друїду Місяця 2 рівня", () => {
    expect(blockingKinds(BROWN_BEAR, druid(4))).toEqual(["challengeTooHigh"]);
    expect(findWildshapeEligibility(BROWN_BEAR, druid(2, true)).eligible).toBe(true);
  });

  /// Саме та пара, через яку відкрилася ціль: друїд Місяця 2 рівня бачить ведмедя з лазінням і
  /// не бачить орла — і причина орла саме політ, а не КР, який коло вже підняло до 1.
  it("друїд Місяця 2 рівня бачить ведмедя й не бачить орла — через політ, не через КР", () => {
    expect(findWildshapeEligibility(BROWN_BEAR, druid(2, true)).eligible).toBe(true);
    expect(blockingKinds(GIANT_EAGLE, druid(2, true))).toEqual(["flySpeedLocked"]);
  });

  it("причин може бути дві одразу — КР завеликий і політ зарано", () => {
    const heavyFlyer = { nameEng: "Giant Vulture", type: "Звір", challenge: "1", ...noSpeeds, flySpeed: 60 };

    expect(blockingKinds(heavyFlyer, druid(2))).toEqual(["challengeTooHigh", "flySpeedLocked"]);
  });
});

describe("причина несе поріг і текст", () => {
  it("політ і плавання називають рівень, з якого відкриваються", () => {
    const fly = findReason(GIANT_EAGLE, druid(6, true), "flySpeedLocked");
    const swim = findReason(REEF_SHARK, druid(2, true), "swimSpeedLocked");

    expect(fly).toMatchObject({ unlocksAtLevel: 8 });
    expect(swim).toMatchObject({ unlocksAtLevel: 4 });
    expect(fly!.text).toContain("8 рівня");
    expect(swim!.text).toContain("4 рівня");
  });

  it("завеликий КР називає обидва числа — істоти й межі", () => {
    const reason = findReason(BROWN_BEAR, druid(4), "challengeTooHigh");

    expect(reason).toMatchObject({ maxChallengeRating: 0.5 });
    expect(reason!.text).toContain("1/2");
  });

  /// Позитивні причини: без них гравець не розуміє, чому список ширший за таблицю і чому лазячі
  /// форми лишилися.
  it("коло Місяця й лазіння пояснюють себе, не блокуючи форму", () => {
    const bear = findWildshapeEligibility(BROWN_BEAR, druid(2, true));

    expect(bear.eligible).toBe(true);
    expect(bear.reasons.map((reason) => reason.kind)).toEqual(["moonCircleChallenge", "climbSpeedAllowed"]);
    expect(bear.reasons.every((reason) => !reason.blocking)).toBe(true);
  });

  it("умовні швидкості позначаються окремо, а не мовчки", () => {
    const spirit = { nameEng: "Bestial Spirit", type: "Звір", challenge: "1/4", ...noSpeeds, hasConditionalSpeed: true };
    const reasons = findWildshapeEligibility(spirit, druid(2)).reasons;

    expect(reasons.map((reason) => reason.kind)).toEqual(["conditionalSpeed"]);
  });
});

describe("рядок обмежень для картки", () => {
  /// Пороги в UI не збираються: якщо таблиця зміниться, зміниться й рядок.
  it("називає КР, обидва пороги руху й те, що лазіння не обмежене", () => {
    expect(describeWildshapeLimits(druid(2))).toEqual([
      "КР до 1/4",
      "політ з 8 рівня",
      "плавання з 4 рівня",
      "лазіння без обмежень",
    ]);
    expect(describeWildshapeLimits(druid(8, true))).toEqual([
      "КР до 2",
      "політ дозволено",
      "плавання дозволено",
      "лазіння без обмежень",
    ]);
  });

  it("без Дикої форми рядка немає взагалі", () => {
    expect(describeWildshapeLimits(druid(1))).toEqual([]);
  });
});

/// Клас носить редакцію в назві, підклас — ні: 2024-ве Коло місяця лежить у базі під тим самим
/// ключем `CIRCLE_OF_THE_MOON`. Друїд 2024 не впізнався б, якби клас шукався однією назвою.
describe("рівень друїда обох редакцій", () => {
  it("DRUID_2024 дає рівень друїда так само, як DRUID_2014", () => {
    const standing = findDruidStanding([
      { className: "DRUID_2024", classLevel: 6, subclassName: "CIRCLE_OF_THE_MOON" },
    ]);

    expect(standing).toEqual({ druidLevel: 6, isMoonCircle: true });
  });

  it("мультиклас 3 воїн / 2 друїд 2024 бачить свої 2 рівні", () => {
    const standing = findDruidStanding([
      { className: "FIGHTER_2024", classLevel: 3, subclassName: null },
      { className: "DRUID_2024", classLevel: 2, subclassName: null },
    ]);

    expect(standing).toEqual({ druidLevel: 2, isMoonCircle: false });
  });

  it("не-друїд Дикої форми не дістає в жодній редакції", () => {
    expect(findDruidStanding([{ className: "FIGHTER_2024", classLevel: 20, subclassName: null }])).toEqual({
      druidLevel: 0,
      isMoonCircle: false,
    });
  });
});

describe("таблиця Звіриних форм 2024", () => {
  /// Пороги ті самі — 2, 4, 8, — і саме тому єдину відмінність легко проґавити: у 2024 колонки
  /// плавання в таблиці немає взагалі, тож воно дозволене з першого ж рядка.
  it("2 рівень — КР 1/4, без польоту, але плавання вже дозволене", () => {
    expect(findWildshapeLimits(druid2024(2))).toEqual({
      maxChallengeRating: 0.25,
      allowsFlySpeed: false,
      allowsSwimSpeed: true,
    });
  });

  it("4 рівень — КР 1/2, політ і далі закритий", () => {
    expect(findWildshapeLimits(druid2024(4))).toEqual({
      maxChallengeRating: 0.5,
      allowsFlySpeed: false,
      allowsSwimSpeed: true,
    });
  });

  it("8 рівень — КР 1 і політ відкрито", () => {
    expect(findWildshapeLimits(druid2024(8))).toEqual({
      maxChallengeRating: 1,
      allowsFlySpeed: true,
      allowsSwimSpeed: true,
    });
  });

  it("до 2 рівня Дикої форми немає й тут", () => {
    expect(findWildshapeLimits(druid2024(1))).toBeNull();
  });

  /// Та сама істота, дві редакції: акулу 2014 ріже плавання, 2024 — ні. Це і є розбіжність,
  /// заради якої редакція стала параметром.
  it("плавучий звір недоступний друїду 2014 на 2 рівні й доступний друїду 2024", () => {
    expect(blockingKinds(REEF_SHARK, druid(2))).toContain("swimSpeedLocked");
    expect(blockingKinds(REEF_SHARK, druid2024(2))).toEqual(["challengeTooHigh"]);

    const withinChallenge = { ...REEF_SHARK, challenge: "1/4" };
    expect(findWildshapeEligibility(withinChallenge, druid2024(2)).eligible).toBe(true);
    expect(blockingKinds(withinChallenge, druid(2))).toEqual(["swimSpeedLocked"]);
  });

  it("політ ріже орла до 8 рівня в обох редакціях", () => {
    expect(blockingKinds(GIANT_EAGLE, druid2024(6, true))).toEqual(["flySpeedLocked"]);
    expect(findWildshapeEligibility(GIANT_EAGLE, druid2024(8)).eligible).toBe(true);
  });
});

describe("відомі форми 2024", () => {
  it("4 / 6 / 8 на рівнях 2 / 4 / 8", () => {
    expect(findKnownFormsLimit(druid2024(2))).toBe(4);
    expect(findKnownFormsLimit(druid2024(3))).toBe(4);
    expect(findKnownFormsLimit(druid2024(4))).toBe(6);
    expect(findKnownFormsLimit(druid2024(8))).toBe(8);
    expect(findKnownFormsLimit(druid2024(20))).toBe(8);
  });

  /// У 2014 такого стовпчика немає — і `null` тут означає «обмеження немає», а не «нуль форм».
  it("2014 межі відомих форм не має взагалі", () => {
    expect(findKnownFormsLimit(druid(2))).toBeNull();
    expect(findKnownFormsLimit(druid(20, true))).toBeNull();
    expect(findKnownFormsLimit(druid2024(1))).toBeNull();
  });

  /// [Р-3], [Р26]: перевищення попереджає, а не блокує — застосунок трекер, а не суддя.
  it("перевищення межі дає попередження, а не заборону", () => {
    expect(describeKnownFormsOverflow({ attached: 4, limit: 4 })).toBeNull();
    expect(describeKnownFormsOverflow({ attached: 5, limit: 4 })).toContain("5 при межі 4");
    expect(describeKnownFormsOverflow({ attached: 5, limit: 4 })).toContain("довгий відпочинок");
  });

  it("без межі попереджати нема про що", () => {
    expect(describeKnownFormsOverflow({ attached: 99, limit: null })).toBeNull();
  });
});

describe("Коло місяця 2024", () => {
  /// Підклас у 2024 починається з 3 рівня, і КР одразу дорівнює третині рівня друїда — без
  /// сходинки «КР 1», яку 2014 тримає до 6 рівня.
  it("з 3 рівня КР дорівнює третині рівня друїда", () => {
    expect(findWildshapeLimits(druid2024(3, true))!.maxChallengeRating).toBe(1);
    expect(findWildshapeLimits(druid2024(6, true))!.maxChallengeRating).toBe(2);
    expect(findWildshapeLimits(druid2024(8, true))!.maxChallengeRating).toBe(2);
    expect(findWildshapeLimits(druid2024(9, true))!.maxChallengeRating).toBe(3);
    expect(findWildshapeLimits(druid2024(20, true))!.maxChallengeRating).toBe(6);
  });

  it("до 3 рівня коло нічого не піднімає — КР лишається табличний", () => {
    expect(findWildshapeLimits(druid2024(2, true))!.maxChallengeRating).toBe(0.25);
    expect(findWildshapeLimits(druid(2, true))!.maxChallengeRating).toBe(1);
  });

  it("обмежень руху коло не скасовує й у 2024", () => {
    expect(findWildshapeLimits(druid2024(6, true))!.allowsFlySpeed).toBe(false);
  });

  it("КБ береться більший з двох — 13 + МУД або КБ звіра", () => {
    const context = druid2024(6, true);

    expect(findBeastFormArmorClass({ beastArmorClass: 12, wisdomModifier: 4, context })).toBe(17);
    expect(findBeastFormArmorClass({ beastArmorClass: 15, wisdomModifier: 1, context })).toBe(15);
  });

  it("звичайний друїд 2024 і будь-який друїд 2014 беруть КБ звіра як є", () => {
    expect(findBeastFormArmorClass({ beastArmorClass: 12, wisdomModifier: 4, context: druid2024(6) })).toBe(12);
    expect(findBeastFormArmorClass({ beastArmorClass: 12, wisdomModifier: 4, context: druid(6, true) })).toBe(12);
  });
});

describe("тимчасові хіти замість стосу звіра", () => {
  it("2024 дає тимчасові ХП, що дорівнюють рівню друїда", () => {
    expect(findWildshapeTemporaryHitPoints(druid2024(2))).toBe(2);
    expect(findWildshapeTemporaryHitPoints(druid2024(8))).toBe(8);
  });

  it("Коло місяця 2024 потроює це число", () => {
    expect(findWildshapeTemporaryHitPoints(druid2024(3, true))).toBe(9);
    expect(findWildshapeTemporaryHitPoints(druid2024(20, true))).toBe(60);
  });

  /// Нуль тут означає «правила такого не знають», а не «нуль хітів»: у 2014 форма має власний
  /// стос, і перелив у `applyDamageInBeastForm` лишається єдиною механікою шкоди.
  it("2014 тимчасових хітів не дає на жодному рівні", () => {
    expect(findWildshapeTemporaryHitPoints(druid(8))).toBe(0);
    expect(findWildshapeTemporaryHitPoints(druid(20, true))).toBe(0);
  });

  it("без Дикої форми тимчасових хітів теж немає", () => {
    expect(findWildshapeTemporaryHitPoints(druid2024(1))).toBe(0);
  });

  it("окремий стос хітів звіра має лише 2014", () => {
    expect(usesSeparateBeastHitPoints("RULES_2014")).toBe(true);
    expect(usesSeparateBeastHitPoints("RULES_2024")).toBe(false);
  });
});

describe("рядок обмежень 2024", () => {
  it("каже, що плавання дозволене, і додає те, чого 2014 не має", () => {
    expect(describeWildshapeLimits(druid2024(2))).toEqual([
      "КР до 1/4",
      "політ з 8 рівня",
      "плавання дозволено",
      "лазіння без обмежень",
      "вхід і вихід — бонусна дія",
      "тимчасові ХП +2",
      "заміна однієї форми за довгий відпочинок",
    ]);
  });

  /// Рядок 2014 не зрушив жодним пунктом — це те, що живе в проді.
  it("рядок 2014 лишився таким, яким був", () => {
    expect(describeWildshapeLimits(druid(2))).toEqual([
      "КР до 1/4",
      "політ з 8 рівня",
      "плавання з 4 рівня",
      "лазіння без обмежень",
    ]);
  });
});

describe("вибір із реального каталогу 2024", () => {
  const catalog2024 = getAllCreatures("RULES_2024");
  const catalog2014 = getAllCreatures("RULES_2014");

  /// Число зняте з каталогу, а не припущене: саме плавання — єдина розбіжність таблиць, і вона
  /// має бути видима в переліку, а не лише в юніт-тесті на межі.
  it("плавучі форми доступні друїду 2024 з 2 рівня, а друїду 2014 — ні", () => {
    const swimmers2024 = findAvailableForms(catalog2024, druid2024(2)).filter((form) => form.swimSpeed !== null);
    const swimmers2014 = findAvailableForms(catalog2014, druid(2)).filter((form) => form.swimSpeed !== null);

    expect(swimmers2024).toHaveLength(10);
    expect(swimmers2014).toHaveLength(0);
    expect(findAvailableForms(catalog2014, druid(4)).filter((form) => form.swimSpeed !== null)).toHaveLength(19);
  });

  it("Гігантський краб — конкретна плавуча форма друїда 2024 другого рівня", () => {
    const crab = catalog2024.find((creature) => creature.nameEng === "Giant Crab");

    expect(crab?.swimSpeed).toBe(30);
    expect(findWildshapeEligibility(crab!, druid2024(2)).eligible).toBe(true);
    expect(blockingKinds(crab!, druid(2))).toEqual(["swimSpeedLocked"]);
  });

  it("перелік 2024 росте з рівнем і складається лише зі звірів", () => {
    const atTwo = findAvailableForms(catalog2024, druid2024(2));
    const atFour = findAvailableForms(catalog2024, druid2024(4));
    const atEight = findAvailableForms(catalog2024, druid2024(8));

    expect([atTwo.length, atFour.length, atEight.length]).toEqual([39, 46, 63]);
    expect(atTwo.every((form) => form.type.trim().toLowerCase() === "звір")).toBe(true);
    expect(atTwo.some((form) => form.flySpeed !== null)).toBe(false);
  });

  /// Коло місяця 2 рівня не існує в 2024, тож і перелік на 2 рівні той самий; розходяться вони
  /// рівно з 3-го, коли підклас нарешті зʼявляється.
  it("коло розширює перелік 2024 не раніше 3 рівня", () => {
    expect(findAvailableForms(catalog2024, druid2024(2, true))).toHaveLength(39);
    expect(findAvailableForms(catalog2024, druid2024(4, true))).toHaveLength(54);
  });
});

describe("вибір із реального каталогу 2014", () => {
  const catalog = getAllCreatures("RULES_2014");

  /// Лазання не обмежене в жодній редакції — ведмідь із каталогу це доводить даними, а не
  /// рукописним літералом.
  it("лазіння форму не ріже — Бурий ведмідь доступний друїду Місяця 2 рівня", () => {
    const bear = catalog.find((creature) => creature.nameEng === "Brown Bear");

    expect(bear?.climbSpeed).toBe(30);
    expect(findWildshapeEligibility(bear!, druid(2, true)).eligible).toBe(true);
  });

  it("друїд 2 рівня отримує непорожній перелік, і в ньому лише звірі без польоту й плавання", () => {
    const forms = findAvailableForms(catalog, druid(2));

    expect(forms.length).toBeGreaterThan(0);
    expect(forms.every((form) => form.type.trim().toLowerCase() === "звір")).toBe(true);
    expect(forms.some((form) => form.flySpeed !== null)).toBe(false);
    expect(forms.some((form) => form.swimSpeed !== null)).toBe(false);
  });

  it("перелік росте з рівнем, а не звужується", () => {
    const atTwo = findAvailableForms(catalog, druid(2)).length;
    const atFour = findAvailableForms(catalog, druid(4)).length;
    const atEight = findAvailableForms(catalog, druid(8)).length;

    expect(atFour).toBeGreaterThan(atTwo);
    expect(atEight).toBeGreaterThan(atFour);
  });

  it("вовк є в переліку друїда 2 рівня — класична форма з підручника", () => {
    const forms = findAvailableForms(catalog, druid(2));

    expect(forms.some((form) => form.nameEng === "Wolf")).toBe(true);
  });
});

/// Статблоки прикликання — «Дух звіра», «Первісний супутник» і подібні — типом звірі, але КР у
/// них немає, а швидкість умовна. До KR24.1 перші відхилялися брехливою причиною, а другі
/// вважалися одночасно літаючими й плаваючими.
describe("статблоки прикликання в каталозі", () => {
  const CATALOGS = ["RULES_2014", "RULES_2024"] as const;

  it("«Дух звіра» не вважається безумовно літаючим у жодній редакції", () => {
    for (const ruleset of CATALOGS) {
      const spirit = getAllCreatures(ruleset).find((creature) => creature.nameEng === "Bestial Spirit");

      expect(spirit?.hasConditionalSpeed).toBe(true);
      expect(spirit?.flySpeed).toBeNull();
      expect(spirit?.swimSpeed).toBeNull();
      expect(blockingKinds(spirit!, druid(8, true))).toEqual(["noChallengeRating"]);
    }
  });

  it("девʼять звірів без КР відхиляються причиною «немає показника небезпеки»", () => {
    const withoutChallenge = CATALOGS.flatMap((ruleset) =>
      getAllCreatures(ruleset).filter(
        (creature) =>
          creature.type.trim().toLowerCase() === "звір" && parseChallengeRating(creature.challenge) === null
      )
    );

    expect(withoutChallenge).toHaveLength(9);
    for (const creature of withoutChallenge) {
      expect(blockingKinds(creature, druid(20, true))).toEqual(["noChallengeRating"]);
    }
  });
});

describe("характеристики й КБ статблока", () => {
  it("читає значення характеристики, а модифікатор у дужках лишає осторонь", () => {
    expect(parseAbilityScore("16 (+3)")).toBe(16);
    expect(parseAbilityScore("7 (-2)")).toBe(7);
    expect(parseAbilityScore("")).toBeNull();
    expect(parseAbilityScore("невідомо")).toBeNull();
  });

  it("читає КБ разом із його джерелом у дужках", () => {
    expect(parseArmorClass("11 (природний обладунок)")).toBe(11);
    expect(parseArmorClass("15")).toBe(15);
    expect(parseArmorClass("11 + рівень чарунку (природний обладунок)")).toBe(11);
    expect(parseArmorClass("")).toBeNull();
    expect(parseArmorClass("як у власника")).toBeNull();
  });

  it.each(["RULES_2014", "RULES_2024"] as const)("увесь каталог %s читається обома парсерами", (ruleset) => {
    const unreadable = getAllCreatures(ruleset).filter(
      (creature) => parseArmorClass(creature.ac) === null || parseAbilityScore(creature.strength) === null
    );

    expect(unreadable.map((creature) => creature.name)).toEqual([]);
  });
});

describe("хіти у звіриній формі", () => {
  it("читає хіти зі статблока", () => {
    expect(parseCreatureHitPoints("34 (4к10 + 12)")).toBe(34);
    expect(parseCreatureHitPoints("11 (2к8 + 2)")).toBe(11);
    expect(parseCreatureHitPoints("")).toBeNull();
  });

  it("шкода менша за хіти звіра лишає персонажа у формі й не чіпає його хітів", () => {
    const outcome = applyDamageInBeastForm({ beastCurrent: 34, beastMax: 34, persCurrent: 27 }, 10);

    expect(outcome).toEqual({ beastCurrent: 24, persCurrent: 27, reverted: false, carriedOver: 0 });
  });

  /// Ключове правило 2014: «якщо ви повертаєтесь через падіння до 0 хітів, надлишок шкоди
  /// переноситься на вашу звичайну форму».
  it("надлишок переливається в хіти персонажа й викидає з форми", () => {
    const outcome = applyDamageInBeastForm({ beastCurrent: 8, beastMax: 34, persCurrent: 27 }, 20);

    expect(outcome).toEqual({ beastCurrent: 0, persCurrent: 15, reverted: true, carriedOver: 12 });
  });

  it("шкода рівно в хіти звіра викидає з форми без переливу", () => {
    const outcome = applyDamageInBeastForm({ beastCurrent: 8, beastMax: 34, persCurrent: 27 }, 8);

    expect(outcome).toEqual({ beastCurrent: 0, persCurrent: 27, reverted: true, carriedOver: 0 });
  });

  it("перелив не заганяє персонажа нижче нуля", () => {
    const outcome = applyDamageInBeastForm({ beastCurrent: 1, beastMax: 34, persCurrent: 3 }, 99);

    expect(outcome.persCurrent).toBe(0);
    expect(outcome.reverted).toBe(true);
  });

  it("зцілення лікує звіра й не перевищує його максимуму", () => {
    expect(applyHealingInBeastForm({ beastCurrent: 10, beastMax: 34, persCurrent: 27 }, 8)).toBe(18);
    expect(applyHealingInBeastForm({ beastCurrent: 30, beastMax: 34, persCurrent: 27 }, 99)).toBe(34);
  });

  it("нульова й відʼємна шкода нічого не змінює", () => {
    const state = { beastCurrent: 20, beastMax: 34, persCurrent: 27 };

    expect(applyDamageInBeastForm(state, 0).beastCurrent).toBe(20);
    expect(applyDamageInBeastForm(state, -5).beastCurrent).toBe(20);
    expect(applyDamageInBeastForm(state, 0).reverted).toBe(false);
  });
});
