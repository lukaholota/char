import { describe, expect, it } from "vitest";
import {
  canActivateFeatureState,
  collectFeatureStateParts,
  doesFeatureStateEndConcentration,
  findRageDamageBonus,
  isToggleableFeature,
  listStatesEndingWith,
} from "./feature-states";
import { mergeStateEffects } from "./state-effects";

const RAGE_2024 = "Barbarian: Rage (2024)";
const PRIMAL_KNOWLEDGE_2024 = "Barbarian: Primal Knowledge (2024)";
const LARGE_FORM = "Goliath: Large Form (2024)";
const FRENZY_2024 = "Path of the Berserker: Frenzy (2024)";
const BLADESONG_2024 = "Bladesinger: Bladesong (2024)";

const effectsOf = (
  active: string[],
  owned: string[],
  overrides: { barbarianLevel?: number; intelligenceModifier?: number; bloodHunterLevel?: number; wearsHeavyArmor?: boolean } = {},
) =>
  mergeStateEffects(
    collectFeatureStateParts({
      activeFeatureEngNames: active,
      ownedFeatureEngNames: owned,
      barbarianLevel: overrides.barbarianLevel ?? 0,
      intelligenceModifier: overrides.intelligenceModifier ?? 0,
      bloodHunterLevel: overrides.bloodHunterLevel ?? 0,
      wearsHeavyArmor: overrides.wearsHeavyArmor ?? false,
    }).map(({ part }) => part),
  );

describe("isToggleableFeature", () => {
  it("Лють обох редакцій, Велика форма, Міць велетня, Пісня клинка й Шаленство 2014 мають перемикач", () => {
    for (const engName of ["Rage", RAGE_2024, LARGE_FORM, "Giant's Might", "Bladesong", BLADESONG_2024, "Frenzy"]) {
      expect(isToggleableFeature(engName)).toBe(true);
    }
  });

  it("Первісне знання, Шаленство 2024 та решта рис перемикача не мають", () => {
    expect(isToggleableFeature(PRIMAL_KNOWLEDGE_2024)).toBe(false);
    expect(isToggleableFeature(FRENZY_2024)).toBe(false);
    expect(isToggleableFeature("Reckless Attack")).toBe(false);
    expect(isToggleableFeature(null)).toBe(false);
  });
});

describe("collectFeatureStateParts", () => {
  it("без увімкненого стану частин немає", () => {
    expect(effectsOf([], ["Rage"])).toBeNull();
  });

  it("увімкнена риса, якої персонаж уже не має, нічого не дає", () => {
    expect(effectsOf(["Rage"], [])).toBeNull();
  });

  it("частина несе своє джерело — шторка станів показує підсумок кожної", () => {
    const parts = collectFeatureStateParts({ activeFeatureEngNames: ["Rage"], ownedFeatureEngNames: ["Rage"], barbarianLevel: 3, intelligenceModifier: 0, bloodHunterLevel: 0, wearsHeavyArmor: false });
    expect(parts.map(({ sourceKey }) => sourceKey)).toEqual(["Rage"]);
  });

  it("Лють 2014 — опір, перевага на перевірки й ряткидки Сили, бонус шкоди до атак Силою, без заклинань", () => {
    const effects = effectsOf(["Rage"], ["Rage", "Primal Knowledge"], { barbarianLevel: 9 });

    expect(effects).toMatchObject({
      skillAbilityOptions: {},
      strengthAttackDamageBonus: 3,
      damageResistances: ["BLUDGEONING", "PIERCING", "SLASHING"],
      rollModifiers: [
        { mode: "ADVANTAGE", scope: "STR_CHECK", sourceKey: "Rage" },
        { mode: "ADVANTAGE", scope: "STR_SAVE", sourceKey: "Rage" },
      ],
      marks: [{ kind: "NO_SPELLCASTING" }],
    });
  });

  it("Лють 2024 із Первісним знанням дає Силу пʼятьом навичкам, без нього (1–2 рівень) — ні", () => {
    expect(effectsOf([RAGE_2024], [RAGE_2024, PRIMAL_KNOWLEDGE_2024], { barbarianLevel: 7 })?.skillAbilityOptions).toEqual({
      ACROBATICS: "STR",
      INTIMIDATION: "STR",
      PERCEPTION: "STR",
      STEALTH: "STR",
      SURVIVAL: "STR",
    });
    expect(effectsOf([RAGE_2024], [RAGE_2024], { barbarianLevel: 2 })?.skillAbilityOptions).toEqual({});
  });

  it("Велика форма — розмір Великий, +10 швидкості, перевага на перевірки Сили", () => {
    expect(effectsOf([LARGE_FORM], [LARGE_FORM])).toMatchObject({
      speedBonus: 10,
      size: "LARGE",
      rollModifiers: [{ mode: "ADVANTAGE", scope: "STR_CHECK", sourceKey: LARGE_FORM }],
    });
  });

  it("Лють разом із Великою формою: дві переваги на перевірки Сили від двох джерел, одна швидкість +10", () => {
    const effects = effectsOf([RAGE_2024, LARGE_FORM], [RAGE_2024, LARGE_FORM], { barbarianLevel: 5 });

    expect(effects?.rollModifiers.filter((modifier) => modifier.scope === "STR_CHECK").map((modifier) => modifier.sourceKey)).toEqual([RAGE_2024, LARGE_FORM]);
    expect(effects?.speedBonus).toBe(10);
  });
});

