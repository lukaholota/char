export function listTocSubsections<T extends { title: string }>(article: { title: string; subsections: readonly T[] }): T[] {
  const title = article.title.trim().toLocaleLowerCase("uk");
  return article.subsections.filter((section) => section.title.trim().toLocaleLowerCase("uk") !== title);
}
