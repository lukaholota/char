import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { getBeyondSrdArticlesByRuleset } from "@/lib/rulesBeyondSrdData";
import { expandGlossaryMarkersToHtml, findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import dictionary from "@/lib/refs/dictionary.json";

const CYRILLIC = /[а-яіїєґ]/i;
const TRANSLATIONS_DIR = join(process.cwd(), "data/2024/beyond-srd-uk");
const EXPECTED_ARTICLES = 32;

const xdmg = getBeyondSrdArticlesByRuleset("RULES_2024");
const body = xdmg.flatMap((article) => article.subsections.map((subsection) => subsection.content)).join("\n");

describe("KR23.4 — переклад глав 1–3 XDMG поза SRD", () => {
  it("перекладає всі 32 статті без жодного англійського підрозділу", () => {
    expect(xdmg.length).toBe(EXPECTED_ARTICLES);
    expect(xdmg.filter((article) => !article.isTranslated).map((article) => article.id)).toEqual([]);

    for (const article of xdmg) {
      expect(article.title, article.id).toMatch(CYRILLIC);
      expect(article.summary, article.id).toMatch(CYRILLIC);
      for (const subsection of article.subsections) {
        /// «Example of Play» ріже репліки на підрозділи без назви — розкладач лишає їм номер
        /// («(1)», «2») замість заголовка. Перекладати нема чого, це не англійський залишок.
        if (!/^\(?\d+\)?$/.test(subsection.title)) {
          expect(subsection.title, subsection.id).toMatch(CYRILLIC);
        }
        expect(subsection.content, subsection.id).toMatch(CYRILLIC);
      }
    }
  });

  it("не має жодного id двічі між партіями", () => {
    const seen = new Set<string>();
    for (const fileName of readdirSync(TRANSLATIONS_DIR).filter((name) => name.endsWith(".json"))) {
      const batch = JSON.parse(readFileSync(join(TRANSLATIONS_DIR, fileName), "utf-8")) as Record<string, unknown>;
      for (const articleId of Object.keys(batch)) {
        expect(seen.has(articleId), `${articleId} трапляється двічі (${fileName})`).toBe(false);
        seen.add(articleId);
      }
    }
    expect(seen.size).toBe(EXPECTED_ARTICLES);
  });

  it("тримає редакційну термінологію 2024: СК, а не СЛ", () => {
    expect(body).toMatch(/зі СК \d+/);
    expect(body, "СЛ — це термін корпусу 2014").not.toMatch(/зі СЛ \d+/);
    expect(body, "СЛ — це термін корпусу 2014").not.toMatch(/\bСЛ \d+/);
  });

  it("вживає терміни дій і правил зі словника, без паралельних назв 2014", () => {
    expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.dash);
    expect(body).toContain(dictionary.DND_DICTIONARY.rules2024.coreConceptTerms.d20Test);

    for (const forbidden of [/зачарован/i, /ошелешен/i, /спасброс/i, /бонус-екшн/i, /додаткова\s+дія/i, /додаткову\s+дію/i]) {
      expect(body, `заборонений варіант ${forbidden}`).not.toMatch(forbidden);
    }
  });

  /// «Wizards of the Coast» — реальний розробник D&D, не вигадана лексика книги (як Грейгок чи
  /// Мензоберранзан) — власник 2026-08-30: таке не перекладається й не транслітерується взагалі.
  const ALLOWED_LATIN_PHRASE = "Wizards of the Coast";

  it("лишає латиницю тільки всередині маркера оригіналу, назв заклинань і бренду розробника", () => {
    for (const article of xdmg) {
      for (const subsection of article.subsections) {
        const bare = stripGlossaryMarkers(subsection.content)
          .replace(/\[[^\]]*\]/g, "")
          .replaceAll(ALLOWED_LATIN_PHRASE, "");
        const latin = (bare.match(/[A-Za-z]{2,}/g) ?? []).filter(
          (word) => word !== "CR" && word !== "TPK" && word !== "PDF"
        );
        expect(latin, subsection.id).toEqual([]);
      }
    }
  });

  it("не ламає розмітку маркером оригіналу (Р20)", () => {
    for (const article of xdmg) {
      for (const subsection of article.subsections) {
        for (const marker of findGlossaryMarkers(subsection.content)) {
          expect(marker.term, `${subsection.id}: ${marker.original}`).not.toBe("");
          expect(marker.term, `${subsection.id}: ${marker.original}`).not.toMatch(/[*_`|]/);
        }
        const html = expandGlossaryMarkersToHtml(subsection.content);
        expect((html.match(/\*\*/g) ?? []).length % 2, subsection.id).toBe(0);
      }
    }
  });

  it("розмітка 5etools розкладена, а не протягнута як є", () => {
    expect(body).not.toMatch(/\{@\w+/);
  });
});
