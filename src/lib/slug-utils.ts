/**
 * Utility functions for entity slug generation and matching.
 */

/**
 * Converts an English entity name or string into a URL-friendly kebab-case slug.
 * Example: "Hand Crossbow" -> "hand-crossbow"
 * Example: "Armor of Shadows" -> "armor-of-shadows"
 * Example: "Replicate Magic Item" -> "replicate-magic-item"
 */
export function toEntitySlug(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
