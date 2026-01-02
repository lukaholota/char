import {
  abilityTranslations,
  featTranslations,
  skillTranslations,
  toolTranslations,
  weaponPropertyTranslations,
} from "@/lib/refs/translation";

const tokenMaps: Array<Record<string, string>> = [
  featTranslations,
  skillTranslations,
  abilityTranslations,
  weaponPropertyTranslations,
  toolTranslations,
];

function translateToken(token: string): string {
  for (const map of tokenMaps) {
    const v = map[token];
    if (v) return v;
  }
  return token;
}

export function translatePdfText(input: string): string {
  const s = String(input ?? "");
  if (!s) return "";

  // Translate enum-like tokens that appear in PDFs (e.g. ACROBATICS, SKILL_EXPERT).
  // Only replaces exact token matches; unknown tokens are kept as-is.
  return s.replace(/\b[A-Z][A-Z0-9_]{2,}\b/g, (token) => translateToken(token));
}
