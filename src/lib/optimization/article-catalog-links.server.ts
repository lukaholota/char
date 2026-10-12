import "server-only";
import { buildClassCardHref } from "@/lib/catalogs/reading-target";
import { getAllClasses } from "@/lib/classesData";
import { readSliceBindings } from "./slice-reader";
import type { ArticleDocument } from "./types";

type Article = ArticleDocument["article"];

export async function findArticleCatalogLinks(article: Article) {
  return { headingHrefs: await findSubclassHeadingHrefs(article.articleId), subjectHref: findArticleSubclassHref(article) };
}

async function findSubclassHeadingHrefs(articleId: string): Promise<Record<string, string>> {
  const bindings = (await readSliceBindings()).filter((binding) => binding.articleId === articleId && binding.entity.kind === "subclass");
  return Object.fromEntries(bindings.flatMap(({ sectionId, entity }) => {
    const characterClass = getAllClasses(entity.ruleset).find((entry) => entry.key === entity.parentKey);
    const subclass = characterClass?.subclasses.find((entry) => entry.key === entity.entityKey);
    const href = characterClass && subclass ? buildClassCardHref(entity.ruleset, characterClass.classId, subclass.subclassId) : null;
    return href ? [[sectionId, href]] : [];
  }));
}

/** A subclass guide is named `<class>-<subclass words>-<edition>`; the words must be a run of the subclass slug, so `light` never picks Twilight. */
function findArticleSubclassHref(article: Pick<Article, "slug" | "ruleset">): string | null {
  const name = article.slug.replace(/-(2014|2024)$/, "");
  const characterClass = getAllClasses(article.ruleset).find((entry) => name.startsWith(`${entry.slug}-`));
  if (!characterClass) return null;
  const subclassWords = `-${name.slice(characterClass.slug.length + 1)}-`;
  const matches = characterClass.subclasses.filter((subclass) => `-${subclass.slug}-`.includes(subclassWords));
  return matches.length === 1 ? buildClassCardHref(article.ruleset, characterClass.classId, matches[0].subclassId) : null;
}