describe("Шаленство", () => {
  it("2014 — діє лише в Люті: атака бонусною дією і виснаження наприкінці", () => {
    expect(effectsOf(["Frenzy"], ["Rage", "Frenzy"])).toBeNull();
    expect(effectsOf(["Rage", "Frenzy"], ["Rage", "Frenzy"], { barbarianLevel: 3 })?.marks.map((mark) => mark.kind)).toEqual([
      "NO_SPELLCASTING",
      "FRENZY_ATTACK",
      "FRENZY_EXHAUSTION",
    ]);
  });

  it("2014 — вмикається лише поверх Люті й закінчується разом із нею", () => {
    expect(canActivateFeatureState("Frenzy", [])).toBe(false);
    expect(canActivateFeatureState("Frenzy", ["Rage"])).toBe(true);
    expect(canActivateFeatureState("Rage", [])).toBe(true);
    expect(listStatesEndingWith("Rage")).toEqual(["Frenzy"]);
    expect(listStatesEndingWith("Frenzy")).toEqual([]);
  });

  it("2024 — доповнення Люті: к6 за кожне очко бонусу шкоди", () => {
    expect(effectsOf([RAGE_2024], [RAGE_2024, FRENZY_2024], { barbarianLevel: 9 })?.marks).toContainEqual({ kind: "FRENZY_DAMAGE", dice: 3 });
  });
});

describe("Міць велетня", () => {
  it("Великий розмір, перевага на Силу, к6 на 3-му рівні", () => {
    const effects = effectsOf(["Giant's Might"], ["Giant's Might"]);
    expect(effects?.size).toBe("LARGE");
    expect(effects?.rollModifiers.map((modifier) => modifier.scope)).toEqual(["STR_CHECK", "STR_SAVE"]);
    expect(effects?.marks).toEqual([{ kind: "GIANTS_MIGHT_DAMAGE", die: "d6" }]);
  });

  it("Велика статура дає к8, Рунічний джагернаут — к10 і Величезний розмір", () => {
    expect(effectsOf(["Giant's Might"], ["Giant's Might", "Great Stature"])?.marks).toContainEqual({ kind: "GIANTS_MIGHT_DAMAGE", die: "d8" });
    const juggernaut = effectsOf(["Giant's Might"], ["Giant's Might", "Great Stature", "Runic Juggernaut"]);
    expect(juggernaut?.marks).toContainEqual({ kind: "GIANTS_MIGHT_DAMAGE", die: "d10" });
    expect(juggernaut?.size).toBe("LARGE_OR_HUGE");
  });
});

