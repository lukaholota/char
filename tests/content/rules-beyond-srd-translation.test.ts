import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { getBeyondSrdArticlesByRuleset } from "@/lib/rulesBeyondSrdData";
import { CONDITIONS_DATA } from "@/lib/rulesData";
import { expandGlossaryMarkersToHtml, findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { stripSpellAnchors } from "@/lib/spell-link";
import dictionary from "@/lib/refs/dictionary.json";

const CYRILLIC = /[а-яіїєґ]/i;
const TRANSLATIONS_DIR = join(process.cwd(), "data/2014/beyond-srd-uk");
/// 78 після KR23.5 плюс девʼять статей глав 1 і 4 PHB (KR29.1, перекладені в KR29.2).
const EXPECTED_ARTICLES = 87;

/// Ця стаття тільки про 2014 — KR23.4 додав 2024-корпус (глави XDMG) у той самий файл, і без
/// звуження за ruleset тут порахувалося б 119, а не 87.
const beyondSrd = getBeyondSrdArticlesByRuleset("RULES_2014");
const body = beyondSrd.flatMap((article) => article.subsections.map((subsection) => subsection.content)).join("\n");

describe("KR23.2 — переклад варіантних правил 2014 поза SRD", () => {
  it("перекладає всі 87 статей без жодного англійського підрозділу", () => {
    expect(beyondSrd.length).toBe(EXPECTED_ARTICLES);
    expect(beyondSrd.filter((article) => !article.isTranslated).map((article) => article.id)).toEqual([]);

    for (const article of beyondSrd) {
      expect(article.title, article.id).toMatch(CYRILLIC);
      expect(article.summary, article.id).toMatch(CYRILLIC);
      for (const subsection of article.subsections) {
        expect(subsection.title, subsection.id).toMatch(CYRILLIC);
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

  it("пише складність кидка як «СК», а не «СЛ» (Р51)", () => {
    expect(body).toMatch(/зі СК \d+/);
    expect(body, "СЛ — застаріла форма; словник: DC = СК (Р51)").not.toMatch(/(?<!\p{L})СЛ(?!\p{L})/u);
  });

  it("вживає ті самі назви станів, що й CONDITIONS_DATA", () => {
    const stems: Record<string, string> = {
      Blinded: "Засліплен",
      Exhaustion: "Виснаж",
      Frightened: "Налякан",
      Incapacitated: "Недієздатн",
      Poisoned: "Отруєн",
      Prone: "Повален",
      Stunned: "Приголомшен",
      Unconscious: "Непритомн",
    };
    const conditions = new Map(
      CONDITIONS_DATA.filter((entry) => entry.ruleset === "RULES_2014").map((entry) => [entry.engName, entry.name])
    );

    for (const [engName, stem] of Object.entries(stems)) {
      expect(conditions.get(engName), `${engName} має бути у CONDITIONS_DATA`).toBeDefined();
      expect(conditions.get(engName)!.startsWith(stem), `${engName} → ${conditions.get(engName)}`).toBe(true);
      expect(body, `стан ${engName} має бути в корпусі як «${stem}…»`).toMatch(new RegExp(`${stem}[а-яіїєґʼ']*`));
    }
  });

  it("вживає терміни дій і правил зі словника, без паралельних назв", () => {
    expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.dash);
    expect(body).toContain(dictionary.DND_DICTIONARY.restAndRecovery.hitDie);
    expect(body).toContain(dictionary.DND_DICTIONARY.restAndRecovery.hitDice);
    expect(body).toContain(dictionary.DND_DICTIONARY.rules.proficiencyBonus.toLowerCase());
    expect(body).toContain(dictionary.DND_DICTIONARY.generalTerms.cover.toLowerCase());
    expect(body).toContain(dictionary.DND_DICTIONARY.generalTerms.inspiration);
    expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.opportunityAttack.toLowerCase());

    for (const forbidden of [/зачарован/i, /ошелешен/i, /спасброс/i, /бонус-екшн/i, /додаткова\s+дія/i]) {
      expect(body, `заборонений варіант ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it("лишає латиницю тільки всередині маркера оригіналу й назв заклинань", () => {
    for (const article of beyondSrd) {
      for (const subsection of article.subsections) {
        const bare = stripSpellAnchors(stripGlossaryMarkers(subsection.content)).replace(/\[[^\]]*\]/g, "");
        const latin = (bare.match(/[A-Za-z]{2,}/g) ?? []).filter((word) => word !== "CR");
        expect(latin, subsection.id).toEqual([]);
      }
    }
  });

  it("не ламає розмітку маркером оригіналу (Р20)", () => {
    for (const article of beyondSrd) {
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
});
