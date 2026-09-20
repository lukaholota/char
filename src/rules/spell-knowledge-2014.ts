// Таблиці класів PHB 2014 (і TCoE для винахідника): скільки замовлянь і відомих заклинань клас має
// на своєму рівні та найвищий рівень заклинання, яке він може вивчити. Числа звірено з
// `data/5etools/raw/class/*.json` (cantripProgression, spellsKnownProgression); уривок лежить у
// `tests/fixtures/5etools/class-spell-progressions-2014.json`, і тест не дає таблицям розійтися.
// Клірик, друїд, паладин, винахідник і чарівник заклинань не «знають» — вони готують зі списку
// або з книги, тому `known` у них `null`.

export type SpellKnowledgeTable2014 = {
  cantrips: readonly number[];
  known: readonly number[] | null;
  maxSpellLevel: readonly number[];
};

const FULL_CASTER_MAX_SPELL_LEVEL = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9] as const;
const HALF_CASTER_MAX_SPELL_LEVEL = [0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5] as const;
const NO_CANTRIPS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as const;

export const SPELL_KNOWLEDGE_2014: Readonly<Record<string, SpellKnowledgeTable2014>> = {
  BARD_2014: {
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    maxSpellLevel: FULL_CASTER_MAX_SPELL_LEVEL,
  },
  SORCERER_2014: {
    cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    maxSpellLevel: FULL_CASTER_MAX_SPELL_LEVEL,
  },
  WARLOCK_2014: {
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
  RANGER_2014: {
    cantrips: NO_CANTRIPS,
    known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
    maxSpellLevel: HALF_CASTER_MAX_SPELL_LEVEL,
  },
  CLERIC_2014: {
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    known: null,
    maxSpellLevel: FULL_CASTER_MAX_SPELL_LEVEL,
  },
  DRUID_2014: {
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    known: null,
    maxSpellLevel: FULL_CASTER_MAX_SPELL_LEVEL,
  },
  WIZARD_2014: {
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    known: null,
    maxSpellLevel: FULL_CASTER_MAX_SPELL_LEVEL,
  },
  PALADIN_2014: {
    cantrips: NO_CANTRIPS,
    known: null,
    maxSpellLevel: HALF_CASTER_MAX_SPELL_LEVEL,
  },
  ARTIFICER_2014: {
    cantrips: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
    known: null,
    maxSpellLevel: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
  },
};

export const THIRD_CASTER_KNOWLEDGE_2014: SpellKnowledgeTable2014 = {
  cantrips: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  known: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  maxSpellLevel: [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4],
};

const THIRD_CASTER_SUBCLASS_BY_CLASS: Readonly<Record<string, string>> = {
  FIGHTER_2014: "ELDRITCH_KNIGHT",
  ROGUE_2014: "ARCANE_TRICKSTER",
};

export type SpellKnowledge2014 = { cantrips: number; known: number | null; maxSpellLevel: number };

export function isThirdCaster2014(className: string, subclassName: string | null): boolean {
  return subclassName !== null && THIRD_CASTER_SUBCLASS_BY_CLASS[className] === subclassName;
}

export function findSpellKnowledge2014(className: string, classLevel: number, subclassName: string | null = null): SpellKnowledge2014 | null {
  const table = SPELL_KNOWLEDGE_2014[className] ?? (isThirdCaster2014(className, subclassName) ? THIRD_CASTER_KNOWLEDGE_2014 : null);
  return table ? readTableAtLevel(table, classLevel) : null;
}

export function readTableAtLevel(table: SpellKnowledgeTable2014, classLevel: number): SpellKnowledge2014 {
  const index = Math.max(1, Math.min(20, Math.trunc(classLevel))) - 1;
  return { cantrips: table.cantrips[index], known: table.known?.[index] ?? null, maxSpellLevel: table.maxSpellLevel[index] };
}