describe("Пісня клинка", () => {
  it("2014 — КБ і концентрація від Інтелекту (щонайменше +1), +10 швидкості, перевага на Акробатику", () => {
    expect(effectsOf(["Bladesong"], ["Bladesong"], { intelligenceModifier: 4 })).toMatchObject({
      armorClassBonus: 4,
      concentrationSaveBonus: 4,
      speedBonus: 10,
      weaponAbilityOption: null,
      rollModifiers: [{ mode: "ADVANTAGE", scope: "ACROBATICS_CHECK", sourceKey: "Bladesong" }],
    });
    expect(effectsOf(["Bladesong"], ["Bladesong"], { intelligenceModifier: -1 })).toMatchObject({ armorClassBonus: 1, concentrationSaveBonus: 1 });
  });

  it("2024 — Інтелект для зброї, мінімум +1 лише для КЗ", () => {
    expect(effectsOf([BLADESONG_2024], [BLADESONG_2024], { intelligenceModifier: 3 })).toMatchObject({ armorClassBonus: 3, weaponAbilityOption: "INT", concentrationSaveBonus: 3 });
    expect(effectsOf([BLADESONG_2024], [BLADESONG_2024], { intelligenceModifier: 0 })).toMatchObject({ armorClassBonus: 1, concentrationSaveBonus: 0 });
  });
});

describe("Лють зриває концентрацію", () => {
  it("лише Лють, а не решта станів", () => {
    expect(doesFeatureStateEndConcentration("Rage")).toBe(true);
    expect(doesFeatureStateEndConcentration(RAGE_2024)).toBe(true);
    expect(doesFeatureStateEndConcentration("Bladesong")).toBe(false);
  });
});

describe("findRageDamageBonus", () => {
  it("іде за колонкою Rage Damage: +2, +3 з 9-го, +4 з 16-го", () => {
    expect([1, 8, 9, 15, 16, 20].map(findRageDamageBonus)).toEqual([2, 2, 3, 3, 4, 4]);
  });
});

describe("O45 — Гібридна трансформація лікантропа", () => {
  const HYBRID_2014 = "Hybrid Transformation (Order of the Lycan)";
  const HYBRID_2024 = "Order of the Lycan: Hybrid Transformation (2024)";
  const PROWESS_2014 = "Stalker's Prowess (Order of the Lycan)";

  it("має перемикач в обох редакціях", () => {
    expect(isToggleableFeature(HYBRID_2014)).toBe(true);
    expect(isToggleableFeature(HYBRID_2024)).toBe(true);
  });

  it("BH-004, мисливець 7: КБ +1, Звіряча міць +1 до шкоди в ближньому бою, Хижі удари к6 Спритністю з +1 до атаки", () => {
    const effects = effectsOf([HYBRID_2014], [HYBRID_2014, PROWESS_2014], { bloodHunterLevel: 7 });
    expect(effects).toMatchObject({
      armorClassBonus: 1,
      meleeDamageBonus: 1,
      unarmedStrike: { damageDice: "1d6", abilityOption: "DEX", attackBonus: 1 },
      damageResistances: ["BLUDGEONING", "PIERCING", "SLASHING"],
    });
    expect(effects?.rollModifiers.map((modifier) => modifier.scope)).toEqual(["STR_CHECK", "STR_SAVE"]);
    expect(effects?.marks.map((mark) => mark.kind)).toEqual(["RESILIENT_HIDE_NONMAGICAL", "BLOODLUST"]);
  });

  it("до Хижого вміння (7) бонусу до атаки немає; з 11 — к8 і +2, з 18 — +3", () => {
    expect(effectsOf([HYBRID_2024], [HYBRID_2024], { bloodHunterLevel: 3 })?.unarmedStrike).toEqual({ damageDice: "1d6", abilityOption: "DEX", attackBonus: 0 });
    expect(effectsOf([HYBRID_2014], [HYBRID_2014, PROWESS_2014], { bloodHunterLevel: 11 })).toMatchObject({ meleeDamageBonus: 2, unarmedStrike: { damageDice: "1d8", attackBonus: 2 } });
    expect(effectsOf([HYBRID_2014], [HYBRID_2014, PROWESS_2014], { bloodHunterLevel: 18 })).toMatchObject({ meleeDamageBonus: 3, unarmedStrike: { attackBonus: 3 } });
  });

  it("у важкому обладунку Стійка шкура КБ не додає", () => {
    expect(effectsOf([HYBRID_2014], [HYBRID_2014], { bloodHunterLevel: 3, wearsHeavyArmor: true })?.armorClassBonus).toBe(0);
  });
});
