/**
 * L19-parity-competitors-14 — чим можна накласти заклинання: слотом його рівня або вищим («Using a
 * Higher-Level Spell Slot»), а також слотом Магії пакту, якщо його рівень не нижчий. Замовляння слота
 * не витрачає.
 *
 * Понад слоти стоїть безкоштовне застосування від риси ([Р38](../../docs/DECISIONS.md#р38)): воно
 * йде першим, бо слот, витрачений там, де риса дозволяла не витрачати, назад не повертається.
 */

import type { FreeSpellCast } from "./free-feat-spell-casts";

export type CastingSlotOption =
  | { kind: "SPELL_SLOT" | "PACT_SLOT"; slotLevel: number; remaining: number }
  | { kind: "FREE_USE"; featureId: number; featureName: string; remaining: number };

export type CastingSlotInput = {
  spellLevel: number;
  currentSpellSlots: readonly number[];
  maxSpellSlots: readonly number[];
  pact: { current: number; max: number; slotLevel: number } | null;
  freeCasts?: readonly FreeSpellCast[];
};

export function listCastingSlotOptions(input: CastingSlotInput): CastingSlotOption[] {
  if (input.spellLevel <= 0) return [];
  return [...collectFreeCastOptions(input), ...collectSpellSlotOptions(input), ...collectPactSlotOption(input)];
}

export function buildCastingOptionKey(option: CastingSlotOption): string {
  return option.kind === "FREE_USE" ? `FREE_USE:${option.featureId}` : `${option.kind}:${option.slotLevel}`;
}

function collectFreeCastOptions(input: CastingSlotInput): CastingSlotOption[] {
  return (input.freeCasts ?? []).map((cast) => ({
    kind: "FREE_USE" as const,
    featureId: cast.featureId,
    featureName: cast.featureName,
    remaining: Math.max(0, cast.remaining),
  }));
}

function collectSpellSlotOptions(input: CastingSlotInput): CastingSlotOption[] {
  return input.maxSpellSlots.flatMap((max, index) => {
    const slotLevel = index + 1;
    if (slotLevel < input.spellLevel || max <= 0) return [];
    return [{ kind: "SPELL_SLOT" as const, slotLevel, remaining: Math.max(0, input.currentSpellSlots[index] ?? 0) }];
  });
}

function collectPactSlotOption(input: CastingSlotInput): CastingSlotOption[] {
  const { pact } = input;
  if (!pact || pact.max <= 0 || pact.slotLevel < input.spellLevel) return [];
  return [{ kind: "PACT_SLOT", slotLevel: pact.slotLevel, remaining: Math.max(0, pact.current) }];
}
