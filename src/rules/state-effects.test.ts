import { describe, expect, it } from "vitest";
import { findD20RollState, listBonusDice, mergeStateEffects } from "./state-effects";
import { collectSpellBuffParts, listSpellBuffKeysFor, doesSpellBuffSurviveShortRest } from "./spell-buffs";
import { clampExhaustionLevel, findExhaustionAfterLongRest, findExhaustionPart } from "./exhaustion";
import { findConcentrationSaveDc, isConcentrationSpell } from "./concentration";

const merge = (...parts: Parameters<typeof mergeStateEffects>[0]) => mergeStateEffects(parts);
const buffs = (keys: string[], ruleset: "RULES_2014" | "RULES_2024" = "RULES_2024") =>
  mergeStateEffects(collectSpellBuffParts(keys, ruleset).map(({ part }) => part));

describe("findD20RollState — режим к20 зі станів", () => {
  const rage = { rollModifiers: [{ mode: "ADVANTAGE" as const, scope: "STR_CHECK" as const, sourceKey: "Rage" }] };
  const tired = { rollModifiers: [{ mode: "DISADVANTAGE" as const, scope: "ABILITY_CHECK" as const, sourceKey: "EXHAUSTION" }] };

  it("Лють дає перевагу на перевірку Сили, але не Спритності й не на ряткидок", () => {
    const effects = merge(rage);
    expect(findD20RollState(effects, { kind: "check", ability: "STR" }).mode).toBe("ADVANTAGE");
    expect(findD20RollState(effects, { kind: "check", ability: "DEX" }).mode).toBe("NORMAL");
    expect(findD20RollState(effects, { kind: "save", ability: "STR" }).mode).toBe("NORMAL");
  });

  it("перевага й перешкода гасяться, джерела обох лишаються для підпису", () => {
    expect(findD20RollState(merge(rage, tired), { kind: "check", ability: "STR" })).toEqual({
      mode: "NORMAL",
      advantageSources: ["Rage"],
      disadvantageSources: ["EXHAUSTION"],
    });
  });

  it("два джерела переваги дають одну перевагу", () => {
    const largeForm = { rollModifiers: [{ mode: "ADVANTAGE" as const, scope: "STR_CHECK" as const, sourceKey: "Large Form" }] };
    expect(findD20RollState(merge(rage, largeForm), { kind: "check", ability: "STR" })).toMatchObject({ mode: "ADVANTAGE", advantageSources: ["Rage", "Large Form"] });
  });

  it("War Caster дає перевагу лише на ряткидок концентрації", () => {
    const warCaster = merge({ rollModifiers: [{ mode: "ADVANTAGE", scope: "CONCENTRATION_SAVE", sourceKey: "WAR_CASTER" }] });
    expect(findD20RollState(warCaster, { kind: "save", ability: "CON", isConcentration: true }).mode).toBe("ADVANTAGE");
    expect(findD20RollState(warCaster, { kind: "save", ability: "CON" }).mode).toBe("NORMAL");
  });

  it("без станів — звичайний кидок", () => {
    expect(findD20RollState(null, { kind: "attack" })).toEqual({ mode: "NORMAL", advantageSources: [], disadvantageSources: [] });
  });
});

describe("mergeStateEffects", () => {
  it("множники швидкості множаться, нижня межа КБ береться найбільша", () => {
    const effects = merge({ speedMultiplier: 2 }, { speedMultiplier: 0.5 }, { armorClassFloor: 16 }, { armorClassFloor: 17 });
    expect(effects).toMatchObject({ speedMultiplier: 1, armorClassFloor: 17 });
  });

  it("порожній список — жодних ефектів", () => {
    expect(mergeStateEffects([])).toBeNull();
  });
});

