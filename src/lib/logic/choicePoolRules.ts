export const CHOICE_GROUPS = {
  WARLOCK_INVOCATIONS: "Потойбічні виклики",
  SORCERER_METAMAGIC: "Метамагія",
  CLASS_TOOLS: "Класові інструменти",
  BATTLE_MASTER_MANEUVERS: "Маневри майстра бою",
  ARCANE_SHOTS: "Арканні постріли",
  RUNE_KNIGHT_RUNES: "Руни велетнів",
  FOUR_ELEMENTS_DISCIPLINES: "Дисципліни чотирьох елементів",
  DIVINE_ORDER: "Божественний орден",
  PRIMAL_ORDER: "Первісний орден",
  BLESSED_STRIKES: "Благословенні удари",
  ELEMENTAL_FURY: "Стихійна лють",
  FIGHTING_STYLE: "Бойовий стиль",
  CIRCLE_OF_THE_LAND: "Коло землі",
  HUNTERS_PREY: "Здобич мисливця",
  DEFENSIVE_TACTICS: "Захисна тактика",
  ELEMENTAL_AFFINITY: "Стихійна спорідненість",
} as const;

export type ChoicePoolScope = "class" | "subclass";

export type ChoicePoolRule = {
  scope: ChoicePoolScope;
  groupName: string;
  className?: string;
  subclassName?: string;
  /** Number of picks gained at this level. */
  picksAtLevel: (levelAfter: number) => number;
  /** When true, UI should always synthesize `Group #i` names even for 1 pick. */
  alwaysSplitInUi?: boolean;
};

