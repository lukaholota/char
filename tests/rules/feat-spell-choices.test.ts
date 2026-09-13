import { describe, expect, it } from "vitest";
import {
  findFeatSpellChoiceRule,
  findFeatSpellSelectionProblem,
  isFeatSpellCandidate,
} from "@/rules/feat-spell-choices";

const charmPerson = { spellId: 1, level: 1, school: "ENCHANTMENT" };
const detectMagic = { spellId: 2, level: 1, school: "DIVINATION" };
const falseLife = { spellId: 3, level: 1, school: "NECROMANCY" };
const suggestion = { spellId: 4, level: 2, school: "ENCHANTMENT" };

describe("KR31.5 — вибір заклинання в рисі 2024: Доторк феї й Доторк тіні (L03-feats-10)", () => {
  it("Доторк феї просить одне заклинання 1-го рівня з Ворожіння або Причарування", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "FEY_TOUCHED")).toEqual({
      count: 1,
      spellLevel: 1,
      schools: ["DIVINATION", "ENCHANTMENT"],
    });
  });

  it("Доторк тіні — з Ілюзії або Некромантії", () => {
    expect(findFeatSpellChoiceRule("RULES_2024", "SHADOW_TOUCHED")?.schools).toEqual(["ILLUSION", "NECROMANCY"]);
  });

  it("риса 2014 і риса без вибору заклинання правила не мають", () => {
    expect(findFeatSpellChoiceRule("RULES_2014", "FEY_TOUCHED")).toBeNull();
    expect(findFeatSpellChoiceRule("RULES_2024", "ALERT")).toBeNull();
  });

  it("кандидат — лише потрібного рівня й потрібної школи", () => {
    const rule = findFeatSpellChoiceRule("RULES_2024", "FEY_TOUCHED")!;

    expect([charmPerson, detectMagic, falseLife, suggestion].filter((spell) => isFeatSpellCandidate(rule, spell))).toEqual([
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
    const rule = { count: 2, spellLevel: 1, schools: ["ENCHANTMENT", "DIVINATION"] as const };
    expect(findFeatSpellSelectionProblem(rule, [charmPerson.spellId, charmPerson.spellId], [charmPerson, detectMagic])).toBe(
      "Оберіть 2 заклинання риси",
    );
  });
});
