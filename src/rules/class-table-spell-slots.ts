import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { getMaximumStandardSpellSlots } from "@/rules/spellcasting";
import type { Ruleset, SpellcastingKind } from "@/rules/types";

export type ClassTableClass = {
  name: string;
  ruleset: Ruleset;
  spellcastingType: SpellcastingKind;
  specialSpellSlotProgression?: unknown;
};

const ARTIFICER_LEVEL_ONE_SLOTS = [2, 0, 0, 0, 0, 0, 0, 0, 0] as const;

export function findClassTableSpellSlots(cls: ClassTableClass, level: number): number[] | null {
  const special = findSpecialProgressionSlots(cls.specialSpellSlotProgression, level);
  if (special) return special;

  if (cls.spellcastingType === "FULL") return normalizeSlots(SPELL_SLOT_PROGRESSION.FULL[level as keyof typeof SPELL_SLOT_PROGRESSION.FULL]);
  if (cls.spellcastingType === "HALF") return findHalfCasterSlots(cls, level);
  if (cls.spellcastingType === "THIRD") return normalizeSlots(SPELL_SLOT_PROGRESSION.THIRD[level as keyof typeof SPELL_SLOT_PROGRESSION.THIRD]);
  if (cls.spellcastingType === "PACT") return findPactSlots(level);
  return null;
}

function findHalfCasterSlots(cls: ClassTableClass, level: number): number[] | null {
  if (cls.ruleset === "RULES_2024") {
    const character = { level, characterClass: { name: cls.name, spellcastingType: cls.spellcastingType } };
    return normalizeSlots(getMaximumStandardSpellSlots(character, SPELL_SLOT_PROGRESSION.FULL, cls.ruleset));
  }
  if (cls.name === "ARTIFICER_2014" && level === 1) return [...ARTIFICER_LEVEL_ONE_SLOTS];
  return normalizeSlots(SPELL_SLOT_PROGRESSION.HALF[level as keyof typeof SPELL_SLOT_PROGRESSION.HALF]);
}

function findSpecialProgressionSlots(progression: unknown, level: number): number[] | null {
  if (!progression || typeof progression !== "object" || Array.isArray(progression)) return null;
  const byLevel = progression as Record<string, unknown>;
  return normalizeSlots(byLevel[String(level)]);
}

function findPactSlots(level: number): number[] | null {
  const pact: { slots: number; level: number } | undefined = SPELL_SLOT_PROGRESSION.PACT[level as keyof typeof SPELL_SLOT_PROGRESSION.PACT];
  if (!pact) return null;
  const pactSlots = Number(pact.slots);
  const slotLevel = Number(pact.level);
  if (!Number.isFinite(pactSlots) || !Number.isFinite(slotLevel)) return null;

  const slots = Array.from({ length: 9 }, () => 0);
  if (slotLevel >= 1 && slotLevel <= 9) slots[slotLevel - 1] = pactSlots;
  return slots;
}

function normalizeSlots(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value.slice(0, 9).map((entry) => {
    const numeric = Number(entry);
    return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
  });

  if (!normalized.some((slot) => slot > 0)) return null;
  while (normalized.length < 9) normalized.push(0);
  return normalized;
}
