import { describe, expect, it } from "vitest";
import { splitIntoLinkSegments } from "./preview-link-segments";

describe("превʼю картки з посиланнями на заклинання й терміни", () => {
  it("лишає посилання на заклинання окремим шматком із ключем і редакцією", () => {
    const markup = '<a href="/2024/spells/mage-armor">Обладунок мага [Mage Armor]</a> на себе без витрати слотів';
    expect(splitIntoLinkSegments(markup)).toEqual([
      { text: "Обладунок мага [Mage Armor]", spellLink: { spellKey: "mage-armor", ruleset: "RULES_2024" } },
      { text: " на себе без витрати слотів" },
    ]);
  });

  it("зберігає пробіли між текстом і посиланням, а решту розмітки знімає", () => {
    const markup = '3р. <a href="/spell/1249">Темрява [Darkness]</a>, *істинний зір{{Truesight}}*';
    expect(splitIntoLinkSegments(markup)).toEqual([
      { text: "3р. " },
      { text: "Темрява [Darkness]", spellLink: { spellKey: "1249", ruleset: "RULES_2014" } },
      { text: ", істинний зір" },
    ]);
  });

  it("лишає посилання на стан окремим шматком із терміном, редакцією й адресою", () => {
    const markup = 'навіть якщо ви <a href="/2024/rules/conditions#condition-blinded">засліплені</a> або в темряві';
    expect(splitIntoLinkSegments(markup)).toEqual([
      { text: "навіть якщо ви " },
      { text: "засліплені", termLink: { original: "Blinded", ruleset: "RULES_2024" }, href: "/2024/rules/conditions#condition-blinded" },
      { text: " або в темряві" },
    ]);
  });

  it("посилання не на заклинання й не на термін стає звичайним текстом", () => {
    expect(splitIntoLinkSegments('Див. <a href="/2024/feats/alert">Пильність</a>.')).toEqual([{ text: "Див. Пильність." }]);
  });

  it("текст без посилань — один шматок", () => {
    expect(splitIntoLinkSegments("+модифікатор ХАР до шкоди")).toEqual([{ text: "+модифікатор ХАР до шкоди" }]);
    expect(splitIntoLinkSegments("")).toEqual([]);
  });
});
