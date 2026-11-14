import type { D20Mode } from "./dice-roll";
import type { GameRoll } from "./game-roll";
import { findSpellSaveDamage, type CreatureSaveResult, type DamageDefense, type DamageType, type SaveDieRoll, type SaveEffect } from "./creature-save";
import { ABILITY_KEYS } from "./feat-grants";
import { isRuleConditionKey, type RuleConditionKey } from "./token-conditions";
import type { AbilityKey } from "./types";

export const MAX_SAVE_TARGETS = 40;
const DC_RANGE = { min: 1, max: 40 } as const;
const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] as const satisfies readonly DamageType[];

export type SaveSpellRef = { engName: string; level: number; ruleset: "RULES_2014" | "RULES_2024" };
/// spell — заклинання з листа; без нього ефект прийшов із дії статблоку, і такий кидок приймається лише від майстра.
export type GameRollSavesDraft = { creatureIds: number[]; persIds: number[]; spell: SaveSpellRef | null; effect: SaveEffect; dc: number };
/// Що надсилає клієнт: ефект заклинання сервер бере з довідника сам, тож effect потрібен лише дії статблоку.
export type GameRollSavesRequest = { creatureIds: number[]; persIds: number[]; spell: SaveSpellRef | null; effect?: SaveEffect; dc: number };

/// Рядок героя хітів не знімає: їх знімає гравець на своєму листі, тож hpChange там завжди null.
/// isConditionAdded — провал справді додав стан (його не було), тож скасування його зніме.
export type StoredSaveRow = CreatureSaveResult & { creatureId?: number; persId?: number; name: string; hpBefore: number | null; hpChange: number | null; isUndone: boolean; isAppliedToSheet?: boolean; isConditionAdded?: boolean };
export type StoredSaves = { ability: AbilityKey; dc: number; damageType: DamageType | null; secondDamageType?: DamageType; isHalfOnSave: boolean; condition?: RuleConditionKey; rows: StoredSaveRow[] };

export type GameRollSaveRowView = {
  name: string;
  persId: number | null;
  isSaved: boolean;
  damage: number;
  condition: RuleConditionKey | null;
  isAppliedToSheet: boolean;
  gm: { d20: number[]; mode: D20Mode; bonus: number; dice: SaveDieRoll[]; total: number; isAutoFail: boolean; defense: DamageDefense | null; secondDefense?: DamageDefense | null; hitPointsBefore: number | null; hitPointsAfter: number | null; canUndo: boolean; isUndone: boolean } | null;
};
export type GameRollSavesView = { ability: AbilityKey; dc: number; damageType: DamageType | null; secondDamageType?: DamageType; rows: GameRollSaveRowView[] };

export type SaveDamageParts = { rolledDamage: number; secondRolledDamage: number };

/// Друга група кубиків — шкода другого типу; бонус і додаткові кубики лишаються в першій частині.
export function splitSaveDamage(roll: Pick<GameRoll, "groups" | "total">, effect: SaveEffect): SaveDamageParts {
  const secondRolledDamage = effect.secondDamageType ? (roll.groups[1]?.values ?? []).reduce((sum, value) => sum + value, 0) : 0;
  return { rolledDamage: Math.max(0, roll.total - secondRolledDamage), secondRolledDamage };
}

/// undefined — запис зіпсований, null — ряткидків немає.
export function parseGameRollSaves(raw: unknown): GameRollSavesDraft | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object") return undefined;
  const { creatureIds, persIds = [], spell = null, effect, dc } = raw as Record<string, unknown>;
  if (!isIdList(creatureIds) || !isIdList(persIds)) return undefined;
  const targetCount = creatureIds.length + persIds.length;
  if (targetCount < 1 || targetCount > MAX_SAVE_TARGETS) return undefined;
  if (!Number.isInteger(dc) || (dc as number) < DC_RANGE.min || (dc as number) > DC_RANGE.max) return undefined;
  const spellRef = spell === null ? null : parseSpellRef(spell);
  if (spell !== null && !spellRef) return undefined;
  const saveEffect = spellRef ? findSpellSaveDamage(spellRef) : parseSaveEffect(effect);
  if (!saveEffect) return undefined;
  return { creatureIds: [...new Set(creatureIds)], persIds: [...new Set(persIds)], spell: spellRef, effect: saveEffect, dc: dc as number };
}

/// damageType null — ряткидок без шкоди; тоді ефект без стану мало що значить, але кидок лишається в журналі.
function parseSaveEffect(raw: unknown): SaveEffect | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { ability, damageType, isHalfOnSave, condition } = raw as Record<string, unknown>;
  if (!ABILITY_KEYS.includes(ability as AbilityKey) || (damageType !== null && !DAMAGE_TYPES.includes(damageType as DamageType)) || typeof isHalfOnSave !== "boolean") return null;
  if (condition !== undefined && !isRuleConditionKey(condition)) return null;
  return { ability: ability as AbilityKey, damageType: damageType as DamageType | null, isHalfOnSave, ...(condition ? { condition } : {}) };
}

function parseSpellRef(raw: unknown): SaveSpellRef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { engName, level, ruleset } = raw as Record<string, unknown>;
  if (typeof engName !== "string" || !Number.isInteger(level) || (ruleset !== "RULES_2014" && ruleset !== "RULES_2024")) return null;
  return { engName, level: level as number, ruleset };
}

const isPositiveInteger = (value: unknown) => Number.isInteger(value) && (value as number) > 0;
const isIdList = (value: unknown): value is number[] => Array.isArray(value) && value.every(isPositiveInteger);

/// Гравці бачать успіх чи провал і шкоду; кидок, бонус, опір і хіти — лише майстер.
export function buildGameRollSavesView(saves: StoredSaves | undefined, viewer: { isGm: boolean }): GameRollSavesView | null {
  if (!saves?.rows?.length) return null;
  return {
    ability: saves.ability,
    dc: saves.dc,
    damageType: saves.damageType,
    ...(saves.secondDamageType ? { secondDamageType: saves.secondDamageType } : {}),
    rows: saves.rows.map((row) => ({
      name: row.name,
      persId: row.persId ?? null,
      isSaved: row.isSaved,
      damage: row.damage,
      condition: viewer.isGm || !row.isUndone ? row.condition ?? null : null,
      isAppliedToSheet: row.isAppliedToSheet ?? false,
      gm: viewer.isGm
        ? {
            d20: row.d20,
            mode: row.mode,
            bonus: row.bonus,
            dice: row.dice ?? [],
            total: row.total,
            isAutoFail: row.isAutoFail,
            defense: row.defense,
            ...(saves.secondDamageType ? { secondDefense: row.secondDefense ?? null } : {}),
            hitPointsBefore: row.hpBefore,
            hitPointsAfter: row.hpBefore !== null && row.hpChange !== null ? row.hpBefore - row.hpChange : null,
            canUndo: ((row.hpChange ?? 0) > 0 || Boolean(row.isConditionAdded)) && !row.isUndone,
            isUndone: row.isUndone,
          }
        : null,
    })),
  };
}
