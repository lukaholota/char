import { describe, expect, it } from "vitest";

import { buildTermCard, type TermSources } from "@/lib/term-card";
import type { RuleArticle } from "@/lib/rulesData";
import { getAllConditions } from "@/lib/rulesData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024, getConditions2024 } from "@/lib/rules2024Data";
import { getAllWeapons } from "@/lib/weaponsData";
import { getAllArmors } from "@/lib/armorData";
import { findAliasVariants } from "@/lib/search/searchAliases";
import dictionary from "@/lib/refs/dictionary.json";

/// KR30.3 — картка терміна за маркером `{{Original}}`: словник, аліаси, стаття довідника,
/// стан, каталог. Спершу на справжніх джерелах (те, що приїде в модалку), потім на
/// фікстурах — де важливо, з якої редакції взято статтю.
const realSources: TermSources = {
  articles: { RULES_2014: getAllRuleArticles2014(), RULES_2024: getAllRuleArticles2024() },
  conditions: { RULES_2014: getAllConditions("RULES_2014"), RULES_2024: getConditions2024() },
  dictionary: dictionary.DND_DICTIONARY as Record<string, unknown>,
  weapons: { RULES_2014: getAllWeapons("RULES_2014"), RULES_2024: getAllWeapons("RULES_2024") },
  armors: { RULES_2014: getAllArmors("RULES_2014"), RULES_2024: getAllArmors("RULES_2024") },
  findAliases: findAliasVariants,
};

const skills = (dictionary.DND_DICTIONARY as { skills: Record<string, string> }).skills;
const statblockFeatures = (dictionary.DND_DICTIONARY as { statblockFeatures: Record<string, string> })
  .statblockFeatures;

describe("KR30.3 — картка терміна на справжніх джерелах", () => {
  it("навичку з camelCase-ключа словника знаходить за назвою з книги", () => {
    const card = buildTermCard({ original: "Animal Handling", ruleset: "RULES_2014" }, realSources);
    expect(card.dictionary).toContainEqual({ term: skills.animalHandling, section: "навички" });
  });

  it("рису статблока знаходить за англійським ключем", () => {
    const card = buildTermCard({ original: "Multiattack", ruleset: "RULES_2024" }, realSources);
    expect(card.dictionary).toContainEqual({ term: statblockFeatures.Multiattack, section: "риси статблока" });
  });

  it("стан дає опис, пункти й якір на сторінку станів своєї редакції", () => {
    const card = buildTermCard({ original: "Blinded", ruleset: "RULES_2024" }, realSources);
    expect(card.condition?.ruleset).toBe("RULES_2024");
    expect(card.condition?.href).toBe("/2024/rules/conditions#blinded");
    expect(card.condition?.bulletPoints.length).toBeGreaterThan(0);
  });

  it("зброю веде на її сторінку каталогу", () => {
    const card = buildTermCard({ original: "Greatsword", ruleset: "RULES_2014" }, realSources);
    expect(card.catalog).toEqual({ kind: "weapon", name: expect.stringContaining("Greatsword"), href: "/weapons/greatsword" });
  });

  it("назву дії істоти, якої немає ніде, віддає порожньою карткою, а не помилкою", () => {
    const card = buildTermCard({ original: "Gore", ruleset: "RULES_2014" }, realSources);
    expect(card).toMatchObject({ dictionary: [], article: null, condition: null, catalog: null });
  });
});

function buildArticle(ruleset: RuleArticle["ruleset"], engTitle: string, subsectionEngTitle?: string): RuleArticle {
  return {
    id: `${ruleset}-${engTitle}`,
    slug: engTitle.toLowerCase().replace(/\s+/g, "-"),
    category: "combat",
    title: `Стаття ${engTitle} ${ruleset}`,
    engTitle,
    summary: `Про ${engTitle}`,
    ruleset,
    order: 1,
    tags: [],
    subsections: subsectionEngTitle
      ? [{ id: "sub-1", title: `Підрозділ ${subsectionEngTitle}`, engTitle: subsectionEngTitle, content: "Текст підрозділу" }]
      : [],
  };
}

const fixtureSources: TermSources = {
  articles: {
    RULES_2014: [buildArticle("RULES_2014", "Flanking"), buildArticle("RULES_2014", "Combat", "Opportunity Attacks")],
    RULES_2024: [buildArticle("RULES_2024", "Flanking")],
  },
  conditions: { RULES_2014: [], RULES_2024: [] },
  dictionary: { combatActions: { opportunityAttack: "Атака нагоди" } },
  weapons: { RULES_2014: [], RULES_2024: [] },
  armors: { RULES_2014: [], RULES_2024: [] },
  findAliases: (_ruleset, entityTypes, keys) =>
    entityTypes.includes("rule") && keys.includes("flanking") ? ["фланг", "фланкування"] : [],
};

describe("KR30.3 — з якої редакції стаття", () => {
  it("бере статтю редакції сторінки, коли вона є", () => {
    const card = buildTermCard({ original: "Flanking", ruleset: "RULES_2024" }, fixtureSources);
    expect(card.article?.ruleset).toBe("RULES_2024");
    expect(card.article?.href).toBe("/2024/rules/combat#flanking");
  });

  it("падає на іншу редакцію, коли у своїй статті немає, і каже про це редакцією в картці", () => {
    const card = buildTermCard({ original: "Opportunity Attacks", ruleset: "RULES_2024" }, fixtureSources);
    expect(card.article).toMatchObject({ ruleset: "RULES_2014", href: "/rules/combat#sub-1" });
    expect(card.article?.subsection).toEqual({ title: "Підрозділ Opportunity Attacks", content: "Текст підрозділу" });
  });

  it("аліаси статті беруться за її слагом", () => {
    const card = buildTermCard({ original: "Flanking", ruleset: "RULES_2014" }, fixtureSources);
    expect(card.aliases).toEqual(["фланг", "фланкування"]);
  });

  it("однину й множину, camelCase і дефіс не плутає, але й не склеює різні терміни", () => {
    const attack = buildTermCard({ original: "opportunity-attack", ruleset: "RULES_2014" }, fixtureSources);
    expect(attack.dictionary).toEqual([{ term: "Атака нагоди", section: "дії в бою" }]);
    expect(attack.article).toBeNull();
  });
});
