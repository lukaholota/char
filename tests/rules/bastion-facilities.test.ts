import { describe, expect, it } from "vitest";
import { findAllowedOrderCodes, getBastionFacilityBySlug } from "@/lib/bastionsData";
import {
  type BastionCharacterProfile,
  findFacilityMatch,
  findSpecialFacilityLimit,
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
  it("MAINTAIN доступний завжди, специфічні наказ — лише за каталогом", () => {
    const smithy = findFacility("smithy");
    expect(smithy.orders).toEqual(["craft"]);
    expect(findAllowedOrderCodes(smithy)).toEqual(["CRAFT", "MAINTAIN"]);
  });

  it("базове приміщення без наказів у каталозі все одно отримує MAINTAIN", () => {
    const bedroom = findFacility("bedroom");
    expect(bedroom.orders).toEqual([]);
    expect(findAllowedOrderCodes(bedroom)).toEqual(["MAINTAIN"]);
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
