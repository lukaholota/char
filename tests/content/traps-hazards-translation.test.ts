import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { getTrapsHazards } from "@/lib/trapsHazardsData";
import { expandGlossaryMarkersToHtml, findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

const CYRILLIC = /[а-яіїєґ]/i;
const TRANSLATIONS_DIR_2014 = join(process.cwd(), "data/2014/traps-hazards-uk");
const TRANSLATIONS_DIR_2024 = join(process.cwd(), "data/2024/traps-hazards-uk");

const traps2014 = getTrapsHazards("RULES_2014");
const traps2024 = getTrapsHazards("RULES_2024");
const all = [...traps2014, ...traps2024];
const body2014 = traps2014.flatMap((a) => a.subsections.map((s) => s.content)).join("\n");
const body2024 = traps2024.flatMap((a) => a.subsections.map((s) => s.content)).join("\n");

describe("KR23.3 — переклад пасток і небезпек поза SRD", () => {
  it("перекладає всі 51 запис без жодного англійського підрозділу", () => {
    expect(all.filter((article) => !article.isTranslated).map((article) => article.id)).toEqual([]);

    for (const article of all) {
      expect(article.title, article.id).toMatch(CYRILLIC);
      for (const subsection of article.subsections) {
        expect(subsection.content, subsection.id).toMatch(CYRILLIC);
      }
    }
  });

  it("не має жодного id двічі між партіями, кожної редакції", () => {
    for (const dir of [TRANSLATIONS_DIR_2014, TRANSLATIONS_DIR_2024]) {
      const seen = new Set<string>();
      for (const fileName of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
        const batch = JSON.parse(readFileSync(join(dir, fileName), "utf-8")) as Record<string, unknown>;
        for (const articleId of Object.keys(batch)) {
          expect(seen.has(articleId), `${articleId} трапляється двічі (${fileName})`).toBe(false);
          seen.add(articleId);
        }
      }
    }
  });

  it("тримає редакційну термінологію: 2014 — СЛ, 2024 — СК", () => {
    expect(body2014).toMatch(/зі СЛ \d+/);
    expect(body2014, "СК — це термін корпусу 2024").not.toMatch(/\bСК \d+/);

    expect(body2024).toMatch(/зі СК \d+/);
    expect(body2024, "СЛ — це термін корпусу 2014").not.toMatch(/\bСЛ \d+/);
  });

  it("лишає латиницю тільки всередині маркера оригіналу й назв заклинань/предметів", () => {
    for (const article of all) {
      for (const subsection of article.subsections) {
        const bare = stripGlossaryMarkers(subsection.content).replace(/\[[^\]]*\]/g, "");
        const latin = (bare.match(/[A-Za-z]{2,}/g) ?? []).filter((word) => word !== "CR");
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

  it("вживає ратифіковані терміни зі словника: злодійські інструменти, а не власний варіант", () => {
    expect(body2014).toContain("інструментами злодія");
    for (const forbidden of [/інструментами злодіїв/i, /ковалівськ/i]) {
      expect(body2014 + body2024, `заборонений варіант ${forbidden}`).not.toMatch(forbidden);
    }
  });
});
