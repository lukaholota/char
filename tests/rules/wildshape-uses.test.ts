import { describe, expect, it } from "vitest";
import {
  describeUseShortfall,
  findFormFeature,
  findFormPrice,
  hasUnlimitedWildshapeUses,
} from "@/rules/wildshape-uses";

/// KR24.5. Пул `WILD_SHAPE` носять шість фіч, і лише дві з них перетворюють. Тут перевіряється
/// саме те, чого не видно на екрані: за вхід платить та фіча, чиєю формою став персонаж, а не
/// перша-ліпша з пулу — інакше елементаль Кола місяця коштував би одне використання замість двох.

const WILD_SHAPE = { featureId: 17928, engName: "Wild Shape", usePrice: 1 };
const ELEMENTAL_WILD_SHAPE = { featureId: 8710, engName: "Elemental Wild Shape", usePrice: 2 };
const STARRY_FORM = { featureId: 8723, engName: "Starry Form", usePrice: 1 };
const SPIRIT_TOTEM = { featureId: 8713, engName: "Spirit Totem", usePrice: 1 };

const MOON_DRUID_FEATURES = [ELEMENTAL_WILD_SHAPE, SPIRIT_TOTEM, WILD_SHAPE];

describe("яка фіча платить за вхід у форму", () => {
  it("за звіра платить базова Дика форма, навіть коли поруч дорожча фіча пулу", () => {
    expect(findFormFeature(MOON_DRUID_FEATURES, "Звір")).toBe(WILD_SHAPE);
  });

  it("за елементаля платить Дика форма елементаля", () => {
    expect(findFormFeature(MOON_DRUID_FEATURES, "Елементаль")).toBe(ELEMENTAL_WILD_SHAPE);
  });

  /// Ці фічі теж носять `usesPoolKey: "WILD_SHAPE"`, але не перетворюють — вони лишаються на
  /// ручному лічильнику слайда Рис і платити за форму не можуть ніколи.
  it("фіча, яка пул лише витрачає, платником не стає", () => {
    expect(findFormFeature([STARRY_FORM, SPIRIT_TOTEM], "Звір")).toBeNull();
  });

  it("персонаж без фічі елементальної форми за елементаля не платить нічим", () => {
    expect(findFormFeature([WILD_SHAPE], "Елементаль")).toBeNull();
  });

  it("тип, на який Дика форма не перетворює, платника не має", () => {
    expect(findFormFeature(MOON_DRUID_FEATURES, "Дракон")).toBeNull();
  });
});

describe("ціна читається з даних", () => {
  it("елементальна форма коштує два використання", () => {
    expect(findFormPrice(ELEMENTAL_WILD_SHAPE)).toBe(2);
  });

  it("звірина форма коштує одне", () => {
    expect(findFormPrice(WILD_SHAPE)).toBe(1);
  });

  /// Фіча без ціни в даних коштує використання, а не нуль: безкоштовного перевтілення в 2014
  /// немає, і мовчазний нуль зробив би лічильник вічним.
  it("фіча без `usePrice` коштує одне використання", () => {
    expect(findFormPrice({ featureId: 1, engName: "Wild Shape", usePrice: null })).toBe(1);
    expect(findFormPrice(null)).toBe(1);
  });
});

describe("вхід без залишку — попередження, не заборона", () => {
  it("попередження називає і потрібне число, і залишок", () => {
    expect(describeUseShortfall({ price: 2, remaining: 1 })).toBe(
      "Використань Дикої форми бракує: потрібно 2, лишилося 1. Перевтілення записане — вирішує майстер за столом."
    );
  });

  it("порожній пул попереджає, а не мовчить", () => {
    expect(describeUseShortfall({ price: 1, remaining: 0 })).toContain("потрібно 1, лишилося 0");
  });

  it("залишку вистачає — попередження немає", () => {
    expect(describeUseShortfall({ price: 2, remaining: 2 })).toBeNull();
    expect(describeUseShortfall({ price: 1, remaining: 2 })).toBeNull();
  });
});

/// KR31.12 / L13-wildshape-08. Лист показував «2 / 2» друїду 20 рівня 2014, хоч Архідруїд знімає
/// межу, і вхід у форму списував використання.
describe("необмежена Дика форма Архідруїда", () => {
  it("2014 знімає межу на 20 рівні друїда", () => {
    expect(hasUnlimitedWildshapeUses({ ruleset: "RULES_2014", druidLevel: 20 })).toBe(true);
  });

  it("до 20 рівня межа лишається", () => {
    expect(hasUnlimitedWildshapeUses({ ruleset: "RULES_2014", druidLevel: 19 })).toBe(false);
  });

  it("рахується рівень друїда, а не персонажа: Друїд 17 / Воїн 3 межі не знімає", () => {
    expect(hasUnlimitedWildshapeUses({ ruleset: "RULES_2014", druidLevel: 17 })).toBe(false);
  });

  it("2024 такого не дає — його Архідруїд повертає одне використання, а не знімає межу", () => {
    expect(hasUnlimitedWildshapeUses({ ruleset: "RULES_2024", druidLevel: 20 })).toBe(false);
  });
});
