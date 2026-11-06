import type { GameRollVisibility } from "@/rules/game-roll";
import type { GameSessionRole } from "@/server/db/game-sessions";
import { capturePostHogEvent } from "./posthog-client";

type GameEventProperties = {
  game_room_viewed: { role: GameSessionRole; member_count: number; is_archived: boolean; has_pers: boolean };
  game_roll_target_changed: { is_on: boolean };
  game_roll_visibility_changed: { visibility: GameRollVisibility; surface: "room" | "dock" | "popout" | "tray" };
  game_sound_toggled: { is_on: boolean };
  game_invite_copied: { member_count: number };
  game_invite_rotated: Record<string, never>;
  game_pers_bound: { has_pers: boolean; option_count: number };
  game_sheet_opened: { surface: "header" | "card" };
  game_journal_opened: { surface: "phone" | "desktop" | "popout" };
  game_roll_dropped: { reason: "rejected" | "expired" };
  game_session_archived: { is_archived: boolean };
  game_session_left: Record<string, never>;
  game_member_removed: Record<string, never>;
  game_map_changed: { has_map: boolean };
  game_token_moved: { is_own: boolean; is_on_map: boolean };
  game_creatures_added: { count: number; edition: "2014" | "2024" };
  game_creature_moved: { is_on_map: boolean };
  game_creature_statblock_opened: { is_gm: boolean };
};

/// Без назв кімнат, міток і значень кидків — лише як люди користуються кімнатами.
export function captureGameEvent<Name extends keyof GameEventProperties>(event: Name, properties: GameEventProperties[Name]): void {
  capturePostHogEvent(event, properties);
}
