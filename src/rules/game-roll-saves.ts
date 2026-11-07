import type { D20Mode } from "./dice-roll";
import { findSpellSaveDamage, type CreatureSaveResult, type DamageDefense, type DamageType, type SaveDieRoll, type SpellSaveDamage } from "./creature-save";
import { ABILITY_KEYS } from "./feat-grants";
import type { AbilityKey } from "./types";

export const MAX_SAVE_TARGETS = 40;
const DC_RANGE = { min: 1, max: 40 } as const;
const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] as const satisfies readonly DamageType[];

export type SaveSpellRef = { engName: string; level: number; ruleset: "RULES_2014" | "RULES_2024" };
/// spell — заклинання з листа; без нього ефект прийшов із дії статблоку, і такий кидок приймається лише від майстра.
export type GameRollSavesDraft = { creatureIds: number[]; persIds: number[]; spell: SaveSpellRef | null; effect: SpellSaveDamage; dc: number };
/// Що надсилає клієнт: ефект заклинання сервер бере з довідника сам, тож effect потрібен лише дії статблоку.
export type GameRollSavesRequest = { creatureIds: number[]; persIds: number[]; spell: SaveSpellRef | null; effect?: SpellSaveDamage; dc: number };

/// Рядок героя хітів не знімає: їх знімає гравець на своєму листі, тож hpChange там завжди null.
export type StoredSaveRow = CreatureSaveResult & { creatureId?: number; persId?: number; name: string; hpBefore: number | null; hpChange: number | null; isUndone: boolean; isAppliedToSheet?: boolean };
export type StoredSaves = { ability: AbilityKey; dc: number; damageType: DamageType; isHalfOnSave: boolean; rows: StoredSaveRow[] };

export type GameRollSaveRowView = {
  name: string;
  persId: number | null;
  isSaved: boolean;
  damage: number;
  isAppliedToSheet: boolean;
  gm: { d20: number[]; mode: D20Mode; bonus: number; dice: SaveDieRoll[]; total: number; isAutoFail: boolean; defense: DamageDefense | null; hitPointsBefore: number | null; hitPointsAfter: number | null; canUndo: boolean; isUndone: boolean } | null;
};
export type GameRollSavesView = { ability: AbilityKey; dc: number; damageType: DamageType; rows: GameRollSaveRowView[] };

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

function parseSaveEffect(raw: unknown): SpellSaveDamage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { ability, damageType, isHalfOnSave } = raw as Record<string, unknown>;
  if (!ABILITY_KEYS.includes(ability as AbilityKey) || !DAMAGE_TYPES.includes(damageType as DamageType) || typeof isHalfOnSave !== "boolean") return null;
  return { ability: ability as AbilityKey, damageType: damageType as DamageType, isHalfOnSave };
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
    rows: saves.rows.map((row) => ({
      name: row.name,
      persId: row.persId ?? null,
      isSaved: row.isSaved,
      damage: row.damage,
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
            hitPointsBefore: row.hpBefore,
            hitPointsAfter: row.hpBefore !== null && row.hpChange !== null ? row.hpBefore - row.hpChange : null,
            canUndo: (row.hpChange ?? 0) > 0 && !row.isUndone,
            isUndone: row.isUndone,
          }
        : null,
    })),
  };
}
