import { describe, expect, it } from "vitest";
import {
  applyHitPointChange,
  findCreatureHitPoints,
  findHitPointBarTone,
  findHitPointChangesFromEdit,
  findHitPointChangesTo,
  isCreatureDown,
  parseHitPointChange,
  rollCreatureMaxHitPoints,
  type CreatureHitPoints,
} from "@/rules/creature-hit-points";

const always = (value: number) => () => value;

describe("хіти істот на мапі", () => {
  it("кидає хіти за формулою статблоку: кубики плюс бонус", () => {
    expect(rollCreatureMaxHitPoints("40 (9к8 + 18)", always(0))).toBe(27);
    expect(rollCreatureMaxHitPoints("40 (9к8 + 18)", always(0.999))).toBe(90);
    expect(rollCreatureMaxHitPoints("7 (2к6)", always(0.5))).toBe(8);
    expect(rollCreatureMaxHitPoints("22 (4d8 − 4)", always(0))).toBe(1);
    expect(rollCreatureMaxHitPoints("104 (16к8 32)", always(0))).toBe(48);
  });

  it("без придатної формули бере середнє число статблоку, а без числа — нічого", () => {
    expect(rollCreatureMaxHitPoints("50 (демон) або 40 (диявол) + 15 за кожен рівень")).toBe(50);
    expect(rollCreatureMaxHitPoints("20 (0к8)", always(0))).toBe(20);
    expect(rollCreatureMaxHitPoints("20 (1к1)", always(0))).toBe(20);
    expect(rollCreatureMaxHitPoints("20 (999к8)", always(0))).toBe(20);
    expect(rollCreatureMaxHitPoints("половина максимуму хітів того, хто його викликав")).toBeNull();
    expect(rollCreatureMaxHitPoints(undefined)).toBeNull();
  });

  it("старі рядки без хітів беруть середнє зі статблоку й стоять цілими", () => {
    expect(findCreatureHitPoints({ hpMax: null, hpCurrent: null }, "7 (2к6)")).toEqual({ current: 7, max: 7 });
    expect(findCreatureHitPoints({ hpMax: 12, hpCurrent: 5 }, "7 (2к6)")).toEqual({ current: 5, max: 12 });
    expect(findCreatureHitPoints({ hpMax: 12, hpCurrent: null }, undefined)).toEqual({ current: 12, max: 12 });
    expect(findCreatureHitPoints({ hpMax: null, hpCurrent: null }, "половина")).toBeNull();
    expect(findCreatureHitPoints({ hpMax: null, hpCurrent: null }, undefined)).toBeNull();
  });

  it("приймає лише цілу кількість від 1 до 9999 і відомий вид зміни", () => {
    expect(parseHitPointChange({ kind: "damage", amount: 5 })).toEqual({ kind: "damage", amount: 5 });
    expect(parseHitPointChange({ kind: "set_max", amount: 9999 })).toEqual({ kind: "set_max", amount: 9999 });
    expect(parseHitPointChange({ kind: "heal", amount: 0 })).toBeNull();
    expect(parseHitPointChange({ kind: "heal", amount: 10000 })).toBeNull();
    expect(parseHitPointChange({ kind: "heal", amount: 1.5 })).toBeNull();
    expect(parseHitPointChange({ kind: "heal", amount: "3" })).toBeNull();
    expect(parseHitPointChange({ kind: "kill", amount: 3 })).toBeNull();
    expect(parseHitPointChange(null)).toBeNull();
  });

  it("шкода не опускає нижче нуля, лікування не піднімає вище максимуму", () => {
    const hurt = { current: 6, max: 10 };
    expect(applyHitPointChange(hurt, { kind: "damage", amount: 4 })).toEqual({ current: 2, max: 10 });
    expect(applyHitPointChange(hurt, { kind: "damage", amount: 50 })).toEqual({ current: 0, max: 10 });
    expect(applyHitPointChange(hurt, { kind: "heal", amount: 3 })).toEqual({ current: 9, max: 10 });
    expect(applyHitPointChange(hurt, { kind: "heal", amount: 50 })).toEqual({ current: 10, max: 10 });
    expect(applyHitPointChange(null, { kind: "damage", amount: 1 })).toBeNull();
    expect(applyHitPointChange(null, { kind: "heal", amount: 1 })).toBeNull();
  });

  it("новий максимум не лишає поточних хітів над собою, а без хітів дає цілу істоту", () => {
    expect(applyHitPointChange({ current: 6, max: 10 }, { kind: "set_max", amount: 4 })).toEqual({ current: 4, max: 4 });
    expect(applyHitPointChange({ current: 6, max: 10 }, { kind: "set_max", amount: 30 })).toEqual({ current: 6, max: 30 });
    expect(applyHitPointChange(null, { kind: "set_max", amount: 12 })).toEqual({ current: 12, max: 12 });
  });

  it("повалений лише з нулем хітів; смуга міняє колір на половині й чверті", () => {
    expect(isCreatureDown({ current: 0, max: 5 })).toBe(true);
    expect(isCreatureDown({ current: 1, max: 5 })).toBe(false);
    expect(isCreatureDown(null)).toBe(false);
    expect(findHitPointBarTone({ current: 6, max: 10 })).toBe("healthy");
    expect(findHitPointBarTone({ current: 5, max: 10 })).toBe("hurt");
    expect(findHitPointBarTone({ current: 3, max: 10 })).toBe("hurt");
    expect(findHitPointBarTone({ current: 2, max: 10 })).toBe("critical");
  });
});

