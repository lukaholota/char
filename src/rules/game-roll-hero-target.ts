import { GAME_ROLL_KINDS, type GameRollKind } from "@/rules/game-roll-target";

/// Лікування бере ціллю лише героя: хіти істот майстер веде сам.
export const HERO_ROLL_KINDS = [...GAME_ROLL_KINDS, "heal"] as const;
export type HeroRollKind = (typeof HERO_ROLL_KINDS)[number];
/// Майстер бʼє героя кидком зі статблоку або союзник лікує його з листа: кімната змінює хіти на листі героя.
export type GameRollHeroTargetDraft = { persId: number; kind: HeroRollKind };
/// armorClass і isHit з'явилися пізніше: у старих подіях їх немає, і журнал показує підказку замість результату.
export type StoredHeroTarget = GameRollHeroTargetDraft & { name: string; armorClass?: number | null; isHit?: boolean | null; isAppliedToSheet?: boolean };
/// isAppliedToSheet — сервер уже зняв хіти з листа; старі події без нього чекають кнопки гравця.
export type GameRollHeroTargetView = GameRollHeroTargetDraft & { name: string; damage: number | null; healing: number | null; isHit: boolean | null; armorClass: number | null; isAppliedToSheet: boolean };

/// undefined — запис зіпсований, null — цілі немає.
export function parseGameRollHeroTarget(raw: unknown): GameRollHeroTargetDraft | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object") return undefined;
  const { persId, kind } = raw as Record<string, unknown>;
  if (!Number.isInteger(persId) || (persId as number) < 1 || !HERO_ROLL_KINDS.includes(kind as HeroRollKind)) return undefined;
  return { persId: persId as number, kind: kind as HeroRollKind };
}

/// Дії статблоку мають ключі roll-N, тож атаку й шкоду впізнаємо за підписом кнопки.
export function findCreatureRollKind(action: { label: string; isD20: boolean }): GameRollKind | null {
  if (action.isD20) return action.label === "Атака" ? "attack" : null;
  return action.label === "Шкода" ? "damage" : null;
}

/// Групове лікування має свій підпис («Лікування кожного») і ціль не бере.
export function isHealingAction(action: { label: string; isD20: boolean }): boolean {
  return !action.isD20 && action.label === "Лікування";
}

/// Влучання бачать усі, КЗ героя — лише майстер і сам гравець на своєму листі.
export function buildGameRollHeroTargetView(stored: StoredHeroTarget | undefined, total: number, viewer: { isGm: boolean }): GameRollHeroTargetView | null {
  if (!stored?.name) return null;
  const isAttack = stored.kind === "attack";
  return {
    persId: stored.persId,
    name: stored.name,
    kind: stored.kind,
    damage: stored.kind === "damage" ? total : null,
    healing: stored.kind === "heal" ? total : null,
    isHit: isAttack ? (stored.isHit ?? null) : null,
    armorClass: isAttack && viewer.isGm ? (stored.armorClass ?? null) : null,
    isAppliedToSheet: stored.isAppliedToSheet ?? false,
  };
}

/// Той самий ідентифікатор для однієї події: другий клік чи перезавантаження не знімуть хіти вдруге.
export function buildHeroDamageOperationId(sessionId: number, seq: number, saveRowIndex?: number): string {
  return saveRowIndex === undefined ? `game-hit-${sessionId}-${seq}` : `game-hit-${sessionId}-${seq}-${saveRowIndex}`;
}
