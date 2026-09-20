import { describe, expect, it } from "vitest";

import { buildTermCard, hasTermCardMoreThanOriginal, listDictionaryFormsUnlikeTerm, type TermSources } from "@/lib/term-card";
import type { RuleArticle } from "@/lib/rulesData";
import dictionary from "@/lib/refs/dictionary.json";
import { collectTermSources } from "@/lib/term-sources";

/// KR30.3 — картка терміна за маркером `{{Original}}`: словник, аліаси, стаття довідника,
/// стан, каталог. Спершу на справжніх джерелах (те, що приїде в модалку), потім на
/// фікстурах — де важливо, з якої редакції взято статтю.
const realSources: TermSources = collectTermSources();

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
    expect(card.condition?.href).toBe("/2024/rules/conditions#condition-blinded");
    expect(card.condition?.bulletPoints.length).toBeGreaterThan(0);
  });

  it("зброю веде на її сторінку каталогу", () => {
    const card = buildTermCard({ original: "Greatsword", ruleset: "RULES_2014" }, realSources);
    expect(card.catalog).toEqual({ kind: "weapon", name: expect.stringContaining("Greatsword"), href: "/weapons/greatsword" });
  });

  it("назву дії істоти, якої немає ніде, віддає порожньою карткою, а не помилкою", () => {
    const card = buildTermCard({ original: "Rend", ruleset: "RULES_2014" }, realSources);
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

  it("аліаси статті беруться за її слагом", () => {
    const card = buildTermCard({ original: "Flanking", ruleset: "RULES_2014" }, fixtureSources);
    expect(card.aliases).toEqual(["фланг", "фланкування"]);
  });

  it("однину знаходить за назвою статті в множині, camelCase і дефіс не плутає", () => {
    const attack = buildTermCard({ original: "opportunity-attack", ruleset: "RULES_2014" }, fixtureSources);
    expect(attack.dictionary).toEqual([{ term: "Атака нагоди", section: "дії в бою" }]);
    expect(attack.article).toMatchObject({ ruleset: "RULES_2014", href: "/rules/combat#sub-1" });
  });

  it("різні слова з однаковим початком не склеює", () => {
    const card = buildTermCard({ original: "Flank", ruleset: "RULES_2014" }, fixtureSources);
    expect(card.article).toBeNull();
  });
});

describe("KR34.1 — текст правила іншої редакції в картку не потрапляє", () => {
  it("коли у своїй редакції статті немає, дає лише посилання на статтю іншої, без тексту", () => {
    const card = buildTermCard({ original: "Opportunity Attacks", ruleset: "RULES_2024" }, fixtureSources);
    expect(card.article).toBeNull();
    expect(card.otherEdition).toEqual({ ruleset: "RULES_2014", href: "/rules/combat#sub-1" });
  });

  it("на 2014 бонусна дія, реакція й рятівний кидок відкривають статтю 2014", () => {
    for (const original of ["Bonus Action", "Reaction", "Saving Throw"]) {
      const card = buildTermCard({ original, ruleset: "RULES_2014" }, realSources);
      expect(card.article?.ruleset, original).toBe("RULES_2014");
      expect(card.otherEdition, original).toBeNull();
    }
  });

  it("критичний удар на 2014 — без тексту 2024, лише посилання туди", () => {
    const card = buildTermCard({ original: "Critical Hit", ruleset: "RULES_2014" }, realSources);
    expect(card.article).toBeNull();
    expect(card.otherEdition).toEqual({ ruleset: "RULES_2024", href: "/2024/rules/combat#critical-hit--critical-hit" });
  });

  it("перевага й концентрація на 2014 беруть підрозділ 2014 з реєстру, хоч назва статті інша", () => {
    const advantage = buildTermCard({ original: "Advantage", ruleset: "RULES_2014" }, realSources);
    const concentration = buildTermCard({ original: "Concentration", ruleset: "RULES_2014" }, realSources);
    expect(advantage.article?.href).toBe("/rules/abilities#advantage-and-disadvantage--advantage-and-disadvantage");
    expect(concentration.article?.href).toBe("/rules/spellcasting#concentration-rules");
    expect(concentration.article?.subsection?.content).toMatch(/концентрац/i);
  });

  it("жоден термін словника не дає статтю чи стан чужої редакції", () => {
    const originals = collectDictionaryKeys(dictionary.DND_DICTIONARY);
    const leaks: string[] = [];
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      for (const original of originals) {
        const card = buildTermCard({ original, ruleset }, realSources);
        if (card.article && card.article.ruleset !== ruleset) leaks.push(`${ruleset} ${original}: стаття`);
        if (card.condition && card.condition.ruleset !== ruleset) leaks.push(`${ruleset} ${original}: стан`);
      }
    }
    expect(leaks).toEqual([]);
  });
});

function collectDictionaryKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, leaf]) =>
    typeof leaf === "string" ? [key] : collectDictionaryKeys(leaf)
  );
}

describe("KR30.3 — яку словникову форму показувати в модалці", () => {
  it("на справжньому «Claw» поруч із натиснутим «Пазур» віддає «Кіготь»", () => {
    const card = buildTermCard({ original: "Claw", ruleset: "RULES_2014" }, realSources);
    expect(listDictionaryFormsUnlikeTerm(card, "Пазур")).toEqual([statblockFeatures.Claw]);
  });

  it("форму, що дорівнює натиснутому слову без огляду на регістр, не показує", () => {
    const card = buildTermCard({ original: "Multiattack", ruleset: "RULES_2014" }, realSources);
    expect(listDictionaryFormsUnlikeTerm(card, statblockFeatures.Multiattack.toUpperCase())).toEqual([]);
  });

  it("поруч зі станом або статтею не показує нічого", () => {
    const card = buildTermCard({ original: "Blinded", ruleset: "RULES_2024" }, realSources);
    expect(card.condition).not.toBeNull();
    expect(listDictionaryFormsUnlikeTerm(card, "осліплена")).toEqual([]);
  });
});

describe("картка, варта модалки", () => {
  it("«Мультиатака» без статті, де словник повторює натиснуте слово, нічого не додає до оригіналу", () => {
    const card = buildTermCard({ original: "Multiattack", ruleset: "RULES_2014" }, realSources);
    expect(hasTermCardMoreThanOriginal(card, statblockFeatures.Multiattack)).toBe(false);
  });

  it("інша словникова форма — вже причина відкрити модалку", () => {
    const card = buildTermCard({ original: "Claw", ruleset: "RULES_2014" }, realSources);
    expect(hasTermCardMoreThanOriginal(card, "Пазур")).toBe(true);
  });

  it("стан — причина відкрити модалку", () => {
    const card = buildTermCard({ original: "Blinded", ruleset: "RULES_2024" }, realSources);
    expect(hasTermCardMoreThanOriginal(card, "осліплена")).toBe(true);
  });

  it("зброя з каталогу — причина відкрити модалку", () => {
    const card = buildTermCard({ original: "Greatsword", ruleset: "RULES_2014" }, realSources);
    expect(hasTermCardMoreThanOriginal(card, "дворучний меч")).toBe(true);
  });
});
