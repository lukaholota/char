import "server-only";
import { buildClassCardHref } from "@/lib/catalogs/reading-target";
import { getAllClasses, type ClassData, type SubclassData } from "@/lib/classesData";
import { readSliceBindings } from "./slice-reader";
import type { ArticleDocument, OptimizationRuleset } from "./types";

type Article = ArticleDocument["article"];
export type SubclassCardLink = { href: string; name: string };

export async function findArticleCatalogLinks(article: Article) {
  return { headingLinks: await findSubclassHeadingLinks(article.articleId), subject: findArticleSubclassLink(article) };
}

async function findSubclassHeadingLinks(articleId: string): Promise<Record<string, SubclassCardLink>> {
  const bindings = (await readSliceBindings()).filter((binding) => binding.articleId === articleId && binding.entity.kind === "subclass");
  return Object.fromEntries(bindings.flatMap(({ sectionId, entity }) => {
    const characterClass = getAllClasses(entity.ruleset).find((entry) => entry.key === entity.parentKey);
    const subclass = characterClass?.subclasses.find((entry) => entry.key === entity.entityKey);
    const link = characterClass && subclass ? buildSubclassCardLink(entity.ruleset, characterClass, subclass) : null;
    return link ? [[sectionId, link]] : [];
  }));
}

/** A subclass guide is named `<class>-<subclass words>-<edition>`; the words must be a run of the subclass slug, so `light` never picks Twilight. */
function findArticleSubclassLink(article: Pick<Article, "slug" | "ruleset">): SubclassCardLink | null {
  const name = article.slug.replace(/-(2014|2024)$/, "");
  const characterClass = getAllClasses(article.ruleset).find((entry) => name.startsWith(`${entry.slug}-`));
  if (!characterClass) return null;
  const subclassWords = `-${name.slice(characterClass.slug.length + 1)}-`;
  const matches = characterClass.subclasses.filter((subclass) => `-${subclass.slug}-`.includes(subclassWords));
  return matches.length === 1 ? buildSubclassCardLink(article.ruleset, characterClass, matches[0]) : null;
}

function buildSubclassCardLink(ruleset: OptimizationRuleset, characterClass: ClassData, subclass: SubclassData): SubclassCardLink | null {
  const href = buildClassCardHref(ruleset, characterClass.classId, subclass.subclassId);
  return href ? { href, name: subclass.name } : null;
}
