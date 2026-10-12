import type { SpellRatingComment } from "./spell-rating-comment-markdown";

export type SpellRatingCommentBySlug = Record<string, SpellRatingComment>;

const loadedByListKey = new Map<string, Promise<SpellRatingCommentBySlug>>();

export function loadSpellRatingComments(listKey: string): Promise<SpellRatingCommentBySlug> {
  if (!/^[a-z-]+$/.test(listKey)) return Promise.resolve({});
  const cached = loadedByListKey.get(listKey);
  if (cached) return cached;
  const loading = import(`@/lib/generated/rpgbot-spell-comments/${listKey}.json`)
    .then((module: { default: SpellRatingCommentBySlug }) => module.default)
    .catch(() => {
      loadedByListKey.delete(listKey);
      return {};
    });
  loadedByListKey.set(listKey, loading);
  return loading;
}
