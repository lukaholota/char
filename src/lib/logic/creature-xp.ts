const XP_SUFFIX = /\s*XP$/i;

export function formatCreatureXp(xp: string | null | undefined): string | null {
  const amount = xp?.trim().replace(XP_SUFFIX, "");
  if (!amount || amount === "-") return null;
  return `${amount} XP`;
}
