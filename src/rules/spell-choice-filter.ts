/**
 * Р42 — заклинання, яке правило дає обрати гравцеві, задається фільтром (рівні, школи, список
 * класу), а не переліком. Кандидатів дає таблиця `spell`; той самий фільтр перевіряє вибір на сервері.
 * Користуються риси (Доторк феї й тіні) і крок заклинань конструктора 2024.
 */

export type SpellSchoolKey =
  | "ABJURATION"
  | "CONJURATION"
  | "DIVINATION"
  | "ENCHANTMENT"
  | "EVOCATION"
  | "ILLUSION"
  | "NECROMANCY"
  | "TRANSMUTATION";

export type SpellChoiceFilter = {
  levels: readonly number[];
  schools: readonly SpellSchoolKey[] | null;
  /** Список класу або кілька — «from the Bard, Cleric, Druid, and Wizard spell lists». */
  spellList: string | readonly string[] | null;
  ritualOnly?: boolean;
};

/** Школи, з яких підклас бере заклинання, і скільки поза ними ще можна взяти (Потойбічний лицар, Містичний спритник). */
export type SpellSchoolLimit = {
  schools: readonly SpellSchoolKey[];
  outsideAllowed: number;
};

export type SpellChoiceCandidate = {
  spellId: number;
  level: number;
  school: string | null;
  spellLists?: readonly string[];
  isRitual?: boolean;
};

export type SpellChoiceOption = SpellChoiceCandidate & {
  name: string;
  engName: string;
  ruleset?: "RULES_2014" | "RULES_2024";
  castingTime?: string | null;
  isConcentration?: boolean;
};

export function isSpellChoiceCandidate(filter: SpellChoiceFilter, spell: SpellChoiceCandidate): boolean {
  if (!filter.levels.includes(spell.level)) return false;
  if (filter.schools && !filter.schools.some((school) => school === spell.school)) return false;
  const allowedLists = listAllowedSpellLists(filter);
  if (allowedLists && !(spell.spellLists ?? []).some((list) => allowedLists.includes(list))) return false;
  if (filter.ritualOnly && !spell.isRitual) return false;
  return true;
}

export function listAllowedSpellLists(filter: SpellChoiceFilter): readonly string[] | null {
  if (filter.spellList === null) return null;
  return typeof filter.spellList === "string" ? [filter.spellList] : filter.spellList;
}

export function hasExactSpellCount(selectedSpellIds: readonly number[], count: number): boolean {
  return selectedSpellIds.length === count && new Set(selectedSpellIds).size === count;
}

export function areAllSpellsOffered(selectedSpellIds: readonly number[], offered: readonly SpellChoiceCandidate[]): boolean {
  const offeredIds = new Set(offered.map((spell) => spell.spellId));
  return selectedSpellIds.every((spellId) => offeredIds.has(spellId));
}
