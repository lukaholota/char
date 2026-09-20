import { describe, expect, it } from "vitest";
import { findAllowedOrderCodes, getBastionFacilityBySlug } from "@/lib/bastionsData";
import { splitOrderCodesByCatalog } from "@/lib/bastion-facility";
import {
  type BastionCharacterProfile,
  BASIC_FACILITY_COSTS,
  BASIC_FACILITY_ENLARGEMENT_COSTS,
  describeBastionLevelUp,
  describeMaintainConflict,
  describeSpecialFacilitySlots,
  describeTurnOrders,
  findTurnOrders,
  findReplacementState,
  findFacilityMatch,
  summarizeFacilities,
  findMissingFreeBasicSpaces,
  findSpecialFacilityLimit,
  isSpecialFacilityAlreadyBuilt,
  findSpecialFacilityUsage,
  findSpellcastingFocuses,
  toBastionFeatureKey,
} from "@/rules/bastions";

function findFacility(slug: string) {
  const facility = getBastionFacilityBySlug(slug);
  if (!facility) throw new Error(`У каталозі KR19.1 немає приміщення ${slug}`);
  return facility;
}

function buildProfile(overrides: Partial<BastionCharacterProfile> = {}): BastionCharacterProfile {
  return {
    characterLevel: 9,
    spellcastingFocuses: [],
    featureKeys: [],
    skillProficiencies: [],
    hasAnySkillExpertise: false,
    ...overrides,
  };
}

function buildCaster(className: string, subclassName: string | null = null) {
  return buildProfile({
    spellcastingFocuses: findSpellcastingFocuses([{ className, subclassName }]),
  });
}

function findStatus(slug: string, profile: BastionCharacterProfile) {
  return findFacilityMatch(findFacility(slug), profile).status;
}

describe("відповідність приміщення персонажу", () => {
  it("Містичний кабінет доступний чарівнику й барду, але не варвару", () => {
    expect(findStatus("arcane-study", buildCaster("WIZARD_2024"))).toBe("met");
    expect(findStatus("arcane-study", buildCaster("BARD_2024"))).toBe("met");
    expect(findStatus("arcane-study", buildCaster("BARBARIAN_2024"))).toBe("unmet");
  });

  it("Святилище доступне жерцю й друїду, але не чарівнику", () => {
    expect(findStatus("sanctuary", buildCaster("CLERIC_2024"))).toBe("met");
    expect(findStatus("sanctuary", buildCaster("DRUID_2024"))).toBe("met");
    expect(findStatus("sanctuary", buildCaster("WIZARD_2024"))).toBe("unmet");
  });

  it("Кузня артифісера питає саме ремісничі інструменти, і барду їх не досить", () => {
    expect(findStatus("artificers-forge", buildCaster("ARTIFICER_2024"))).toBe("met");
    expect(findStatus("artificers-forge", buildCaster("BARD_2024"))).toBe("unmet");
  });

  it("підкласи-чаклуни воїна й розбійника рахуються як містичне фокусування", () => {
    expect(findStatus("arcane-study", buildCaster("FIGHTER_2024", "ELDRITCH_KNIGHT"))).toBe("met");
    expect(findStatus("arcane-study", buildCaster("ROGUE_2024", "ARCANE_TRICKSTER"))).toBe("met");
    expect(findStatus("arcane-study", buildCaster("FIGHTER_2024", "CHAMPION"))).toBe("unmet");
  });

  it("Штабна кімната бере і Бойовий стиль, і Захист без обладунків — зокрема монаха-мультикласу", () => {
    const fighter = buildProfile({ featureKeys: [toBastionFeatureKey("Fighter: Fighting Style (2024)")] });
    const monkMulticlass = buildProfile({
      featureKeys: [toBastionFeatureKey("Monk: Unarmored Defense (2024)")],
    });

    expect(findStatus("war-room", fighter)).toBe("met");
    expect(findStatus("war-room", monkMulticlass)).toBe("met");
    expect(findStatus("war-room", buildProfile())).toBe("unmet");
  });

  it("Лазарет питає володіння Медициною, Гільдійський дім — експертизу в будь-якій навичці", () => {
    expect(findStatus("infirmary", buildProfile({ skillProficiencies: ["MEDICINE"] }))).toBe("met");
    expect(findStatus("infirmary", buildProfile({ skillProficiencies: ["STEALTH"] }))).toBe("unmet");
    expect(findStatus("guildhall", buildProfile({ hasAnySkillExpertise: true }))).toBe("met");
    expect(findStatus("guildhall", buildProfile())).toBe("unmet");
  });

  it("членство й слава дають «залежить від кампанії», а не «не відповідає»", () => {
    expect(findStatus("harper-hideout", buildProfile())).toBe("campaign");
    expect(findStatus("dragonmark-outpost", buildProfile())).toBe("campaign");
  });

  it("непройдена перевірна вимога важить більше за незнану: некрополь варвару — «не відповідає»", () => {
    expect(findStatus("red-wizard-necropolis", buildCaster("WIZARD_2024"))).toBe("campaign");
    expect(findStatus("red-wizard-necropolis", buildCaster("BARBARIAN_2024"))).toBe("unmet");
  });

  /// У корпусі DMG 2024 такої групи немає — членство й перевірні вимоги там завжди в різних
  /// групах. Правило все одно потрібне: «або членство, або Медицина» з наявною Медициною — це
  /// «відповідає», а не «залежить від кампанії».
  it("у межах однієї групи пройдена вимога важить більше за незнану", () => {
    const eitherOr = {
      facilityType: "special" as const,
      level: 5,
      prerequisite: {
        allOf: [
          [
            { kind: "membership" as const, organizationEng: "Harpers" },
            { kind: "skillProficiency" as const, skillEng: "medicine" },
          ],
        ],
      },
    };

    expect(findFacilityMatch(eitherOr, buildProfile({ skillProficiencies: ["MEDICINE"] })).status).toBe("met");
    expect(findFacilityMatch(eitherOr, buildProfile()).status).toBe("campaign");
  });

  it("приміщення без передумов відповідає всім", () => {
    expect(findStatus("bedroom", buildProfile())).toBe("met");
    expect(findStatus("greenhouse", buildProfile())).toBe("met");
  });

  it("рівень приміщення показується як перевищення, а не як провалена передумова", () => {
    const level5 = buildProfile({ characterLevel: 5 });
    const armory = findFacilityMatch(findFacility("armory"), level5);

    expect(armory.isSpecial).toBe(true);
    expect(armory.isAboveCharacterLevel).toBe(findFacility("armory").level! > 5);
    expect(findFacilityMatch(findFacility("bedroom"), level5).isAboveCharacterLevel).toBe(false);
  });
});

