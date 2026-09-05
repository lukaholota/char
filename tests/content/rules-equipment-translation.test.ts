import { describe, expect, it } from "vitest";

import { getImportedRuleArticles2014 } from "@/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "@/lib/rules2024Data";
import {
  expandGlossaryMarkersToHtml,
  findGlossaryMarkers,
  stripGlossaryMarkers,
} from "@/lib/refs/glossary-marker";
import dictionary from "@/lib/refs/dictionary.json";
import { ImportedRuleArticle } from "@/lib/rulesProvenance";
import { stripSpellAnchors } from "@/lib/spell-link";

const CYRILLIC = /[а-яіїєґ]/i;

const EQUIPMENT_2014_SLUGS = [
  "armor",
  "weapons",
  "adventuring-gear",
  "tools",
  "mounts-and-vehicles",
  "trade-goods",
  "expenses",
  "selling-treasure",
];

const equipment2014 = getImportedRuleArticles2014().filter((article) =>
  EQUIPMENT_2014_SLUGS.includes(article.slug)
);
const equipment2024 = getImportedRuleArticles2024().filter(
  (article) => "file" in article.provenance && article.provenance.file === "equipment.md"
);
const all = [...equipment2014, ...equipment2024];

function joinContent(articles: ImportedRuleArticle[]): string {
  return articles.flatMap((article) => article.subsections.map((subsection) => subsection.content)).join("\n");
}

/// Маркер оригіналу, назва в квадратних дужках і маршрут каталогу — три місця, де латиниця
/// дозволена рішенням, а не недоглядом. Маршрут приходить і markdown-посиланням `(/…)`, і
/// якорем на заклинання `<a href="/…">` — його знімає `stripSpellAnchors` зі spell-link.ts, одне
/// визначення на всі гейти. Решта латиниці в тілі статті — недоперекладений шматок.
function stripAllowedLatin(content: string): string {
  const withoutMarkers = stripGlossaryMarkers(content)
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\((\/[^)]*)\)/g, "");
  return stripSpellAnchors(withoutMarkers);
}

describe("KR20.8 — переклад спорядження обох редакцій", () => {
  it("не лишає жодної статті спорядження без перекладу", () => {
    expect(equipment2014.length).toBe(8);
    expect(equipment2024.length).toBe(14);

    for (const article of all) {
      expect(article.isTranslated, article.id).toBe(true);
      expect(article.title, article.id).toMatch(CYRILLIC);
      expect(article.summary, article.id).toMatch(CYRILLIC);
      for (const subsection of article.subsections) {
        expect(subsection.title, subsection.id).toMatch(CYRILLIC);
        expect(subsection.content, subsection.id).toMatch(CYRILLIC);
      }
    }
  });

  it("лишає латиницю тільки в маркері оригіналу, дужках назви й маршруті каталогу", () => {
    for (const article of all) {
      for (const subsection of article.subsections) {
        const latin = stripAllowedLatin(subsection.content).match(/[A-Za-z]{2,}/g) ?? [];
        expect(latin, subsection.id).toEqual([]);
      }
    }
  });

  it("не ламає розмітку маркером оригіналу (Р20)", () => {
    for (const article of all) {
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

  it("бере назви властивостей і майстерності зброї зі словника, а не свої", () => {
    const body = joinContent(all);
    for (const property of Object.values(dictionary.CONTENT_TRANSLATIONS.weaponPropertyTranslations)) {
      if (["Магічна", "Перезарядка", "Черга"].includes(property)) continue;
      expect(body, `властивість «${property}»`).toContain(property);
    }
    for (const mastery of Object.values(dictionary.DND_DICTIONARY.rules2024.weaponMasteryProperties)) {
      expect(joinContent(equipment2024), `майстерність «${mastery}»`).toContain(mastery.split(" (")[0]);
    }
  });

  it("бере назви обладунків і наборів спорядження зі словника", () => {
    const body2014 = joinContent(equipment2014);
    for (const armor of ["Стьобаний", "Проклепаний шкіряний", "Кольчужна сорочка", "Напівлати", "Кольчуга"]) {
      expect(body2014, `обладунок «${armor}»`).toContain(armor);
    }
    for (const pack of Object.values(dictionary.CONTENT_TRANSLATIONS.equipmentCategoryTranslations)) {
      if (["Хоумбрю", "Книга заклять", "Мішечок компонентів"].includes(pack)) continue;
      expect(body2014, `набір «${pack}»`).toContain(pack);
    }
  });

  it("тримає редакційну термінологію: 2014 — СЛ, 2024 — СК", () => {
    const body2014 = joinContent(equipment2014);
    const body2024 = joinContent(equipment2024);

    expect(body2014).toMatch(/зі СЛ \d+/);
    expect(body2014, "СК — термін корпусу 2024").not.toMatch(/(?<![\p{L}])СК \d+/u);
    expect(body2024).toMatch(/(?<![\p{L}])СК \d+/u);
    expect(body2024, "СЛ — термін корпусу 2014").not.toMatch(/(?<![\p{L}])СЛ \d+/u);
  });

  it("не заводить паралельних назв там, де термін уже ратифікований", () => {
    const body = joinContent(all);
    for (const forbidden of [
      /додаткова\s+дія/i,
      /зачарован/i,
      /ошелешен/i,
      /спасброс/i,
      /сумка компонентів/i,
      /книга заклинань/i,
    ]) {
      expect(body, `заборонений варіант ${forbidden}`).not.toMatch(forbidden);
    }
  });
});