describe("бафи-заклинання", () => {
  it("Щит віри і Прискорення складаються: КБ +4, швидкість ×2, перевага на ряткидки Спритності", () => {
    const effects = buffs(["SHIELD_OF_FAITH", "HASTE"]);
    expect(effects).toMatchObject({ armorClassBonus: 4, speedMultiplier: 2 });
    expect(findD20RollState(effects, { kind: "save", ability: "DEX" }).mode).toBe("ADVANTAGE");
  });

  it("Благословення додає к4 до атак і ряткидків, але не до перевірок", () => {
    const effects = buffs(["BLESS"]);
    expect(listBonusDice(effects, "ATTACK")).toEqual([{ scope: "ATTACK", sides: 4, sign: 1, sourceKey: "BLESS" }]);
    expect(listBonusDice(effects, "SAVE")).toHaveLength(1);
    expect(listBonusDice(effects, "WEAPON_DAMAGE")).toEqual([]);
  });

  it("Збільшення: +к4 до шкоди зброї і перевага на Силу; Зменшення — навпаки", () => {
    expect(listBonusDice(buffs(["ENLARGE"]), "WEAPON_DAMAGE")[0]).toMatchObject({ sides: 4, sign: 1 });
    expect(listBonusDice(buffs(["REDUCE"]), "WEAPON_DAMAGE")[0]).toMatchObject({ sides: 4, sign: -1 });
    expect(findD20RollState(buffs(["REDUCE"]), { kind: "save", ability: "STR" }).mode).toBe("DISADVANTAGE");
  });

  it("Дубова шкіра: 2014 — щонайменше 16, 2024 — 17", () => {
    expect(buffs(["BARKSKIN"], "RULES_2014")?.armorClassFloor).toBe(16);
    expect(buffs(["BARKSKIN"], "RULES_2024")?.armorClassFloor).toBe(17);
  });

  it("одне заклинання Збільшення/Зменшення дає два бафи, решта — по одному", () => {
    expect(listSpellBuffKeysFor("Enlarge/Reduce")).toEqual(["ENLARGE", "REDUCE"]);
    expect(listSpellBuffKeysFor("Mage Armor")).toEqual(["MAGE_ARMOR"]);
    expect(listSpellBuffKeysFor("Fireball")).toEqual([]);
  });

  it("короткий відпочинок переживає лише Обладунок мага", () => {
    expect(doesSpellBuffSurviveShortRest("MAGE_ARMOR")).toBe(true);
    expect(doesSpellBuffSurviveShortRest("LONGSTRIDER")).toBe(false);
  });

  it("невідомий ключ ігнорується", () => {
    expect(collectSpellBuffParts(["CONCENTRATION", "NOPE"], "RULES_2024")).toEqual([]);
  });
});

describe("виснаження", () => {
  it("2024: −2 до к20 і −5 фт швидкості за рівень", () => {
    expect(findExhaustionPart(3, "RULES_2024")).toMatchObject({ d20Penalty: 6, speedBonus: -15 });
  });

  it("2014: таблиця накопичується — 1: перешкода на перевірки, 2: швидкість ÷2, 3: перешкода на атаки й ряткидки, 4: хіти ÷2, 5: швидкість 0", () => {
    const level1 = mergeStateEffects([findExhaustionPart(1, "RULES_2014")!]);
    expect(findD20RollState(level1, { kind: "check", ability: "DEX" }).mode).toBe("DISADVANTAGE");
    expect(findD20RollState(level1, { kind: "attack" }).mode).toBe("NORMAL");
    expect(level1).toMatchObject({ speedMultiplier: 1, isMaxHpHalved: false });

    const level2 = mergeStateEffects([findExhaustionPart(2, "RULES_2014")!]);
    expect(findD20RollState(level2, { kind: "attack" }).mode).toBe("NORMAL");
    expect(level2?.speedMultiplier).toBe(0.5);

    const level3 = mergeStateEffects([findExhaustionPart(3, "RULES_2014")!]);
    expect(findD20RollState(level3, { kind: "attack" }).mode).toBe("DISADVANTAGE");
    expect(level3).toMatchObject({ speedMultiplier: 0.5, isMaxHpHalved: false, isSpeedZero: false });

    expect(findExhaustionPart(4, "RULES_2014")).toMatchObject({ isMaxHpHalved: true, isSpeedZero: false });
    expect(findExhaustionPart(5, "RULES_2014")).toMatchObject({ isSpeedZero: true });
  });

  it("6-й рівень — смерть в обох редакціях; 0 — нічого", () => {
    expect(findExhaustionPart(6, "RULES_2024")?.marks).toEqual([{ kind: "EXHAUSTION_DEATH" }]);
    expect(findExhaustionPart(6, "RULES_2014")?.marks).toEqual([{ kind: "EXHAUSTION_DEATH" }]);
    expect(findExhaustionPart(0, "RULES_2024")).toBeNull();
  });

  it("довгий відпочинок знімає один рівень, рівень тримається в межах 0–6", () => {
    expect(findExhaustionAfterLongRest(3)).toBe(2);
    expect(findExhaustionAfterLongRest(0)).toBe(0);
    expect(clampExhaustionLevel(9)).toBe(6);
    expect(clampExhaustionLevel(-2)).toBe(0);
  });
});

describe("концентрація", () => {
  it("СК — 10 або половина шкоди вниз, що більше", () => {
    expect(findConcentrationSaveDc(7, "RULES_2014")).toBe(10);
    expect(findConcentrationSaveDc(25, "RULES_2014")).toBe(12);
  });

  it("2024 обмежує СК тридцяттю, 2014 — ні", () => {
    expect(findConcentrationSaveDc(90, "RULES_2024")).toBe(30);
    expect(findConcentrationSaveDc(90, "RULES_2014")).toBe(45);
  });

  it("у базі концентрація — рядок «так»", () => {
    expect(isConcentrationSpell("так")).toBe(true);
    expect(isConcentrationSpell("ні")).toBe(false);
    expect(isConcentrationSpell(null)).toBe(false);
  });
});
