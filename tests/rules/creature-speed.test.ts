import { describe, expect, it } from "vitest";
import { getAllCreatures } from "@/lib/bestiaryData";
import { findUnparsedSpeedSegments, parseCreatureSpeeds } from "@/rules/creature-speed";

/// KR24.1. Швидкість у статблоці — вільний рядок, і доки правила шукали в ньому підрядок,
/// «Дух звіра» з трьома взаємовиключними режимами вважався одночасно літаючим і плаваючим.
/// Тут закріплено обидві половини: розбір рядка на числа й те, що умовний режим числом не стає.

const EDITIONS = ["RULES_2014", "RULES_2024"] as const;

const nothing = {
  walkSpeed: null,
  flySpeed: null,
  swimSpeed: null,
  climbSpeed: null,
  burrowSpeed: null,
  hasConditionalSpeed: false,
};

describe("швидкості статблока як числа", () => {
  it("читає базову наземну швидкість", () => {
    expect(parseCreatureSpeeds("40 фт.")).toEqual({ ...nothing, walkSpeed: 40 });
  });

  it("читає всі пʼять режимів у їхніх ратифікованих назвах", () => {
    expect(parseCreatureSpeeds("10 фт., політ 80 фт.")).toEqual({ ...nothing, walkSpeed: 10, flySpeed: 80 });
    expect(parseCreatureSpeeds("0 фт., плавання 40 фт.")).toEqual({ ...nothing, walkSpeed: 0, swimSpeed: 40 });
    expect(parseCreatureSpeeds("40 фт., лазіння 30 фт.")).toEqual({ ...nothing, walkSpeed: 40, climbSpeed: 30 });
    expect(parseCreatureSpeeds("30 фт., риття 30 фт.")).toEqual({ ...nothing, walkSpeed: 30, burrowSpeed: 30 });
  });

  it("нуль — це швидкість нуль, а не її відсутність", () => {
    expect(parseCreatureSpeeds("0 фт., плавання 40 фт.").walkSpeed).toBe(0);
  });

  it("паріння й приріст від чарунку швидкості не звужують", () => {
    expect(parseCreatureSpeeds("політ 50 фт. (паріння)")).toEqual({ ...nothing, flySpeed: 50 });
    expect(parseCreatureSpeeds("політ 30 фт. (1+ рівень чарунку)")).toEqual({ ...nothing, flySpeed: 30 });
  });

  it("порожнє й сміття дають порожній набір, а не нулі", () => {
    expect(parseCreatureSpeeds("")).toEqual(nothing);
    expect(parseCreatureSpeeds("казна-що")).toEqual(nothing);
  });
});

describe("умовні швидкості", () => {
  /// Той самий запис, через який відкрилася O24: три взаємовиключні режими в одному рядку.
  it("«або» між режимами не дає жодного з них як безумовний", () => {
    expect(
      parseCreatureSpeeds(
        "30 фт., лазіння 30 фт. (Наземний) або плавання 30 фт. (Водний) або політ 60 фт. (Повітряний)"
      )
    ).toEqual({ ...nothing, walkSpeed: 30, hasConditionalSpeed: true });
  });

  it("дужка-умова прибирає режим так само, як «або»", () => {
    expect(
      parseCreatureSpeeds("40 фт.; лазіння 40 фт. (тільки Наземний); політ 40 фт. (тільки Повітряний)")
    ).toEqual({ ...nothing, walkSpeed: 40, hasConditionalSpeed: true });
    expect(parseCreatureSpeeds("20 фт., лазіння або політ 20 фт. (на розсуд Майстра)")).toEqual({
      ...nothing,
      walkSpeed: 20,
      hasConditionalSpeed: true,
    });
  });

  /// Тут зовнішнє число безумовне — воно чинне в будь-якій подобі, а дужка лише додає іншу.
  it("подоба перевертня лишає базову швидкість, але позначає запис умовним", () => {
    expect(parseCreatureSpeeds("30 фт. (40 фт. у подобі вовка)")).toEqual({
      ...nothing,
      walkSpeed: 30,
      hasConditionalSpeed: true,
    });
    expect(parseCreatureSpeeds("15 фт. (30 фт. під час котіння, 60 фт. з гори)")).toEqual({
      ...nothing,
      walkSpeed: 15,
      hasConditionalSpeed: true,
    });
  });

  it("кома всередині дужки не розриває сегмент на два", () => {
    expect(parseCreatureSpeeds("40 фт. (30 фт. і плавання 30 фт. у гібридній подобі)").swimSpeed).toBeNull();
  });
});

describe("прогін по обох каталогах", () => {
  it.each(EDITIONS)("не лишає нерозібраних рядків у %s", (ruleset) => {
    const unparsed = getAllCreatures(ruleset)
      .map((creature) => ({ name: creature.name, segments: findUnparsedSpeedSegments(creature.speed) }))
      .filter((entry) => entry.segments.length > 0);

    expect(unparsed).toEqual([]);
  });

  it.each(EDITIONS)("числа в каталозі %s збігаються з розбором його ж рядка", (ruleset) => {
    for (const creature of getAllCreatures(ruleset)) {
      const parsed = parseCreatureSpeeds(creature.speed);

      expect({
        walkSpeed: creature.walkSpeed,
        flySpeed: creature.flySpeed,
        swimSpeed: creature.swimSpeed,
        climbSpeed: creature.climbSpeed,
        burrowSpeed: creature.burrowSpeed,
        hasConditionalSpeed: creature.hasConditionalSpeed,
      }).toEqual(parsed);
    }
  });

  /// Головне, заради чого числа зʼявилися: безумовний режим не береться з рядка, у якому режими
  /// взаємовиключні.
  it.each(EDITIONS)("жоден запис %s не має безумовного режиму разом з «або»", (ruleset) => {
    const lying = getAllCreatures(ruleset).filter(
      (creature) =>
        /\bабо\b/i.test(creature.speed) &&
        (creature.flySpeed !== null || creature.swimSpeed !== null || creature.climbSpeed !== null)
    );

    expect(lying.map((creature) => creature.name)).toEqual([]);
  });
});
