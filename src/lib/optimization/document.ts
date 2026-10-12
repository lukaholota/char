import { documentSchema } from "./schema";
import { requireValidCorpus } from "./validation";

export function parseArticleDocument(input: unknown) {
  const document = documentSchema.parse(input);
  requireValidCorpus({ schemaVersion: 1, sources: document.sources, sourceRevisions: document.sourceRevisions,
    articles: [document.article], translations: document.translations, ratings: document.ratings, bindings: [], recipes: [] });
  return document;
}