describe("ліміт спеціальних приміщень", () => {
  it("рахується від рівня персонажа за таблицею 5 / 9 / 13 / 17", () => {
    expect([4, 5, 8, 9, 12, 13, 16, 17, 20].map(findSpecialFacilityLimit)).toEqual([
      0, 2, 2, 4, 4, 5, 5, 6, 6,
    ]);
  });

  it("перевищення показується лічильником, а не забороною", () => {
    expect(findSpecialFacilityUsage({ characterLevel: 5, used: 3 })).toEqual({
      used: 3,
      limit: 2,
      isOverLimit: true,
    });
    expect(findSpecialFacilityUsage({ characterLevel: 9, used: 3 }).isOverLimit).toBe(false);
  });
});

describe("наказ, які каталог дає приміщенню — KR19.4", () => {
  /// KR31.15 (L14-bastions-08): «Утримання» віддається всьому бастіону, а не приміщенню.
  it("приміщення отримує лише накази з каталогу, без «Утримання»", () => {
    const smithy = findFacility("smithy");
    expect(smithy.orders).toEqual(["craft"]);
    expect(findAllowedOrderCodes(smithy)).toEqual(["CRAFT"]);
  });

  it("базове приміщення без наказів у каталозі наказів не має", () => {
    const bedroom = findFacility("bedroom");
    expect(bedroom.orders).toEqual([]);
    expect(findAllowedOrderCodes(bedroom)).toEqual([]);
  });
});

describe("назва фічі з бази зводиться до назви з передумови", () => {
  it("знімає клас-префікс і хвіст у дужках", () => {
    expect(toBastionFeatureKey("Fighter: Fighting Style (2024)")).toBe("fighting style");
    expect(toBastionFeatureKey("Monk: Unarmored Defense (2024)")).toBe("unarmored defense");
    expect(toBastionFeatureKey("Unarmored Defense (Barbarian)")).toBe("unarmored defense");
    expect(toBastionFeatureKey("Fighting Style")).toBe("fighting style");
  });
});

