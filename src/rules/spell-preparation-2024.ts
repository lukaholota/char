// KR27.7 — підготовка заклинань 2024 за КЛАСОМ, не за персонажем.
//
// У 2024 кількість підготовлених заклинань — фіксована колонка таблиці класу (не «рівень +
// модифікатор», як у 2014), а найвищий рівень заклинання, яке клас дозволяє підготувати, —
// найвищий слот у ВЛАСНІЙ таблиці цього класу на його рівні. У мультикласі це не те саме, що
// найвищий слот персонажа: Чарівник 4 / Клірик 4 має слот 4-го рівня, а готує лише 2-й з обох
// (SRD 2024: «You can use those slots but only to cast your lower-level spells»).
// Числа — з data/2024/srd/classes.md; tests/content/spell-preparation-2024.test.ts перечитує
// SRD і звіряє. Третинні підкласи (Лицар-Чаклун, Містичний спритник) — з PHB 2024, у SRD їх немає.

export type SpellPreparationTable = {
  cantrips: readonly number[];
  prepared: readonly number[];
  maxSpellLevel: readonly number[];
};

export const SPELL_PREPARATION_2024: Readonly<Record<string, SpellPreparationTable>> = {
  BARD_2024: {
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  },
  CLERIC_2024: {
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  },
  DRUID_2024: {
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  },
  PALADIN_2024: {
    cantrips: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
    maxSpellLevel: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
  },
  RANGER_2024: {
    cantrips: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
    maxSpellLevel: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
  },
  SORCERER_2024: {
    cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  },
  WARLOCK_2024: {
    cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
  WIZARD_2024: {
    cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
    maxSpellLevel: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9],
  },
};

export const THIRD_CASTER_PREPARATION_2024: SpellPreparationTable = {
  cantrips: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  prepared: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  maxSpellLevel: [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4],
};

// O45, контракт адаптації 2024: Орден нечестивої душі лишається заклиначем «відомих» заклинань за таблицею
// Blood Hunter 2020. У 2024 це те саме, що колонка «підготовлених» чорнокнижника: число фіксоване, а
// міняється одне заклинання лише на підвищенні рівня класу.
export const PROFANE_SOUL_PREPARATION_2024: SpellPreparationTable = {
  cantrips: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  prepared: [0, 0, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 11],
  maxSpellLevel: [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4],
};

const SUBCLASS_PREPARATION_TABLES: Readonly<Record<string, SpellPreparationTable>> = {
  ELDRITCH_KNIGHT: THIRD_CASTER_PREPARATION_2024,
  ARCANE_TRICKSTER: THIRD_CASTER_PREPARATION_2024,
  ORDER_OF_THE_PROFANE_SOUL: PROFANE_SOUL_PREPARATION_2024,
};

export type SpellCounts = { cantrips: number; prepared: number; maxSpellLevel: number };

/** Клас без чаклунства (і воїн без Лицаря-Чаклуна) — `null`, а не нулі: рядка лічильників у нього немає. */
export function findSpellCounts2024(className: string, classLevel: number, subclassName: string | null): SpellCounts | null {
  const table = findPreparationTable(className, subclassName);
  if (!table) return null;

  const index = Math.max(1, Math.min(20, Math.trunc(classLevel))) - 1;
  return { cantrips: table.cantrips[index], prepared: table.prepared[index], maxSpellLevel: table.maxSpellLevel[index] };
}

export function findMaxPreparableSpellLevelByClass(
  classLevels: Readonly<Record<string, number>>,
  subclassByClass: Readonly<Record<string, string | null>>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(classLevels).flatMap(([className, classLevel]) => {
      const counts = findSpellCounts2024(className, classLevel, subclassByClass[className] ?? null);
      return counts && counts.maxSpellLevel > 0 ? [[className, counts.maxSpellLevel]] : [];
    }),
  );
}

// Третинний підклас готує зі списку ЧАРІВНИКА (PHB 2024: Лицар-Чаклун і Містичний спритник), Орден
// нечестивої душі — зі списку ЧОРНОКНИЖНИКА, тому для каталогу стеля ключується списком, а не класом:
// воїн 7 (Лицар-Чаклун) / чарівник 1 — «Чарівник: 2».
const SPELL_LIST_CLASS_BY_THIRD_CASTER: Readonly<Record<string, string>> = {
  ELDRITCH_KNIGHT: "WIZARD_2024",
  ARCANE_TRICKSTER: "WIZARD_2024",
  ORDER_OF_THE_PROFANE_SOUL: "WARLOCK_2024",
};

export function findPreparableSpellLevelBySpellList(
  classLevels: Readonly<Record<string, number>>,
  subclassByClass: Readonly<Record<string, string | null>>,
): Record<string, number> {
  const byList: Record<string, number> = {};
  for (const [className, level] of Object.entries(findMaxPreparableSpellLevelByClass(classLevels, subclassByClass))) {
    const listClass = SPELL_LIST_CLASS_BY_THIRD_CASTER[subclassByClass[className] ?? ""] ?? className;
    byList[listClass] = Math.max(byList[listClass] ?? 0, level);
  }
  return byList;
}

export function findSpellListClass2024(className: string, subclassName: string | null): string {
  return SPELL_LIST_CLASS_BY_THIRD_CASTER[subclassName ?? ""] ?? className;
}

function findPreparationTable(className: string, subclassName: string | null): SpellPreparationTable | null {
  if (SPELL_PREPARATION_2024[className]) return SPELL_PREPARATION_2024[className];
  return (subclassName && SUBCLASS_PREPARATION_TABLES[subclassName]) || null;
}
