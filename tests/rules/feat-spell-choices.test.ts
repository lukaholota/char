import { describe, expect, it } from "vitest";
import {
  findFeatSpellChoiceRule,
  findFeatSpellSelectionProblem,
  hasFeatSpellChoice,
  hasFeatSpellGrowth,
  isFeatSpellCandidate,
} from "@/rules/feat-spell-choices";

const charmPerson = { spellId: 1, level: 1, school: "ENCHANTMENT" };
const detectMagic = { spellId: 2, level: 1, school: "DIVINATION" };
const falseLife = { spellId: 3, level: 1, school: "NECROMANCY" };
const suggestion = { spellId: 4, level: 2, school: "ENCHANTMENT" };

describe("KR31.5 — вибір заклинання в рисі 2024: Доторк феї й Доторк тіні (L03-feats-10)", () => {
  it("Доторк феї просить одне заклинання 1-го рівня з Ворожіння або Причарування", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "FEY_TOUCHED")).toEqual({
      picks: [{ count: 1, spellLevel: 1, schools: ["DIVINATION", "ENCHANTMENT"], spellList: null }],
    });
  });

  it("Доторк тіні — з Ілюзії або Некромантії", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "SHADOW_TOUCHED")?.picks[0].schools).toEqual(["ILLUSION", "NECROMANCY"]);
  });

  it("риса 2014 і риса без вибору заклинання правила не мають", () => {
    expect(findFeatSpellChoiceRule("RULES_2014", "FEY_TOUCHED")).toBeNull();
    expect(findFeatSpellChoiceRule("RULES_2024", "ALERT")).toBeNull();
    expect(hasFeatSpellChoice("RULES_2014", "MAGIC_INITIATE")).toBe(false);
    expect(hasFeatSpellChoice("RULES_2024", "ALERT")).toBe(false);
  });

  it("кандидат — лише потрібного рівня й потрібної школи", () => {
    const [pick] = findFeatSpellChoiceRule("RULES_2024", "FEY_TOUCHED")!.picks;

    expect([charmPerson, detectMagic, falseLife, suggestion].filter((spell) => isFeatSpellCandidate(pick, spell))).toEqual([
      charmPerson,
      detectMagic,
    ]);
  });

  it("вибір приймається рівно тоді, коли обрано стільки кандидатів, скільки просить риса", () => {
    const rule = findFeatSpellChoiceRule("RULES_2024", "FEY_TOUCHED")!;
    const candidates = [charmPerson, detectMagic];

    expect(findFeatSpellSelectionProblem(rule, [charmPerson.spellId], candidates)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [], candidates)).toBe("Оберіть 1 заклинання риси");
    expect(findFeatSpellSelectionProblem(rule, [charmPerson.spellId, detectMagic.spellId], candidates)).toBe(
      "Оберіть 1 заклинання риси",
    );
    expect(findFeatSpellSelectionProblem(rule, [falseLife.spellId], candidates)).toBe(
      "Обране заклинання не підходить цій рисі",
    );
  });

  it("те саме заклинання двічі не рахується за два", () => {
    const rule = { picks: [{ count: 2, spellLevel: 1, schools: ["ENCHANTMENT", "DIVINATION"] as const, spellList: null }] };
    expect(findFeatSpellSelectionProblem(rule, [charmPerson.spellId, charmPerson.spellId], [charmPerson, detectMagic])).toBe(
      "Оберіть 2 заклинання риси",
    );
  });
});

const wizardList = ["Чарівник"];
const clericList = ["Клірик"];
const fireBolt = { spellId: 10, level: 0, school: "EVOCATION", spellLists: wizardList };
const mageHand = { spellId: 11, level: 0, school: "CONJURATION", spellLists: wizardList };
const light = { spellId: 12, level: 0, school: "EVOCATION", spellLists: [...wizardList, ...clericList] };
const guidance = { spellId: 13, level: 0, school: "DIVINATION", spellLists: clericList };
const shield = { spellId: 14, level: 1, school: "ABJURATION", spellLists: wizardList };
const sleep = { spellId: 15, level: 1, school: "ENCHANTMENT", spellLists: wizardList };
const bless = { spellId: 16, level: 1, school: "ENCHANTMENT", spellLists: clericList };
const initiateCandidates = [fireBolt, mageHand, light, guidance, shield, sleep, bless];

