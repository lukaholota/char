import { describe, expect, it } from "vitest";

import { buildTermCard, hasTermCardMoreThanOriginal, listDictionaryFormsUnlikeTerm, type TermSources } from "@/lib/term-card";
import type { RuleArticle } from "@/lib/rulesData";
import dictionary from "@/lib/refs/dictionary.json";
import nestedSections from "@/lib/refs/nested-rule-sections.json";
import termLinks from "@/lib/refs/rule-term-links.json";
import { collectTermSources } from "@/lib/term-sources";
import { findTermLinkInHref } from "@/lib/term-link";

/// KR30.3 — картка терміна за маркером `{{Original}}`: словник, аліаси, стаття довідника,
/// стан, каталог. Спершу на справжніх джерелах (те, що приїде в модалку), потім на
/// фікстурах — де важливо, з якої редакції взято статтю.
const realSources: TermSources = collectTermSources();

const skills = (dictionary.DND_DICTIONARY as { skills: Record<string, string> }).skills;
const statblockFeatures = (dictionary.DND_DICTIONARY as { statblockFeatures: Record<string, string> })
  .statblockFeatures;

describe("KR30.3 — картка терміна на справжніх джерелах", () => {
  it("спільні розділи зберігають особистість кожного бойового терміна в адресі", () => {
    const originals = ["Opportunity Attack", "Unarmed Strike", "Resistance", "Vulnerability"];
    const hrefs = originals.map((original) => {
      const card = buildTermCard({ original, ruleset: "RULES_2014" }, realSources);
      expect(card.article).not.toBeNull();
      expect(findTermLinkInHref(card.article!.href)).toEqual({ original, ruleset: "RULES_2014" });
      return card.article!.href;
    });
    expect(new Set(hrefs).size).toBe(originals.length);
  });
  it.each(["Resistance", "Vulnerability"])("%s відкриває правила шкоди 2014", (original) => {
    const card = buildTermCard({ original, ruleset: "RULES_2014" }, realSources);
    expect(card.article?.ruleset).toBe("RULES_2014");
    expect(card.article?.subsection?.content).toContain("зменшується для них удвічі");
    expect(card.article?.subsection?.content).toContain("шкода цього типу подвоюється");
    expect(card.article?.subsection?.content).toContain("рахуються як один");
    expect(card.article?.subsection?.content).not.toContain("### Зцілення");
  });
  it("Удар без зброї відкриває повні правила 2014 без запозичення редакції 2024", () => {
    const card = buildTermCard({ original: "Unarmed Strike", ruleset: "RULES_2014" }, realSources);
    expect(card.article?.ruleset).toBe("RULES_2014");
    expect(findTermLinkInHref(card.article!.href)).toEqual({ original: "Unarmed Strike", ruleset: "RULES_2014" });
    expect(card.article?.subsection?.content).toContain("1 + ваш модифікатор Сили");
    expect(card.article?.subsection?.content).toContain("Беззбройними ударами ви володієте");
    expect(card.otherEdition).toBeNull();
  });
  it("Unarmed Strike does not inherit unrelated aliases from the melee-attacks article", () => {
    const card = buildTermCard({ original: "Unarmed Strike", ruleset: "RULES_2014" }, {
      ...realSources,
      findAliases: (_ruleset, _types, keys) => keys.includes("making-an-attack--melee-attacks") || keys.includes("Бій")
        ? ["захоплення", "греплінг", "боротьба"] : keys.includes("unarmed-strike") ? ["беззбройний удар"] : [],
    });
    expect(card.aliases).toEqual(["беззбройний удар"]);
  });

  it("критичне влучання 2014 показує подвоєні кубики, а не весь розділ зцілення", () => {
    const card = buildTermCard({ original: "Critical Hit", ruleset: "RULES_2014" }, realSources);
    expect(card.article?.ruleset).toBe("RULES_2014");
    expect(card.article?.subsection?.title).toBe("Критичні влучання");
    expect(card.article?.subsection?.content).toContain("двічі");
    expect(card.article?.subsection?.content).not.toContain("### Зцілення");
    expect(card.otherEdition).toBeNull();
  });
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

  it("критичне влучання кожної редакції відкриває її власну статтю", () => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const card = buildTermCard({ original: "Critical Hit", ruleset }, realSources);
      expect(card.article?.ruleset).toBe(ruleset);
      expect(card.otherEdition).toBeNull();
    }
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


it("opens separate 2014 Grapple and Shove rules from nested combat headings", () => {
  const grapple = buildTermCard({ original: "Grapple", ruleset: "RULES_2014" }, realSources);
  const shove = buildTermCard({ original: "Shove", ruleset: "RULES_2014" }, realSources);
  expect(grapple.article?.subsection?.title).toBe("Захоплення");
  expect(grapple.article?.subsection?.content).toContain("Пересування схопленої істоти");
  expect(grapple.article?.subsection?.content).not.toContain("Штовхання істоти");
  expect(shove.article?.subsection?.title).toBe("Штовхання істоти");
  expect(shove.article?.subsection?.content).toContain("на 5 футів");
  expect(shove.article?.href).not.toBe(grapple.article?.href);
});


describe("complete nested skill and tool rule cards", () => {
  it("Athletics retains climbing, jumping and swimming without adjacent skills", () => {
    const body = buildTermCard({ original: "Athletics", ruleset: "RULES_2014" }, realSources).article?.subsection?.content;
    expect(body).toContain("лазіння, стрибків і плавання");
    expect(body).toContain("затягнути вас під воду");
    expect(body).not.toContain("Акробатика");
    expect(body).not.toContain("Інші перевірки Сили");
  });

  it("Alchemist supplies retain components, crafting and every DC row", () => {
    const body = buildTermCard({ original: "Alchemist's Supplies", ruleset: "RULES_2014" }, realSources).article?.subsection?.content;
    expect(body).toContain("дві скляні мензурки");
    expect(body).toContain("**Алхімічне ремесло.**");
    expect(body).toContain("| Пустити клуб густого диму | 10 |");
    expect(body).toContain("| Знешкодити кислоту | 20 |");
    expect(body).not.toContain("Пивоваріння");
    expect(body).not.toContain("**Приладдя пивовара");
  });

  it("Thieves tools retain trap construction and both variable DC rows", () => {
    const body = buildTermCard({ original: "Thieves' Tools", ruleset: "RULES_2014" }, realSources).article?.subsection?.content;
    expect(body).toContain("набір відмичок");
    expect(body).toContain("**Встановлення пастки.**");
    expect(body).toContain("половини підсумку вашої перевірки");
    expect(body).toContain("| Зламати замок | Різна |");
    expect(body).toContain("| Знешкодити пастку | Різна |");
    expect(body).not.toContain("**Інструменти лудильника");
  });

  for (const [group, minimum] of [["ability-checks--using-each-ability", 18], ["tool-proficiencies--tool-descriptions", 26]] as const) {
    it(`${group} exposes every complete individual section`, () => {
      expect(nestedSections[group]).toHaveLength(minimum);
      for (const entry of nestedSections[group]) {
        const link = termLinks.find((candidate) => candidate.RULES_2014?.endsWith(`#${group}--${entry.anchor}`));
        expect(link, entry.heading).toBeDefined();
        const article = buildTermCard({ original: link!.original, ruleset: "RULES_2014" }, realSources).article;
        expect(article?.subsection?.title, entry.heading).toBe(entry.heading);
        expect(article?.subsection?.content.length, entry.heading).toBeGreaterThan(100);
        expect(article?.ruleset).toBe("RULES_2014");
        for (const other of nestedSections[group]) {
          if (other.heading !== entry.heading) expect(article?.subsection?.content, entry.heading).not.toContain(`**${other.heading}.**`);
        }
        if (group === "tool-proficiencies--tool-descriptions") {
          if (entry.anchor === "vehicles-land-and-water") {
            expect(article?.subsection?.content).toContain("керувати засобами цього різновиду");
          } else if (entry.anchor === "musical-instrument") {
            expect(article?.subsection?.content).toContain("**Складання мелодії.**");
          } else {
            expect(article?.subsection?.content, entry.heading).toContain("**Складники.**");
          }
          expect(article?.subsection?.content, entry.heading).toContain("| Справа | СК |");
        }
      }
    });
  }
});