describe("KR31.15 — базові приміщення й повтори (L14-bastions-01, L14-bastions-05)", () => {
  it("порожній бастіон ще чекає обидва безкоштовні — тісне й просторе", () => {
    expect(findMissingFreeBasicSpaces([])).toEqual(["cramped", "roomy"]);
  });

  it("одне тісне закриває лише тісне, два тісні просторого не замінюють", () => {
    expect(findMissingFreeBasicSpaces(["cramped"])).toEqual(["roomy"]);
    expect(findMissingFreeBasicSpaces(["cramped", "cramped"])).toEqual(["roomy"]);
  });

  it("тісне й просторе — стартова пара повна, розлоге поруч нічого не міняє", () => {
    expect(findMissingFreeBasicSpaces(["roomy", "vast", "cramped"])).toEqual([]);
  });

  it("вартість із таблиць книги", () => {
    expect(BASIC_FACILITY_COSTS).toEqual([
      { space: "cramped", gold: 500, days: 20 },
      { space: "roomy", gold: 1000, days: 45 },
      { space: "vast", gold: 3000, days: 125 },
    ]);
    expect(BASIC_FACILITY_ENLARGEMENT_COSTS).toEqual([
      { from: "cramped", to: "roomy", gold: 500, days: 25 },
      { from: "roomy", to: "vast", gold: 2000, days: 80 },
    ]);
  });

  it("спеціальне приміщення вдруге — повтор, базове вдруге — ні", () => {
    const special = findFacility("library");
    const basic = findFacility("bedroom");
    expect(isSpecialFacilityAlreadyBuilt(special, [special.slug])).toBe(true);
    expect(isSpecialFacilityAlreadyBuilt(special, ["bedroom"])).toBe(false);
    expect(isSpecialFacilityAlreadyBuilt(basic, ["bedroom"])).toBe(false);
  });
});

describe("KR31.15 — «Утримання» на весь бастіон (L14-bastions-08)", () => {
  it("без Утримання або без наказів у приміщеннях попереджати нема про що", () => {
    expect(describeMaintainConflict({ isMaintaining: false, orderedFacilityCount: 3 })).toBeNull();
    expect(describeMaintainConflict({ isMaintaining: true, orderedFacilityCount: 0 })).toBeNull();
  });

  it("Утримання разом із наказами приміщень називає, скільки їх", () => {
    expect(describeMaintainConflict({ isMaintaining: true, orderedFacilityCount: 2 })).toBe(
      "Бастіон на Утриманні: цього ходу інші накази не віддаються, а приміщень із наказом — 2."
    );
  });
});

describe("KR31.15 — бастіон на підвищенні рівня (L14-bastions-03)", () => {
  it("8 → 9 з бастіоном: два нові спеціальні приміщення й право заміни", () => {
    expect(describeBastionLevelUp({ ruleset: "RULES_2024", fromLevel: 8, toLevel: 9, hasBastion: true })).toEqual([
      "Бастіон отримує нові спеціальні приміщення: +2, разом до 4. Оберіть їх на сторінці бастіону.",
      "На новому рівні можна замінити одне спеціальне приміщення бастіону іншим, якому персонаж відповідає.",
    ]);
  });

  it("6 → 7 з бастіоном: лише право заміни; 12 → 13 — одне нове", () => {
    expect(describeBastionLevelUp({ ruleset: "RULES_2024", fromLevel: 6, toLevel: 7, hasBastion: true })).toHaveLength(1);
    expect(describeBastionLevelUp({ ruleset: "RULES_2024", fromLevel: 12, toLevel: 13, hasBastion: true })[0]).toContain("+1, разом до 5");
  });

  it("без бастіону говорить лише на переході до 5-го рівня, а 2014 мовчить", () => {
    expect(describeBastionLevelUp({ ruleset: "RULES_2024", fromLevel: 4, toLevel: 5, hasBastion: false })).toEqual([
      "З 5-го рівня персонаж може здобути бастіон — його можна створити на слайді Рис.",
    ]);
    expect(describeBastionLevelUp({ ruleset: "RULES_2024", fromLevel: 5, toLevel: 6, hasBastion: false })).toEqual([]);
    expect(describeBastionLevelUp({ ruleset: "RULES_2024", fromLevel: 3, toLevel: 4, hasBastion: false })).toEqual([]);
    expect(describeBastionLevelUp({ ruleset: "RULES_2014", fromLevel: 8, toLevel: 9, hasBastion: true })).toEqual([]);
  });

  it("заміна лишає розмір і наказ, коли новий каталог їх дозволяє, інакше бере перший розмір і знімає наказ", () => {
    expect(findReplacementState({ currentSpace: "vast", currentOrder: "CRAFT", allowedSpaces: ["roomy", "vast"], allowedOrders: ["CRAFT"] }))
      .toEqual({ space: "vast", keepsOrder: true });
    expect(findReplacementState({ currentSpace: "vast", currentOrder: "CRAFT", allowedSpaces: ["roomy"], allowedOrders: ["RESEARCH"] }))
      .toEqual({ space: "roomy", keepsOrder: false });
    expect(findReplacementState({ currentSpace: "roomy", currentOrder: null, allowedSpaces: ["roomy"], allowedOrders: [] }))
      .toEqual({ space: "roomy", keepsOrder: false });
  });
});

