import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { featTranslations } from "@/lib/refs/translation";

// FeatureSource enum values from backend
export type FeatureSource = 'CLASS' | 'SUBCLASS' | 'RACE' | 'SUBRACE' | 'BACKGROUND' | 'FEAT' | 'PERS' | 'CHOICE' | 'RACE_CHOICE' | 'INFUSION';

/**
 * Normalizes various source string formats to a canonical FeatureSource
 */
export function normalizeFeatureSource(raw: unknown): FeatureSource | null {
  if (typeof raw !== 'string' || !raw) return null;
  const upper = raw.toUpperCase().trim();
  
  // Direct enum matches
  if (upper === 'CLASS') return 'CLASS';
  if (upper === 'SUBCLASS') return 'SUBCLASS';
  if (upper === 'RACE') return 'RACE';
  if (upper === 'SUBRACE') return 'SUBRACE';
  if (upper === 'BACKGROUND') return 'BACKGROUND';
  if (upper === 'FEAT') return 'FEAT';
  if (upper === 'PERS') return 'PERS';
  if (upper === 'CHOICE') return 'CHOICE';
  if (upper === 'RACE_CHOICE' || upper === 'RACECHOICE') return 'RACE_CHOICE';
  if (upper === 'INFUSION') return 'INFUSION';
  
  // Legacy/alternative formats
  if (upper.includes('SUBCLASS')) return 'SUBCLASS';
  if (upper.includes('CLASS')) return 'CLASS';
  if (upper.includes('SUBRACE')) return 'SUBRACE';
  if (upper.includes('RACE')) return 'RACE';
  if (upper.includes('BACKGROUND') || upper.includes('BG')) return 'BACKGROUND';
  if (upper.includes('FEAT')) return 'FEAT';
  if (upper.includes('CUSTOM') || upper.includes('PERS')) return 'PERS';
  if (upper.includes('CHOICE')) return 'CHOICE';
  
  return null;
}

/**
 * Returns Ukrainian label for feature source
 */
export function getFeatureSourceLabel(source: FeatureSource): string {
  switch (source) {
    case 'CLASS': return 'Клас';
    case 'SUBCLASS': return 'Підклас';
    case 'RACE': return 'Раса';
    case 'SUBRACE': return 'Субраса';
    case 'BACKGROUND': return 'Бек';
    case 'FEAT': return 'Риса';
    case 'CHOICE':
    case 'RACE_CHOICE': return 'Вибір';
    case 'PERS': return 'Кастом';
    case 'INFUSION': return 'Вливання';
    default: return '';
  }
}

/**
 * Translates a feat name to Ukrainian if a translation exists
 */
export function translateFeatName(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const normalized = raw
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return featTranslations[raw] ?? featTranslations[raw.toUpperCase()] ?? featTranslations[normalized] ?? raw;
}

/**
 * Check if source is class-related for styling
 */
export function isClassRelatedSource(source: FeatureSource | null): boolean {
  return source === 'CLASS' || source === 'SUBCLASS';
}

/**
 * Calculates the display name for a feature, applying translations where appropriate
 */
export function getFeatureDisplayName(name: string, source: string | null | undefined): string {
  const normalizedSource = normalizeFeatureSource(source);
  return normalizedSource === 'FEAT' ? translateFeatName(name) : name;
}

/**
 * Strips markdown from a string for preview purposes
 */
export function stripMarkdownPreview(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[^\S\r\n]+/g, " ") // Collapse horizontal whitespace
    .replace(/\n\s*\n/g, "\n")   // Collapse multiple newlines
    .trim();
}

type FeatureText = {
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  source?: string | null;
  sourceName?: string | null;
};

/// Сіди 2024 пишуть у `shortDescription` саму назву фічі, і картка під назвою повторювала її
/// ж. Такий короткий опис нічого не каже — замість нього показується початок повного.
export function findFeaturePreview(feature: FeatureText): string {
  const short = toPlainPreview(feature.shortDescription);
  if (short && !isSameWording(short, feature.name)) return short;

  const full = toPlainPreview(feature.description);
  return isSameWording(full, feature.name) ? "" : full;
}

export function filterFeaturesByQuery<T extends FeatureText>(features: T[], query: string): T[] {
  const needle = normalizeSearchText(query);
  if (!needle) return features;
  return features.filter((feature) => normalizeSearchText(collectSearchableText(feature)).includes(needle));
}

const collectSearchableText = (feature: FeatureText): string =>
  [
    feature.name,
    getFeatureDisplayName(feature.name, feature.source),
    feature.sourceName,
    toPlainPreview(feature.shortDescription),
    toPlainPreview(feature.description),
  ].join("\n");

const toPlainPreview = (value: string | null | undefined): string =>
  value ? stripMarkdownPreview(stripGlossaryMarkers(value)).replace(/[*_]+/g, "") : "";

const isSameWording = (left: string, right: string): boolean => toWording(left) === toWording(right);

const toWording = (value: string): string =>
  String(value ?? "").toLocaleLowerCase("uk").replace(/[^\p{L}\p{N}]+/gu, "");

const normalizeSearchText = (value: string): string =>
  value.toLocaleLowerCase("uk").replace(/['’ʼ]/g, "ʼ").replace(/\s+/g, " ").trim();
