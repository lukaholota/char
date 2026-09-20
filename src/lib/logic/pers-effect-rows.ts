import type { PersWithRelations } from "@/lib/actions/pers";
import { shortenSpellName } from "./spell-name";
import { CONCENTRATION_EFFECT_KEY, isConcentrationSpell } from "@/rules/concentration";
import { clampExhaustionLevel, findExhaustionAfterLongRest } from "@/rules/exhaustion";
import {
  doesSpellBuffSurviveShortRest,
  isSpellBuffKey,
  listSpellBuffKeysFor,
  type SpellBuffKey,
} from "@/rules/spell-buffs";

export type PersEffectRow = PersWithRelations["effects"][number];
export type EffectSpell = NonNullable<PersEffectRow["spell"]>;
export type RestKind = "SHORT" | "LONG";

export function findConcentration(pers: PersWithRelations): PersEffectRow | null {
  return (pers.effects ?? []).find((row) => row.effectKey === CONCENTRATION_EFFECT_KEY) ?? null;
}

export function listActiveBuffKeys(pers: PersWithRelations): SpellBuffKey[] {
  return (pers.effects ?? []).map((row) => row.effectKey).filter(isSpellBuffKey);
}

/// Нова концентрація зриває попередню разом із бафами, що на ній трималися.
export function markConcentration(pers: PersWithRelations, spell: EffectSpell | null): PersWithRelations {
  const kept = (pers.effects ?? []).filter((row) => row.effectKey !== CONCENTRATION_EFFECT_KEY && !row.endsWithConcentration);
  if (!spell) return { ...pers, effects: kept };
  return { ...pers, effects: [...kept, buildRow(pers, CONCENTRATION_EFFECT_KEY, spell, false)] };
}

export function markSpellBuff(
  pers: PersWithRelations,
  key: SpellBuffKey,
  isActive: boolean,
  source: { spell: EffectSpell | null; endsWithConcentration: boolean },
): PersWithRelations {
  const kept = (pers.effects ?? []).filter((row) => row.effectKey !== key);
  if (!isActive) return { ...pers, effects: kept };
  return { ...pers, effects: [...kept, buildRow(pers, key, source.spell, source.endsWithConcentration)] };
}

export function markExhaustion(pers: PersWithRelations, level: number): PersWithRelations {
  return { ...pers, exhaustionLevel: clampExhaustionLevel(level) };
}

/// Короткий відпочинок — година: концентрація й бафи до години гаснуть, Обладунок мага (8 год)
/// лишається. Довгий знімає все й один рівень виснаження.
export function endEffectsAfterRest(pers: PersWithRelations, rest: RestKind): PersWithRelations {
  if (rest === "LONG") return { ...pers, effects: [], exhaustionLevel: findExhaustionAfterLongRest(pers.exhaustionLevel) };

  const kept = (pers.effects ?? []).filter((row) => isSpellBuffKey(row.effectKey) && doesSpellBuffSurviveShortRest(row.effectKey));
  return { ...pers, effects: kept };
}

function buildRow(pers: PersWithRelations, effectKey: string, spell: EffectSpell | null, endsWithConcentration: boolean): PersEffectRow {
  return {
    persEffectId: -Date.now(),
    persId: pers.persId,
    effectKey,
    spellId: spell?.spellId ?? null,
    homebrewEntryId: null,
    endsWithConcentration,
    createdAt: new Date(),
    spell,
    homebrewEntry: null,
  };
}

/// Офлайн-черга несе лише `spellId`; назву для чипа лист бере з уже знайомих йому заклинань.
export function findKnownSpell(pers: PersWithRelations, spellId: number | null): EffectSpell | null {
  if (spellId === null) return null;
  const fromEffects = (pers.effects ?? []).find((row) => row.spell?.spellId === spellId)?.spell;
  if (fromEffects) return fromEffects;
  const fromList = (pers.persSpells ?? []).find((row) => row.spell?.spellId === spellId)?.spell;
  return fromList ? { spellId, name: fromList.name, engName: fromList.engName, hasConcentration: fromList.hasConcentration } : null;
}

/// Що зробити з кастом: концентрація і баф, про який варто спитати гравця (Прискорення може бути
/// й на союзнику). Щит сюди не входить: це реакція в мить атаки, а не стан на листі.
export function planSpellCast(pers: PersWithRelations, spell: EffectSpell) {
  const isConcentration = isConcentrationSpell(spell.hasConcentration);
  const buffKeys = listSpellBuffKeysFor(spell.engName);
  const previous = findConcentration(pers);
  const name = shortenSpellName(spell.name);
  return {
    isConcentration,
    title: isConcentration ? `Концентрація: ${name}` : `«${name}»`,
    endedName: isConcentration && previous && previous.spellId !== spell.spellId ? shortenSpellName(previous.spell?.name ?? "") : null,
    offeredBuff: buffKeys[0] ?? null,
  };
}