describe("KR19.6 — подача бастіону: слоти спеціальних, накази ходу", () => {
  const slotsAt = (characterLevel: number, used: number) =>
    describeSpecialFacilitySlots({ ...findSpecialFacilityUsage({ characterLevel, used }), characterLevel });

  it("до 5-го рівня замість «0 / 0» — пояснення, і додати все одно можна", () => {
    expect(slotsAt(1, 0)).toEqual({
      counter: null,
      hint: "За стандартними правилами спеціальні приміщення відкриваються на 5-му рівні. Додати їх можна й зараз — як домашнє правило.",
      isWarning: false,
    });
    expect(slotsAt(3, 1)).toMatchObject({ counter: "1", isWarning: true });
  });

  it("вільні, повні й понад ліміт слоти кажуть різне", () => {
    expect(slotsAt(5, 1)).toEqual({ counter: "1 / 2", hint: "Можна додати ще 1", isWarning: false });
    expect(slotsAt(5, 2)).toEqual({ counter: "2 / 2", hint: "Наступне — на 9-му рівні", isWarning: false });
    expect(slotsAt(17, 6)).toEqual({ counter: "6 / 6", hint: null, isWarning: false });
    expect(slotsAt(9, 5)).toEqual({ counter: "5 / 4", hint: "За стандартними правилами на цьому рівні їх 4", isWarning: true });
  });

  it("накази ходу — лише приміщення з наказом; заготовка журналу починається з Утримання", () => {
    const orders = findTurnOrders([
      { name: "Бібліотека", slug: "library", currentOrder: "RESEARCH" },
      { name: "Спальня", slug: "bedroom", currentOrder: null },
      { name: null, slug: "lost-room", currentOrder: "TRADE" },
    ]);

    expect(orders).toEqual([
      { facilityName: "Бібліотека", orderCode: "RESEARCH" },
      { facilityName: "lost-room", orderCode: "TRADE" },
    ]);
    expect(describeTurnOrders({ isMaintaining: true, orders })).toBe("Утримання\nБібліотека — Дослідження\nlost-room — Торгівля");
  });

  it("каталожний наказ спеціального приміщення стоїть окремо від решти", () => {
    expect(splitOrderCodesByCatalog(findAllowedOrderCodes(findFacility("library")))).toEqual({
      catalog: ["RESEARCH"],
      other: ["CRAFT", "EMPOWER", "HARVEST", "RECRUIT", "TRADE"],
    });
    expect(splitOrderCodesByCatalog([]).catalog).toEqual([]);
  });
});

describe("KR19.6 — зведення в шапці бастіону", () => {
  it("рахує спеціальні, базові й захисників; зниклий із каталогу рядок іде до спеціальних", () => {
    const special = { isSpecial: true } as const;
    const basic = { isSpecial: false } as const;

    expect(
      summarizeFacilities([
        { match: { ...special }, defenders: 8 },
        { match: { ...special }, defenders: 0 },
        { match: { ...basic }, defenders: 2 },
        { match: null, defenders: 1 },
      ])
    ).toEqual({ specialCount: 3, basicCount: 1, defenders: 11 });
    expect(summarizeFacilities([])).toEqual({ specialCount: 0, basicCount: 0, defenders: 0 });
  });
});