describe("findHitPointChangesTo", () => {
  const replay = (from: { current: number; max: number }, to: { current: number; max: number }) => findHitPointChangesTo(from, to).reduce<typeof from | null>((hitPoints, change) => applyHitPointChange(hitPoints, change), from);

  it("повертає хіти до попереднього стану після шкоди, лікування й нового максимуму", () => {
    expect(findHitPointChangesTo({ current: 3, max: 10 }, { current: 10, max: 10 })).toEqual([{ kind: "heal", amount: 7 }]);
    expect(findHitPointChangesTo({ current: 10, max: 10 }, { current: 4, max: 10 })).toEqual([{ kind: "damage", amount: 6 }]);
    expect(findHitPointChangesTo({ current: 5, max: 5 }, { current: 8, max: 12 })).toEqual([{ kind: "set_max", amount: 12 }, { kind: "heal", amount: 3 }]);
    expect(replay({ current: 5, max: 5 }, { current: 8, max: 12 })).toEqual({ current: 8, max: 12 });
    expect(replay({ current: 20, max: 30 }, { current: 2, max: 6 })).toEqual({ current: 2, max: 6 });
    expect(replay({ current: 0, max: 6 }, { current: 6, max: 6 })).toEqual({ current: 6, max: 6 });
    expect(findHitPointChangesTo({ current: 4, max: 9 }, { current: 4, max: 9 })).toEqual([]);
  });
});

describe("тимчасові хіти істоти", () => {
  const shielded = { current: 10, max: 12, temp: 5 };
  const replay = (from: CreatureHitPoints, to: CreatureHitPoints) => findHitPointChangesTo(from, to).reduce<CreatureHitPoints | null>(applyHitPointChange, from);

  it("шкода спершу знімає тимчасові, лікування їх не чіпає, максимум їх не обнуляє", () => {
    expect(applyHitPointChange(shielded, { kind: "damage", amount: 3 })).toEqual({ current: 10, max: 12, temp: 2 });
    expect(applyHitPointChange(shielded, { kind: "damage", amount: 8 })).toEqual({ current: 7, max: 12, temp: 0 });
    expect(applyHitPointChange(shielded, { kind: "damage", amount: 99 })).toEqual({ current: 0, max: 12, temp: 0 });
    expect(applyHitPointChange(shielded, { kind: "heal", amount: 9 })).toEqual({ current: 12, max: 12, temp: 5 });
    expect(applyHitPointChange(shielded, { kind: "set_max", amount: 8 })).toEqual({ current: 8, max: 8, temp: 5 });
    expect(applyHitPointChange(shielded, { kind: "set_temp", amount: 0 })).toEqual({ current: 10, max: 12, temp: 0 });
    expect(applyHitPointChange(null, { kind: "set_temp", amount: 4 })).toBeNull();
  });

  it("обнулити тимчасові можна, а відʼємні чи дробові — ні", () => {
    expect(parseHitPointChange({ kind: "set_temp", amount: 0 })).toEqual({ kind: "set_temp", amount: 0 });
    expect(parseHitPointChange({ kind: "damage", amount: 0 })).toBeNull();
    expect(parseHitPointChange({ kind: "set_temp", amount: -1 })).toBeNull();
    expect(parseHitPointChange({ kind: "set_temp", amount: 2.5 })).toBeNull();
  });

  it("скасування повертає і поточні, і тимчасові рівно до попередніх", () => {
    const states: CreatureHitPoints[] = [shielded, { current: 7, max: 12, temp: 0 }, { current: 12, max: 12, temp: 3 }, { current: 4, max: 12, temp: 6 }, { current: 4, max: 8, temp: 0 }];
    for (const from of states) for (const to of states) expect(replay(from, to)).toEqual(to);
  });

  it("правка з панелі задає тимчасові поряд з поточними", () => {
    expect(findHitPointChangesFromEdit(shielded, { temp: 0 }).reduce<CreatureHitPoints | null>(applyHitPointChange, shielded)).toEqual({ current: 10, max: 12, temp: 0 });
    expect(findHitPointChangesFromEdit(shielded, { current: 6, temp: 8 }).reduce<CreatureHitPoints | null>(applyHitPointChange, shielded)).toEqual({ current: 6, max: 12, temp: 8 });
    expect(findHitPointChangesFromEdit(shielded, { damage: 7 }).reduce<CreatureHitPoints | null>(applyHitPointChange, shielded)).toEqual({ current: 8, max: 12, temp: 0 });
  });
});

describe("правка хітів з панелі", () => {
  const wounded = { current: 7, max: 10 };
  const applyAll = (edit: Parameters<typeof findHitPointChangesFromEdit>[1]) => findHitPointChangesFromEdit(wounded, edit).reduce<CreatureHitPoints | null>(applyHitPointChange, wounded);

  it("нові числа стають рівно такими, шкода й лікування йдуть поверх них", () => {
    expect(applyAll({ current: 3 })).toEqual({ current: 3, max: 10 });
    expect(applyAll({ max: 20, current: 15 })).toEqual({ current: 15, max: 20 });
    expect(applyAll({ max: 5 })).toEqual({ current: 5, max: 5 });
    expect(applyAll({ current: 9, damage: 4, heal: 1 })).toEqual({ current: 6, max: 10 });
    expect(findHitPointChangesFromEdit(wounded, {})).toEqual([]);
  });

  it("без хітів задається лише максимум", () => {
    expect(findHitPointChangesFromEdit(null, { max: 12, damage: 3 })).toEqual([{ kind: "set_max", amount: 12 }]);
    expect(findHitPointChangesFromEdit(null, { damage: 3 })).toEqual([]);
  });
});
