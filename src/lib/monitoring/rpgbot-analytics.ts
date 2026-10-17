import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";
import {
  findRpgbotCtaClick, type ArticleLinkKind, type PresetAbandonStage, type PresetEntry, type ReadDepthMilestone, type RpgbotCtaClick,
  type RpgbotPlacement, type RpgbotSurface,
} from "@/lib/monitoring/rpgbot-analytics-model";
import type { PresetFailureReason } from "@/lib/optimization/ready-preset-server-error";

type SurfaceViewed = {
  surface: RpgbotSurface;
  placement?: RpgbotPlacement;
  article_slug?: string;
  article_group?: string;
  entity_key?: string;
  class_key?: string;
  preset_id?: string;
  item_count?: number;
  rating_score?: number;
  recommendations_on?: boolean;
  section_count?: number;
  landing_section?: string;
  feature_count?: number;
  entry?: PresetEntry;
  target_level?: number;
  is_subclass_match?: boolean;
  is_race_match?: boolean;
  build_id?: string;
};

type SuggestionMatch = { is_subclass_match: boolean; is_race_match: boolean };
export type SpellPickSection = "cantrip" | "spellbook" | "prepared" | "cantrip_swap" | "prepared_swap";

type PresetOutcome = { preset_id: string; customized_sections: string[]; seconds_since_open: number; target_level?: number };

export type RpgbotEventProperties = {
  rpgbot_surface_viewed: SurfaceViewed;
  rpgbot_cta_clicked: RpgbotCtaClick;
  rpgbot_article_read_depth: { article_slug: string; depth_percent: ReadDepthMilestone; section_count: number };
  rpgbot_article_link_clicked: { article_slug: string; link_kind: ArticleLinkKind };
  rpgbot_analysis_expanded: { placement: RpgbotPlacement; entity_key: string; class_key: string; rating_score?: number };
  rpgbot_analysis_failed: { entity_key: string };
  rpgbot_feature_analysis_opened: { placement?: RpgbotPlacement; feature_key: string; subclass_key?: string; class_key?: string; rating_score?: number };
  rpgbot_preset_selected: { preset_id: string; position: number; via: "card" | "button"; class_filter: string; has_query: boolean };
  rpgbot_preset_gallery_filtered: { class_name: string; has_query: boolean; result_count: number };
  rpgbot_preset_suggestion: { preset_id: string; action: "opened" | "accepted" | "declined"; target_level?: number } & SuggestionMatch;
  rpgbot_preset_path_chosen: { preset_id: string; path: "guide" | "customize" };
  rpgbot_preset_level_selected: { preset_id: string; level: number; from_level: number; placement: "preset_page" | "suggestion_dialog" };
  rpgbot_preset_submitted: PresetOutcome;
  rpgbot_preset_created: PresetOutcome & { pers_id?: number };
  rpgbot_preset_create_failed: { preset_id: string; reason: "validation" | PresetFailureReason; blocked_by?: string | null };
  rpgbot_preset_abandoned: { preset_id: string; stage: PresetAbandonStage; blocked_by: string | null; customized_sections: string[]; seconds_since_open: number };
  rpgbot_build_selected: { build_id: string };
  rpgbot_build_assembled: { build_id: string; is_customized: boolean };
  rpgbot_spell_recommendations_toggled: { enabled: boolean; class_key: string };
  rpgbot_spell_picked: { rating_score?: number; spell_level: number; section: SpellPickSection; class_key: string; recommendations_on: boolean };
  rpgbot_spell_chip_toggled: { enabled: boolean };
  rpgbot_spell_rating_opened: { placement: RpgbotPlacement; entity_key: string; rating_score: number };
  rpgbot_catalog_spell_added: { rating_score?: number; recommendations_on: boolean };
  rpgbot_wildshape_recommendations_toggled: { enabled: boolean };
  rpgbot_wildshape_form_added: { rating_score?: number; is_eligible: boolean; recommendations_on: boolean; is_moon_circle: boolean; druid_level: number };
};

export type RpgbotEventName = keyof RpgbotEventProperties;

export function captureRpgbotEvent<Name extends RpgbotEventName>(event: Name, properties: RpgbotEventProperties[Name]): void {
  capturePostHogEvent(event, { product_area: "rpgbot", ...properties });
}

export function startRpgbotCtaTracking(): () => void {
  const onClick = (event: MouseEvent) => {
    const click = findRpgbotCtaClick(event.target);
    if (click) captureRpgbotEvent("rpgbot_cta_clicked", click);
  };
  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}
