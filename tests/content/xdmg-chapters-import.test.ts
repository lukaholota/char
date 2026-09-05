import { describe, expect, it } from "vitest";

import { MIRROR_REVISION } from "../../scripts/5etools/mirror";
import { getBeyondSrdArticlesByRuleset } from "@/lib/rulesBeyondSrdData";
import { getAllRuleArticles2024, getImportedRuleArticles2024 } from "@/lib/rules2024Data";
import { findHandwrittenArticles, RULE_CATEGORIES } from "@/lib/rulesData";
import { isBeyondSrd, isFromSrd } from "@/lib/rulesProvenance";

const EXPECTED_ARTICLES = 32;
const EXPECTED_PER_CATEGORY = {
  gamemaster: 26,
  adventuring: 4,
  combat: 1,
  equipment: 1,
  spellcasting: 0,
  abilities: 0,
  conditions: 0,
};

const xdmg = getBeyondSrdArticlesByRuleset("RULES_2024");

describe("KR23.4 — DMG 2024 глави 1–3 з book-xdmg.json", () => {
  it("імпортує 32 підрозділи з 40 у главах 1–3 після звірки з наявним корпусом", () => {
    expect(xdmg.length).toBe(EXPECTED_ARTICLES);

    const counted = Object.fromEntries(
      RULE_CATEGORIES.map((category) => [
        category.key,
        xdmg.filter((article) => article.category === category.key).length,
      ])
    );
    expect(counted).toEqual(EXPECTED_PER_CATEGORY);
  });

  it("несе походження XDMG з пінованою ревізією, редакцію RULES_2024, і не стоїть під CC BY 4.0", () => {
    for (const article of xdmg) {
      expect(article.ruleset, article.slug).toBe("RULES_2024");
      expect(article.provenance.kind, article.slug).toBe("beyond-srd");
      expect(isBeyondSrd(article.provenance)).toBe(true);
      expect(isFromSrd(article.provenance)).toBe(false);

      if (article.provenance.kind !== "beyond-srd") throw new Error("очікували beyond-srd");
      expect(article.provenance.revision).toBe(MIRROR_REVISION);
      expect(article.provenance.book).toBe("XDMG");
      expect(article.provenance.page).toBeGreaterThan(0);
      expect(article.provenance.url).toContain("5e.tools/book.html#xdmg,");
    }
  });

  /// SRD 5.2.1 «Gameplay Toolbox» (`data/2024/srd/gameplay-toolbox.md`) уже друкує ці сім
  /// підрозділів майже дослівно (KR23.4, журнал: ≥45% абзаців — точний збіг попри інший
  /// синтаксис заголовків), а «Environmental Effects»/«Hazards»/«Siege Equipment» — не проза, а
  /// покажчик імен, усі вже статті чи статблоки з інших конвеєрів (KR20.7/23.1/23.3/23.5).
  it("не бере вісім підрозділів, які книга DMG 2024 дублює з наявного корпусу", () => {
    const titles = xdmg.map((article) => article.engTitle);
    const excludedDuplicates = [
      "Creating a Background",
      "Curses and Magical Contagions",
      "Fear and Mental Stress",
      "Poison",
      "Traps",
      "Environmental Effects",
      "Hazards",
      "Siege Equipment",
    ];
    for (const title of excludedDuplicates) expect(titles, title).not.toContain(title);

    expect(titles).toContain("Alignment");
    expect(titles).toContain("Nonplayer Characters");
    expect(titles).toContain("Renown");
  });

  it("не краде слагів у статей SRD 2024, рукописних і власного 2014-корпусу поза SRD", () => {
    const all = getAllRuleArticles2024();
    const slugs = all.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(all.length).toBeGreaterThan(xdmg.length + getImportedRuleArticles2024().length);

    /// «Alignment» і «Renown» уже існують у 2014-корпусі поза SRD (DMG-варіант «Renown» і
    /// SRD-глосарій «Alignment») — слаг мусив отримати кваліфікатор `-xdmg`, інакше друга
    /// стаття тихо вкрала б якір першої.
    const bySlug = new Map(xdmg.map((article) => [article.engTitle, article.slug]));
    expect(bySlug.get("Alignment")).toBe("alignment-xdmg");
    expect(bySlug.get("Renown")).toBe("renown-xdmg");
  });

  it("кожна стаття має непорожні підрозділи з унікальними якорями", () => {
    for (const article of xdmg) {
      expect(article.subsections.length, article.slug).toBeGreaterThan(0);
      const ids = article.subsections.map((subsection) => subsection.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const subsection of article.subsections) {
        expect(subsection.content.trim().length, subsection.id).toBeGreaterThan(0);
        expect(subsection.id.startsWith(`${article.slug}--`), subsection.id).toBe(true);
      }
    }
  });

  it("розмітка 5etools розкладена, а не протягнута як є", () => {
    const body = xdmg
      .flatMap((article) => article.subsections.map((subsection) => subsection.content))
      .join("\n");

    expect(body).not.toMatch(/\{@\w+/);
  });

  it("не заходить у категорії, яких у главах 1–3 немає", () => {
    for (const article of xdmg) {
      expect(["gamemaster", "adventuring", "combat", "equipment"]).toContain(article.category);
    }
  });

  it("рукописні статті 2024 не перетнулися з новим корпусом", () => {
    const handwritten = findHandwrittenArticles("RULES_2024");
    const handwrittenTitles = new Set(handwritten.map((article) => article.engTitle));
    for (const article of xdmg) expect(handwrittenTitles.has(article.engTitle), article.slug).toBe(false);
  });
});
