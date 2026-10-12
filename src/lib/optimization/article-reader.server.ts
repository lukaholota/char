import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { idSchema } from "./schema";
import { parseArticleDocument } from "./document";
import type { ArticleSummary } from "./types";

export async function readPublishedArticle(summary: ArticleSummary, directory = join(process.cwd(), "data/rpgbot/uk")) {
  const articleId = idSchema.parse(summary.articleId);
  const document = parseArticleDocument(JSON.parse(await readFile(join(directory, `${articleId}.json`), "utf8")));
  const article = document.article;
  if (article.articleId !== articleId || article.ruleset !== summary.ruleset || article.slug !== summary.slug ||
    article.publishedRevisionId !== summary.translationRevisionId) throw new Error(`Index/document mismatch: ${articleId}`);
  const revision = document.translations.find((entry) => entry.translationRevisionId === article.publishedRevisionId)!;
  if (revision.sourceRevisionId !== summary.sourceRevisionId) throw new Error(`Source revision mismatch: ${articleId}`);
  return { article, revision, ratings: document.ratings.filter((rating) => rating.translationRevisionId === revision.translationRevisionId),
    sourceRevision: document.sourceRevisions.find((source) => source.revisionId === revision.sourceRevisionId)! };
}