describe("KR31.5 — «Посвячений у магію» 2024: два замовляння й заклинання 1-го рівня з обраного списку (L07-spellcasting-04)", () => {
  const wizardInitiate = findFeatSpellChoiceRule("RULES_2024", "MAGIC_INITIATE", ["Magic Initiate 2024 (INT)", "Magic Initiate 2024 (Wizard)"])!;

  it("список риси задає обидві порції: два замовляння й одне заклинання 1-го рівня", () => {
    expect(wizardInitiate).toEqual({
      picks: [
        { count: 2, spellLevel: 0, schools: null, spellList: "Чарівник" },
        { count: 1, spellLevel: 1, schools: null, spellList: "Чарівник" },
      ],
    });
    expect(hasFeatSpellChoice("RULES_2024", "MAGIC_INITIATE")).toBe(true);
  });

  it("поки список не обрано, обирати нема з чого", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "MAGIC_INITIATE", ["Magic Initiate 2024 (INT)"])).toBeNull();
  });

  it("два замовляння й заклинання зі списку чарівника приймаються", () => {
    expect(findFeatSpellSelectionProblem(wizardInitiate, [fireBolt.spellId, light.spellId, shield.spellId], initiateCandidates)).toBeNull();
  });

  it("бракує замовляння — риса називає саме замовляння", () => {
    expect(findFeatSpellSelectionProblem(wizardInitiate, [fireBolt.spellId, shield.spellId], initiateCandidates)).toBe("Оберіть 2 замовляння риси");
  });

  it("три заклинання 1-го рівня замість замовлянь не проходять, хоч їх і три", () => {
    expect(findFeatSpellSelectionProblem(wizardInitiate, [fireBolt.spellId, shield.spellId, sleep.spellId], initiateCandidates)).toBe(
      "Оберіть 2 замовляння риси",
    );
  });

  it("замовляння чужого списку відхиляється", () => {
    expect(findFeatSpellSelectionProblem(wizardInitiate, [fireBolt.spellId, guidance.spellId, shield.spellId], initiateCandidates)).toBe(
      "Обране заклинання не підходить цій рисі",
    );
    expect(findFeatSpellSelectionProblem(wizardInitiate, [fireBolt.spellId, mageHand.spellId, bless.spellId], initiateCandidates)).toBe(
      "Обране заклинання не підходить цій рисі",
    );
  });
});

describe("KR31.5 — Ritual Caster 2024: ритуальні заклинання 1-го рівня за бонусом майстерності (L03-feats-11)", () => {
  const findSpell = { spellId: 21, level: 1, school: "CONJURATION", isRitual: true };
  const detectMagicRitual = { spellId: 22, level: 1, school: "DIVINATION", isRitual: true };
  const alarm = { spellId: 23, level: 1, school: "ABJURATION", isRitual: true };
  const shield = { spellId: 24, level: 1, school: "ABJURATION", isRitual: false };
  const augury = { spellId: 25, level: 2, school: "DIVINATION", isRitual: true };
  const ritualCandidates = [findSpell, detectMagicRitual, alarm, shield, augury];

  it("риса на 4-му рівні: два ритуали, бо бонус майстерності 2", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "RITUAL_CASTER", [], { characterLevel: 4, ownedFeatSpellCount: 0 })).toEqual({
      picks: [{ count: 2, spellLevel: 1, schools: null, spellList: null, ritualOnly: true }],
    });
    expect(hasFeatSpellChoice("RULES_2024", "RITUAL_CASTER")).toBe(true);
  });

  it("бонус виріс до 3 на 5-му рівні — ще один ритуал, а поки не росте — нічого", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "RITUAL_CASTER", [], { characterLevel: 5, ownedFeatSpellCount: 2 })?.picks[0].count).toBe(1);
    expect(findFeatSpellChoiceRule("RULES_2024", "RITUAL_CASTER", [], { characterLevel: 6, ownedFeatSpellCount: 3 })).toBeNull();
    expect(hasFeatSpellGrowth("RULES_2024", "RITUAL_CASTER")).toBe(true);
    expect(hasFeatSpellGrowth("RULES_2024", "FEY_TOUCHED")).toBe(false);
    expect(hasFeatSpellGrowth("RULES_2014", "RITUAL_CASTER")).toBe(false);
  });

  it("кандидат — лише ритуал 1-го рівня: Щит без ритуалу й Ворожба 2-го рівня відпадають", () => {
    const rule = findFeatSpellChoiceRule("RULES_2024", "RITUAL_CASTER", [], { characterLevel: 4, ownedFeatSpellCount: 0 })!;

    expect(ritualCandidates.filter((spell) => isFeatSpellCandidate(rule.picks[0], spell))).toEqual([findSpell, detectMagicRitual, alarm]);
    expect(findFeatSpellSelectionProblem(rule, [findSpell.spellId, alarm.spellId], ritualCandidates)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [findSpell.spellId, shield.spellId], ritualCandidates)).toBe("Обране заклинання не підходить цій рисі");
    expect(findFeatSpellSelectionProblem(rule, [findSpell.spellId], ritualCandidates)).toBe("Оберіть 2 заклинання риси");
  });
});
