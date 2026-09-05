import { describe, expect, it } from "vitest";

import { MIRROR_REVISION } from "../../scripts/5etools/mirror";
import { getObjects } from "@/lib/objectsData";
import { findHandwrittenArticles } from "@/lib/rulesData";
import { getImportedRuleArticles2014 } from "@/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "@/lib/rules2024Data";
import { getBeyondSrdArticles } from "@/lib/rulesBeyondSrdData";
import { getTrapsHazards } from "@/lib/trapsHazardsData";

const EXPECTED_2014 = 7;
const EXPECTED_2024 = 10;

const objects2014 = getObjects("RULES_2014");
const objects2024 = getObjects("RULES_2024");
const all = [...objects2014, ...objects2024];

describe("KR23.5 — обʼєкти-статблоки поза SRD, обидві редакції", () => {
  it("імпортує 17 облогових знарядь після звірки з наявним корпусом", () => {
    expect(objects2014.length).toBe(EXPECTED_2014);
    expect(objects2024.length).toBe(EXPECTED_2024);
  });

  it("редакція збігається з книгою: DMG → 2014, XDMG → 2024", () => {
    for (const article of objects2014) expect(article.provenance.book, article.slug).toBe("DMG");
    for (const article of objects2024) expect(article.provenance.book, article.slug).toBe("XDMG");
  });

  /// `Generic Object` (DMG, `srd: true`) — та сама стаття «Objects» зі SRD 5.1; три хвости
  /// `Eldritch Cannon` (TCE) — та сама проза, що вже стоїть у рисі підкласу «Містична гармата»
  /// (`prisma/seed/subclassFeatureSeed.ts`). Жоден із чотирьох прапорця `srd` не має — дублі
  /// спіймано звіркою заголовка й тексту, не фільтром (журнал KR23.5).
  it("не бере Generic Object і трьох Eldritch Cannon — вони вже в довіднику під іншою формою", () => {
    const titles = all.map((article) => article.engTitle);
    expect(titles).not.toContain("Generic Object");
    expect(titles).not.toContain("Eldritch Cannon, Flamethrower");
    expect(titles).not.toContain("Eldritch Cannon, Force Ballista");
    expect(titles).not.toContain("Eldritch Cannon, Protector");
  });

  it("несе походження beyond-srd з пінованою ревізією, книгою, сторінкою й URL на objects.html", () => {
    for (const article of all) {
      expect(article.provenance.kind, article.slug).toBe("beyond-srd");
      expect(article.provenance.revision).toBe(MIRROR_REVISION);
      expect(article.provenance.page).toBeGreaterThan(0);
      expect(article.provenance.url).toContain("5e.tools/objects");
    }
  });

  it("не краде слагів у статей SRD, рукописних і вже імпортованих поза SRD", () => {
    const reserved2014 = new Set([
      ...findHandwrittenArticles("RULES_2014").map((a) => a.slug),
      ...getImportedRuleArticles2014().map((a) => a.slug),
      ...getBeyondSrdArticles().map((a) => a.slug),
      ...getTrapsHazards("RULES_2014").map((a) => a.slug),
    ]);
    const reserved2024 = new Set([
      ...findHandwrittenArticles("RULES_2024").map((a) => a.slug),
      ...getImportedRuleArticles2024().map((a) => a.slug),
      ...getTrapsHazards("RULES_2024").map((a) => a.slug),
    ]);

    for (const article of objects2014) expect(reserved2014.has(article.slug), article.slug).toBe(false);
    for (const article of objects2024) expect(reserved2024.has(article.slug), article.slug).toBe(false);

    /// 2014 і 2024 рендеряться на різних сторінках, тому той самий слаг («ballista» в обох)
    /// не конфліктує — набір зайнятих слагів окремий на редакцію, як у traps-hazards.ts.
    const slugs2014 = objects2014.map((a) => a.slug);
    const slugs2024 = objects2024.map((a) => a.slug);
    expect(new Set(slugs2014).size).toBe(slugs2014.length);
    expect(new Set(slugs2024).size).toBe(slugs2024.length);
  });

  it("кожен запис має непорожні підрозділи з унікальними якорями, опис завжди перший", () => {
    for (const article of all) {
      expect(article.subsections.length, article.slug).toBeGreaterThan(0);
      expect(article.subsections[0].id, article.slug).toBe(`${article.slug}--description`);

      const ids = article.subsections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const subsection of article.subsections) {
        expect(subsection.content.trim().length, subsection.id).toBeGreaterThan(0);
        expect(subsection.id.startsWith(`${article.slug}--`), subsection.id).toBe(true);
      }
    }
  });

  it("розмітка 5etools розкладена, а не протягнута як є", () => {
    const body = all.flatMap((article) => article.subsections.map((s) => s.content)).join("\n");
    expect(body).not.toMatch(/\{@\w+/);
  });

  it("несе КЗ, ХП і розмір — числові поля статблока, не текст", () => {
    for (const article of all) {
      expect(article.ac, article.slug).toBeGreaterThan(0);
      expect(article.hp, article.slug).toBeGreaterThan(0);
      expect(article.size.length, article.slug).toBeGreaterThan(0);
      expect(article.objectType, article.slug).toBe("SW");
    }
  });

  it("усі 17 записів перекладені", () => {
    for (const article of all) expect(article.isTranslated, article.slug).toBe(true);
  });
});
