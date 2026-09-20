export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 24;

export function readDisplayName(raw: string): { displayName: string } | { error: string } {
  const displayName = raw.replace(/\s+/g, " ").trim();
  if (/\p{C}/u.test(displayName)) return { error: "Нік містить недопустимі символи" };
  if (displayName.length < MIN_DISPLAY_NAME_LENGTH) return { error: `Нік закороткий: від ${MIN_DISPLAY_NAME_LENGTH} символів` };
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) return { error: `Нік задовгий: до ${MAX_DISPLAY_NAME_LENGTH} символів` };
  return { displayName };
}
