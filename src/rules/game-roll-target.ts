import { findNaturalD20, type GameRoll } from "@/rules/game-roll";

export const GAME_ROLL_KINDS = ["attack", "damage"] as const;
export type GameRollKind = (typeof GAME_ROLL_KINDS)[number];
export type GameRollTargetDraft = { creatureId: number; kind: GameRollKind };

const LEADING_ARMOR_CLASS = /^\s*(\d{1,2})(?=\s*(?:\(|,|;|$))/;

export type GameRollTargetRow = {
  targetName: string | null;
  targetCreatureId: number | null;
  rollKind: string | null;
  total: number;
  targetAc: number | null;
  isHit: boolean | null;
  hpBefore: number | null;
  hpChange: number | null;
  hpChangeUndone: boolean;
};

export type GameRollTargetView = {
  name: string;
  kind: GameRollKind;
  isHit: boolean | null;
  damage: number | null;
  /// Цей удар звалив істоту — гравці й так бачать «повалений» на токені, залишку хітів це не видає.
  isDowned: boolean;
  gm: { armorClass: number | null; hitPointsBefore: number | null; hitPointsAfter: number | null; canUndo: boolean; isUndone: boolean } | null;
};

/// undefined — запис зіпсований, null — цілі немає.
export function parseGameRollTarget(raw: unknown): GameRollTargetDraft | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object") return undefined;
  const { creatureId, kind } = raw as Record<string, unknown>;
  if (!Number.isInteger(creatureId) || (creatureId as number) < 1 || !GAME_ROLL_KINDS.includes(kind as GameRollKind)) return undefined;
  return { creatureId: creatureId as number, kind: kind as GameRollKind };
}

/// Атака — це к20 з модом, шкода — звичайна сума без к20 і не менша за нуль.
export function findGameRollTargetProblem(roll: Pick<GameRoll, "d20Mode" | "total">, kind: GameRollKind | "heal"): string | null {
  if (kind === "attack") return roll.d20Mode ? null : "attack needs a d20 roll";
  if (roll.d20Mode) return `${kind} cannot be a d20 roll`;
  return roll.total >= 0 ? null : `${kind} cannot be negative`;
}

/// Ціль беруть лише кидок атаки (к20) і кидок «Шкода»: решта дій заклинань — лікування, зони, ряткидки — з ціллю не мають сенсу.
export function findGameRollKind(action: { key: string; label: string; isD20: boolean }): GameRollKind | null {
  if (action.isD20) return action.key === "attack" || action.key === "spell-attack" ? "attack" : null;
  return action.label === "Шкода" ? "damage" : null;
}

/// Змінні КБ («11 + рівень заклинання») не розбираються: майстер вирішує сам.
export function parseArmorClass(statblockArmorClass: string | undefined): number | null {
  const match = statblockArmorClass?.match(LEADING_ARMOR_CLASS);
  return match ? Number(match[1]) : null;
}

/// Натуральна 20 влучає завжди, натуральна 1 — ніколи; без відомого КБ вирішують лише вони.
export function findAttackHit(roll: Pick<GameRoll, "d20Mode" | "groups">, total: number, armorClass: number | null): boolean | null {
  const natural = findNaturalD20(roll);
  if (natural === "NAT_20") return true;
  if (natural === "NAT_1") return false;
  return armorClass === null ? null : total >= armorClass;
}

/// Гравці бачать лише кинуте значення: скільки хітів справді зняли — а це видало б залишок — знає тільки майстер.
export function buildGameRollTargetView(row: GameRollTargetRow, viewer: { isGm: boolean }): GameRollTargetView | null {
  if (row.targetName === null || (row.rollKind !== "attack" && row.rollKind !== "damage")) return null;
  const isDamage = row.rollKind === "damage";
  const hitPoints = isDamage && row.hpBefore !== null && row.hpChange !== null ? { before: row.hpBefore, change: row.hpChange } : null;
  return {
    name: row.targetName,
    kind: row.rollKind,
    isHit: isDamage ? null : row.isHit,
    damage: isDamage ? row.total : null,
    isDowned: hitPoints !== null && !row.hpChangeUndone && hitPoints.before > 0 && hitPoints.change >= hitPoints.before,
    gm: viewer.isGm
      ? {
          armorClass: row.targetAc,
          hitPointsBefore: hitPoints?.before ?? null,
          hitPointsAfter: hitPoints ? hitPoints.before - hitPoints.change : null,
          canUndo: hitPoints !== null && hitPoints.change > 0 && !row.hpChangeUndone && row.targetCreatureId !== null,
          isUndone: row.hpChangeUndone,
        }
      : null,
  };
}
