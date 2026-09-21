import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { getObjects } from "@/lib/objectsData";
import { expandGlossaryMarkersToHtml, findGlossaryMarkers, stripGlossaryMarkers } from "@/lib/refs/glossary-marker";

const CYRILLIC = /[а-яіїєґ]/i;
const TRANSLATIONS_DIR_2014 = join(process.cwd(), "data/2014/objects-uk");
const TRANSLATIONS_DIR_2024 = join(process.cwd(), "data/2024/objects-uk");

const objects2014 = getObjects("RULES_2014");
const objects2024 = getObjects("RULES_2024");
const all = [...objects2014, ...objects2024];
const body2014 = objects2014.flatMap((a) => a.subsections.map((s) => s.content)).join("\n");
const body2024 = objects2024.flatMap((a) => a.subsections.map((s) => s.content)).join("\n");

describe("KR23.5 — переклад обʼєктів поза SRD", () => {
  it("перекладає всі 17 записів без жодного англійського підрозділу", () => {
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

  /// Не всі 17 записів мають рятівний кидок (більшість — чистий кидок атаки), тому перевіряємо
  /// лише напрямок: якщо термін узагалі трапляється, це має бути термін своєї редакції.
  it("пише складність кидка як «СК» в обох редакціях (Р51)", () => {
    expect(body2014).toMatch(/СК \d+/);
    expect(body2024).toMatch(/СК \d+/);
    expect(body2014, "СЛ — застаріла форма; словник: DC = СК (Р51)").not.toMatch(/(?<!\p{L})СЛ(?!\p{L})/u);
    expect(body2024, "СЛ — застаріла форма; словник: DC = СК (Р51)").not.toMatch(/(?<!\p{L})СЛ(?!\p{L})/u);
  });

  it("лишає латиницю тільки всередині маркера оригіналу", () => {
    for (const article of all) {
      for (const subsection of article.subsections) {
        const bare = stripGlossaryMarkers(subsection.content);
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
});
