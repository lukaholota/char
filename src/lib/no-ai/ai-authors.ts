/// Акаунти, що публікують згенерований ШІ вміст (967 — ostap_chatgpt): у режимі «без ШІ» їхні хоумбрю й коментарі приховані.
export const AI_AUTHOR_USER_IDS = [967];

export function excludeAiAuthorIds(hideAiAuthors: boolean): { notIn: number[] } | undefined {
  return hideAiAuthors ? { notIn: AI_AUTHOR_USER_IDS } : undefined;
}
