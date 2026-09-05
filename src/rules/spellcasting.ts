import type { Ruleset, SpellcastingCharacter, SpellcastingClassLevel, SpellcastingKind } from "./types";

export type CasterLevel = { casterLevel: number; pactLevel: number };

// Редакція — явний аргумент: половинні заклиначі округлюються по-різному у 2014 і 2024, і рушій
// не має вгадувати редакцію з рядка бази.
export function calculateCasterLevel(character: SpellcastingCharacter, ruleset: Ruleset): CasterLevel {
  const multiclasses = character.multiclasses ?? [];
  const mainLevel = clamp(toInteger(character.level, 1) - multiclasses.reduce((sum, multiclass) => sum + toInteger(multiclass.classLevel, 0), 0), 1, 20);
  const classLevels = [{ classLevel: mainLevel, characterClass: character.characterClass, subclass: character.subclass }, ...multiclasses];

  return classLevels.reduce(
    (total, classLevel) => addCasterLevel(total, classLevel, ruleset),
    { casterLevel: 0, pactLevel: 0 },
  );
}

export function getStandardSpellSlots(casterLevel: number, progression: Record<number, readonly number[]>): number[] {
  return [...(progression[clamp(casterLevel, 0, 20)] ?? [])];
}

export function getPactMagicSlots(pactLevel: number, progression: Record<number, { slots: number; level: number }>): { slots: number; level: number } | null {
  return progression[clamp(pactLevel, 0, 20)] ?? null;
}

export function normalizeSpellSlotArray(raw: unknown): number[] {
  const values = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 9 }, (_, index) => normalizeSlotValue(values[index]));
}

export function getMaximumStandardSpellSlots(
  character: SpellcastingCharacter,
  progression: Record<number, readonly number[]>,
  ruleset: Ruleset,
): number[] {
  const { casterLevel } = calculateCasterLevel(character, ruleset);
  return normalizeSpellSlotArray(getStandardSpellSlots(casterLevel, progression));
}

export function getMaximumPactSpellSlots(
  character: SpellcastingCharacter,
  progression: Record<number, { slots: number; level: number }>,
  ruleset: Ruleset,
): number {
  const { pactLevel } = calculateCasterLevel(character, ruleset);
  return Math.max(0, Math.trunc(getPactMagicSlots(pactLevel, progression)?.slots ?? 0));
}

export function applySpellSlotMaximumDelta(
  current: readonly number[],
  beforeMaximum: readonly number[],
  afterMaximum: readonly number[],
): number[] {
  return Array.from({ length: 9 }, (_, index) => {
    const maximum = normalizeSlotValue(afterMaximum[index]);
    const next = normalizeSlotValue(current[index]) + normalizeSlotValue(afterMaximum[index]) - normalizeSlotValue(beforeMaximum[index]);
    return clamp(next, 0, maximum);
  });
}

function addCasterLevel(total: CasterLevel, classLevel: SpellcastingClassLevel, ruleset: Ruleset): CasterLevel {
  const level = clamp(toInteger(classLevel.classLevel, 1), 1, 20);
  const kind = getEffectiveSpellcastingKind(classLevel);
  if (kind === "PACT") return { ...total, pactLevel: clamp(total.pactLevel + level, 0, 20) };
  const contribution = getCasterLevelContribution(level, kind, ruleset, classLevel.characterClass?.name);
  return { ...total, casterLevel: clamp(total.casterLevel + contribution, 0, 20) };
}

function getEffectiveSpellcastingKind(classLevel: SpellcastingClassLevel): SpellcastingKind {
  const classKind = classLevel.characterClass?.spellcastingType;
  if (classKind && classKind !== "NONE") return classKind;

  const subclassKind = classLevel.subclass?.spellcastingType;
  return subclassKind && subclassKind !== "NONE" ? subclassKind : "NONE";
}

// Три гілки, не прапорець «як округляти у 2024»: асиметрія навмисна (Р33 у docs/DECISIONS.md),
// і «привести до симетрії» — це баг, а не рефакторинг.
function getCasterLevelContribution(level: number, kind: SpellcastingKind, ruleset: Ruleset, className: string | null | undefined): number {
  if (kind === "FULL") return level;
  // Половинні: у 2014 вниз (PHB 2014, с. 164); у 2024 ВГОРУ — SRD 5.2.1, Multiclassing → Spell
  // Slots: «Half your levels (round up) in the Paladin and Ranger classes». Артифіцер 2014
  // округлюється вгору вже за TCoE — той самий випадок, а не третій спосіб рахувати.
  if (kind === "HALF") return roundsHalfCasterUp(ruleset, className) ? Math.ceil(level / 2) : Math.floor(level / 2);
  // Третинні: ВНИЗ в обох редакціях. Basic Rules 2024: «one third of your Fighter or Rogue
  // levels (round down)»; підтверджено власником 2026-09-01. Пройдисвіт 4 (Таємний) / Бард 4
  // має рівень заклинача 5, не 6.
  if (kind === "THIRD") return Math.floor(level / 3);
  return 0;
}

function roundsHalfCasterUp(ruleset: Ruleset, className: string | null | undefined): boolean {
  return ruleset === "RULES_2024" || Boolean(className?.startsWith("ARTIFICER"));
}

function toInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSlotValue(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
}
