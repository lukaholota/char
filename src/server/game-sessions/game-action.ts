import { AREA_LIMITS } from "@/rules/game-areas";
import { MAP_CREATURE_LIMITS } from "@/rules/game-map-creatures";
import { GAME_SCENE_LIMITS } from "@/rules/game-scenes";
import { findCurrentUserId } from "@/server/db/current-user";
import type { GameSessionFailure, GameSessionResult } from "@/server/db/game-sessions";

export type ActionResult<T = null> = { ok: true; value: T } | { ok: false; error: string };

export const FAILURE_MESSAGES: Record<GameSessionFailure | "signed_out" | "too_fast", string> = {
  signed_out: "Увійдіть, щоб грати в кімнатах",
  too_fast: "Забагато рухів — зачекайте кілька секунд",
  not_found: "Кімнату не знайдено або посилання вже не діє",
  forbidden: "Це може зробити лише майстер",
  archived: "Кімнату заархівовано",
  full: "У кімнаті вже максимум гравців",
  too_many: "Забагато активних кімнат — заархівуйте стару",
  bad_name: "Назва має містити від 1 до 80 символів",
  bad_pers: "Цього персонажа не можна привʼязати",
  bad_image: "Не вдалося завантажити мапу — спробуйте іншу картинку",
  no_map: "Мапи вже немає або токен без персонажа",
  bad_scene: "Цієї сцени вже немає",
  bad_scene_name: `Назва сцени — від 1 до ${GAME_SCENE_LIMITS.name} символів`,
  scene_limit: `У кімнаті вже ${GAME_SCENE_LIMITS.perRoom} сцен — видаліть непотрібну`,
  scene_in_combat: "Спершу завершіть бій",
  scene_active: "Гравці зараз бачать цю сцену — спершу покажіть їм іншу",
  scene_changed: "Сцену змінено — токен не переміщено",
  bad_creature: "Цієї істоти немає в бестіарії",
  creature_limit: `На мапі вже ${MAP_CREATURE_LIMITS.perScene} істот — приберіть зайвих`,
  creature_gone: "Цієї істоти вже немає на мапі",
  no_hit_points: "У цієї істоти хіти не задано — спершу задайте максимум",
  combat_active: "Бій уже триває",
  no_combat: "Бій уже завершено",
  no_combatants: "У бою немає кого ставити в чергу: додайте героїв або виставте істот на мапу",
  combatant_gone: "Цього учасника вже немає в бою",
  turn_moved: "Хід уже перейшов далі",
  bad_target: "Цілі вже немає на мапі — оберіть іншу",
  already_undone: "Цю шкоду вже скасовано",
  bad_grid: "Не вдалося зберегти сітку",
  bad_fog: "Не вдалося змінити туман",
  fog_limit: "Забагато ділянок туману — сховайте все й відкрийте заново",
  bad_area: "Не вдалося показати область",
  area_limit: `На сцені вже ${AREA_LIMITS.perScene} областей — приберіть зайві`,
  area_gone: "Цю область уже прибрали",
};

export type UserActionResult<T> = GameSessionResult<T> | { ok: false; error: "too_fast" };

function toActionResult<T>(result: UserActionResult<T>): ActionResult<T> {
  return result.ok ? result : { ok: false, error: FAILURE_MESSAGES[result.error] };
}

export async function runAsUser<T>(action: (userId: number) => Promise<UserActionResult<T>>): Promise<ActionResult<T>> {
  const userId = await findCurrentUserId();
  if (userId === null) return { ok: false, error: FAILURE_MESSAGES.signed_out };
  return toActionResult(await action(userId));
}

export const isId = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0;
export const rejectBadInput = { ok: false as const, error: "not_found" as const };

export const tooFast = { ok: false as const, error: "too_fast" as const };
