import { stripNoAiPrefix } from "@/lib/no-ai/no-ai-route";

export const RPGBOT_SURFACES = [
  "article_index", "article_reader", "subclass_analysis", "feature_analysis",
  "preset_gallery", "preset_review", "preset_name", "preset_customize", "preset_suggestion", "build_tree", "creator_header",
  "spell_picker", "spell_catalog", "spell_rating_panel", "home_tile", "menu", "rules_hub",
] as const;
export type RpgbotSurface = (typeof RPGBOT_SURFACES)[number];

export const RPGBOT_CTAS = [
  "article_card", "sidebar_article", "open_article", "open_original", "open_ukrainian_article",
  "create_from_preset", "open_gallery", "assemble_build", "open_full_example", "open_catalog", "open_index",
] as const;
export type RpgbotCta = (typeof RPGBOT_CTAS)[number];

export type RpgbotPlacement = "catalog" | "creator";
export const READ_DEPTH_MILESTONES = [25, 50, 75, 100] as const;
export type ReadDepthMilestone = (typeof READ_DEPTH_MILESTONES)[number];

export type RpgbotCtaClick = { cta: RpgbotCta; surface: RpgbotSurface; ref?: string };

export const PRESET_ENTRIES = ["gallery", "suggestion", "subclass_analysis", "search"] as const;
export type PresetEntry = (typeof PRESET_ENTRIES)[number] | "direct";

export type PresetAbandonStage = "review" | "name" | "submitting" | `customize_${string}`;

export type ArticleLinkKind = "catalog" | "original" | "reference" | "article" | "other";

export function buildRpgbotCtaProps(cta: RpgbotCta, surface: RpgbotSurface, ref?: string) {
  return { "data-rpgbot-cta": cta, "data-rpgbot-surface": surface, ...(ref ? { "data-rpgbot-ref": ref } : {}) };
}

export function findRpgbotCtaClick(target: EventTarget | null): RpgbotCtaClick | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>("[data-rpgbot-cta]");
  const cta = element?.dataset.rpgbotCta;
  const surface = element?.dataset.rpgbotSurface;
  if (!isRpgbotCta(cta) || !isRpgbotSurface(surface)) return null;
  const ref = element?.dataset.rpgbotRef;
  return { cta, surface, ...(ref ? { ref } : {}) };
}

export function findReachedReadDepth(seenCount: number, totalCount: number, alreadyReported: readonly number[]): ReadDepthMilestone[] {
  if (totalCount === 0) return [];
  const percent = (seenCount / totalCount) * 100;
  return READ_DEPTH_MILESTONES.filter((milestone) => percent >= milestone && !alreadyReported.includes(milestone));
}

const PRESET_SECTION_FIELDS = {
  abilities: ["asi"],
  skills: ["skillsSchema"],
  expertise: ["expertiseSchema"],
  choices: ["classChoiceSelections", "subclassChoiceSelections", "raceChoiceSelections"],
  // initialPreparedSpellIds is left out: the page trims it on its own for higher-level starts.
  spells: ["classSpells", "raceSpellIds", "classOptionSpellIds", "featSpellSelections"],
} as const;
type PresetDraftFields = Partial<Record<(typeof PRESET_SECTION_FIELDS)[keyof typeof PRESET_SECTION_FIELDS][number], unknown>>;

export function findCustomizedPresetSections(start: PresetDraftFields, current: PresetDraftFields, hasLevelChoices = false): string[] {
  const changed = Object.entries(PRESET_SECTION_FIELDS)
    .filter(([, fields]) => fields.some((field) => JSON.stringify(start[field]) !== JSON.stringify(current[field])))
    .map(([section]) => section);
  return hasLevelChoices ? [...changed, "levels"] : changed;
}

export function findPresetAbandonStage(step: number, isSubmitting: boolean, customizationStep: string | null): PresetAbandonStage {
  if (isSubmitting) return "submitting";
  if (step === 3 || (step >= 4 && customizationStep === "name")) return "name";
  if (step >= 4) return `customize_${customizationStep ?? "unknown"}`;
  return "review";
}

export function findPresetEntry(from: string | null | undefined): PresetEntry {
  return isPresetEntry(from) ? from : "direct";
}

export function findLinkKind(href: string, isReferenceHref: (appHref: string) => boolean = () => false): ArticleLinkKind {
  if (/^https?:\/\/(?:www\.)?rpgbot\.net(?:\/|$)/i.test(href)) return "original";
  if (!href.startsWith("/")) return "other";
  const appHref = stripNoAiPrefix(href);
  if (isReferenceHref(appHref)) return "reference";
  if (/^(?:\/2024)?\/rules\/optimization\//.test(appHref)) return "article";
  return appHref.includes("/optimization") ? "other" : "catalog";
}

function isPresetEntry(value: string | null | undefined): value is (typeof PRESET_ENTRIES)[number] {
  return (PRESET_ENTRIES as readonly string[]).includes(value ?? "");
}

function isRpgbotCta(value: string | undefined): value is RpgbotCta {
  return (RPGBOT_CTAS as readonly string[]).includes(value ?? "");
}

function isRpgbotSurface(value: string | undefined): value is RpgbotSurface {
  return (RPGBOT_SURFACES as readonly string[]).includes(value ?? "");
}
