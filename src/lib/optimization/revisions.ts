import { sourceRevisionSchema } from "./schema";
import { requireValidCorpus } from "./validation";
import type { Corpus, EntityRef, SourceRevision } from "./types";

export function applySourceRevision(corpus: Corpus, input: SourceRevision, catalog: readonly EntityRef[] = []): Corpus {
  const revision = sourceRevisionSchema.parse(input);
  const existing = corpus.sourceRevisions.find((entry) => entry.revisionId === revision.revisionId);
  if (existing && JSON.stringify(sourceRevisionSchema.parse(existing)) !== JSON.stringify(revision)) throw new Error("Source revisions are immutable");
  if (existing) return requireValidCorpus(corpus, catalog);
  const sourceRevisions = [...corpus.sourceRevisions, revision];
  const translations = corpus.translations.map((translation) => {
    const source = corpus.sourceRevisions.find((entry) => entry.revisionId === translation.sourceRevisionId);
    if (source?.sourceId !== revision.sourceId || source.contentHash === revision.contentHash) return translation;
    return { ...translation, status: "stale" as const };
  });
  return requireValidCorpus({ ...corpus, sourceRevisions, translations }, catalog);
}
