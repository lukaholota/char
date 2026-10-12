import { describe, expect, it, vi } from "vitest";
import { getAllClasses } from "@/lib/classesData";

vi.mock("server-only", () => ({}));

const { findArticleCatalogLinks } = await import("@/lib/optimization/article-catalog-links.server");

function findSubclassHref(classKey: string, subclassKey: string) {
  const characterClass = getAllClasses("RULES_2014").find((entry) => entry.key === classKey)!;
  const subclass = characterClass.subclasses.find((entry) => entry.key === subclassKey)!;
  return `/classes?class=${characterClass.classId}&subclass=${subclass.subclassId}`;
}

const article = (slug: string) => ({ articleId: `rpgbot-${slug}`, slug, ruleset: "RULES_2014" }) as Parameters<typeof findArticleCatalogLinks>[0];

describe("catalog links of an RPGbot article", () => {
  it("opens the subclass a dedicated guide is about, and Light never resolves to Twilight", async () => {
    expect((await findArticleCatalogLinks(article("rogue-inquisitive-2014"))).subjectHref).toBe(findSubclassHref("ROGUE_2014", "INQUISITIVE"));
    expect((await findArticleCatalogLinks(article("cleric-light-domain-2014"))).subjectHref).toBe(findSubclassHref("CLERIC_2014", "LIGHT_DOMAIN"));
  });

  it("links the bound subclass sections of a comparison article and gives it no single subject", async () => {
    const links = await findArticleCatalogLinks(article("rogue-subclasses-2014"));
    expect(links.subjectHref).toBeNull();
    expect(links.headingHrefs["section-inquisitive"]).toBe(findSubclassHref("ROGUE_2014", "INQUISITIVE"));
  });
});