export function baseChoiceGroupName(groupName: string): string {
  const trimmed = String(groupName || "").replace(/\s+#\d+$/, "");
  const normalized = trimmed.toLowerCase();
  if (normalized.includes("бойовий стиль") || normalized.includes("fighting style")) {
    return "Бойовий стиль";
  }
  return trimmed;
}

export function getChoicePoolRule(args: {
  scope: ChoicePoolScope;
  groupName: string;
  className?: string;
  subclassName?: string;
}): ChoicePoolRule | undefined {
  const baseGroup = baseChoiceGroupName(args.groupName);

  return CHOICE_POOL_RULES.find((r) => {
    if (r.scope !== args.scope) return false;
    if (baseChoiceGroupName(r.groupName) !== baseGroup) return false;
    if (r.scope === "class") return r.className === args.className;
    return r.subclassName === args.subclassName;
  });
}

export function picksAtLevelForGroup(args: {
  scope: ChoicePoolScope;
  groupName: string;
  className?: string;
  subclassName?: string;
  levelAfter: number;
}): number {
  const rule = getChoicePoolRule(args);
  if (!rule) return 1;
  const n = Number(rule.picksAtLevel(args.levelAfter));
  return Number.isFinite(n) ? n : 1;
}

const mapPicks = (mapping: Record<number, number>) => (levelAfter: number) => mapping[levelAfter] ?? 0;

export const CHOICE_POOL_RULES: ChoicePoolRule[] = [
  ...[
    ["CLERIC_2024", CHOICE_GROUPS.DIVINE_ORDER, { 1: 1 }],
    ["CLERIC_2024", CHOICE_GROUPS.BLESSED_STRIKES, { 7: 1 }],
    ["DRUID_2024", CHOICE_GROUPS.PRIMAL_ORDER, { 1: 1 }],
    ["DRUID_2024", CHOICE_GROUPS.ELEMENTAL_FURY, { 7: 1 }],
    ["FIGHTER_2024", CHOICE_GROUPS.FIGHTING_STYLE, { 1: 1 }],
    ["PALADIN_2024", CHOICE_GROUPS.FIGHTING_STYLE, { 2: 1 }],
    ["RANGER_2024", CHOICE_GROUPS.FIGHTING_STYLE, { 2: 1 }],
  ].map(([className, groupName, picks]) => ({
    scope: "class" as const,
    className: className as string,
    groupName: groupName as string,
    picksAtLevel: mapPicks(picks as Record<number, number>),
  })),
  {
    scope: "class",
    className: "WARLOCK_2014",
    groupName: CHOICE_GROUPS.WARLOCK_INVOCATIONS,
    picksAtLevel: mapPicks({ 2: 2, 5: 1, 7: 1, 9: 1, 12: 1, 15: 1, 18: 1 }),
    // Preserve existing UX (wizard currently uses `#1` even when only 1 pick).
    alwaysSplitInUi: true,
  },
  {
    scope: "class",
    className: "WARLOCK_2024",
    groupName: CHOICE_GROUPS.WARLOCK_INVOCATIONS,
    // SRD 5.2, Warlock Features table, колонка Eldritch Invocations: 1/3/3/3/5/5/6/6/7/7/7/8/8/8/9/9/9/10/10/10.
    // Перший виклик — уже на 1-му рівні (характеризує 2024: 2014 починає з 2-го).
    picksAtLevel: mapPicks({ 1: 1, 2: 2, 5: 2, 7: 1, 9: 1, 12: 1, 15: 1, 18: 1 }),
    alwaysSplitInUi: true,
  },
  {
    scope: "class",
    className: "SORCERER_2014",
    groupName: CHOICE_GROUPS.SORCERER_METAMAGIC,
    // PHB 2014: 2 at lvl3, +1 at lvl10, +1 at lvl17
    picksAtLevel: mapPicks({ 3: 2, 10: 1, 17: 1 }),
  },
  {
    scope: "class",
    className: "SORCERER_2024",
    groupName: CHOICE_GROUPS.SORCERER_METAMAGIC,
    picksAtLevel: mapPicks({ 2: 2, 10: 2, 17: 2 }),
  },
  {
    scope: "class",
    className: "BARD_2024",
    groupName: CHOICE_GROUPS.CLASS_TOOLS,
    picksAtLevel: mapPicks({ 1: 3 }),
  },
  {
    scope: "class",
    className: "MONK_2024",
    groupName: CHOICE_GROUPS.CLASS_TOOLS,
    picksAtLevel: mapPicks({ 1: 1 }),
  },
  {
    scope: "class",
    className: "ARTIFICER_2024",
    groupName: CHOICE_GROUPS.CLASS_TOOLS,
    picksAtLevel: mapPicks({ 1: 1 }),
  },
  {
    scope: "subclass",
    subclassName: "BATTLE_MASTER",
    groupName: CHOICE_GROUPS.BATTLE_MASTER_MANEUVERS,
    // PHB 2014: 3 at lvl3, then +2 at 7/10/15
    picksAtLevel: mapPicks({ 3: 3, 7: 2, 10: 2, 15: 2 }),
  },
  ...[
    ["CIRCLE_OF_THE_LAND", CHOICE_GROUPS.CIRCLE_OF_THE_LAND, { 3: 1 }],
    ["HUNTER", CHOICE_GROUPS.HUNTERS_PREY, { 3: 1 }],
    ["HUNTER", CHOICE_GROUPS.DEFENSIVE_TACTICS, { 7: 1 }],
    ["DRACONIC_SORCERY", CHOICE_GROUPS.ELEMENTAL_AFFINITY, { 6: 1 }],
  ].map(([subclassName, groupName, picks]) => ({
    scope: "subclass" as const,
    subclassName: subclassName as string,
    groupName: groupName as string,
    picksAtLevel: mapPicks(picks as Record<number, number>),
  })),
  {
    scope: "subclass",
    subclassName: "ARCANE_ARCHER",
    groupName: CHOICE_GROUPS.ARCANE_SHOTS,
    // XGtE: 2 Arcane Shot options at lvl3, +1 at 7/10/15
    picksAtLevel: mapPicks({ 3: 2, 7: 1, 10: 1, 15: 1 }),
  },
  {
    scope: "subclass",
    subclassName: "RUNE_KNIGHT",
    groupName: CHOICE_GROUPS.RUNE_KNIGHT_RUNES,
    // TCoE: 2 runes at lvl3, +1 at 7/10/15
    picksAtLevel: mapPicks({ 3: 2, 7: 1, 10: 1, 15: 1 }),
  },
  {
    scope: "subclass",
    subclassName: "WAY_OF_THE_FOUR_ELEMENTS",
    groupName: CHOICE_GROUPS.FOUR_ELEMENTS_DISCIPLINES,
    // PHB 2014: 2 disciplines at lvl3, +1 at 6/11/17
    picksAtLevel: mapPicks({ 3: 2, 6: 1, 11: 1, 17: 1 }),
  },
];
