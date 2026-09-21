import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { getImportedRuleArticles2014 } from "@/lib/rules2014Data";
import { CONDITIONS_DATA, findHandwrittenArticles } from "@/lib/rulesData";
import dictionary from "@/lib/refs/dictionary.json";

const CYRILLIC = /[а-яіїєґ]/i;
const TRANSLATIONS_DIR = join(process.cwd(), "data/2014/rules-uk");
const imported = getImportedRuleArticles2014();

/// KR20.7 приніс вісім статей спорядження англійською, KR20.8 їх переклав — тому гейт більше не тримає
/// списку винятків: усі 53 імпортовані статті мають бути українською.
const translated = imported;

describe("KR20.2 + KR20.8 — переклад SRD 5.1 українською", () => {
  it("перекладає всі 53 статті без жодного англійського підрозділу", () => {
    expect(translated.length).toBe(53);
    expect(translated.filter((article) => !article.isTranslated).map((article) => article.id)).toEqual([]);

    for (const article of translated) {
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
    expect(seen.size).toBe(53);
  });

  it("вживає ті самі назви станів, що й CONDITIONS_DATA", () => {
    const conditionsArticle = imported.find((article) => article.slug === "conditions");
    expect(conditionsArticle).toBeDefined();

    const titles = conditionsArticle!.subsections.map((subsection) => subsection.title);
    for (const condition of CONDITIONS_DATA.filter((entry) => entry.ruleset === "RULES_2014")) {
      if (condition.engName === "Exhaustion") {
        expect(titles).toContain("Виснаження");
        continue;
      }
      expect(titles, condition.engName).toContain(condition.name);
    }
  });

  it("вживає терміни дій зі словника, без паралельних назв", () => {
    const body = imported
      .flatMap((article) => [article.title, article.summary, ...article.subsections.map((s) => s.content)])
      .join("\n");

    expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.dash);
    expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.disengage);
    expect(body).toContain(dictionary.DND_DICTIONARY.combatActions.dodge);
    expect(body).toContain(dictionary.DND_DICTIONARY.rules.proficiencyBonus.toLowerCase());

    for (const forbidden of [/додаткова\s+дія/i, /зачарован/i, /ошелешен/i, /спасброс/i, /бонус-екшн/i]) {
      expect(body, `заборонений варіант ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it("пише складність кидка як «СК», а не «СЛ» (Р51)", () => {
    const body = imported.flatMap((article) => article.subsections.map((s) => s.content)).join("\n");

    expect(body).toMatch(/зі СК \d+/);
    expect(body, "СЛ — застаріла форма; словник: DC = СК (Р51)").not.toMatch(/(?<!\p{L})СЛ(?!\p{L})/u);
  });

  it("не чіпає слаги рукописних статей, які пережили зведення дублів (KR20.4)", () => {
    const handwritten = new Set(findHandwrittenArticles("RULES_2014").map((article) => article.slug));
    for (const article of imported) {
      expect(handwritten.has(article.slug), article.slug).toBe(false);
    }
  });
});
