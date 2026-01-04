export const CHOICE_GROUPS = {
  WARLOCK_INVOCATIONS: "Потойбічні виклики",
  SORCERER_METAMAGIC: "Метамагія",
  BATTLE_MASTER_MANEUVERS: "Маневри майстра бою",
  ARCANE_SHOTS: "Арканні постріли",
  RUNE_KNIGHT_RUNES: "Руни велетнів",
  FOUR_ELEMENTS_DISCIPLINES: "Дисципліни чотирьох елементів",
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
  return String(groupName || "").replace(/\s+#\d+$/, "");
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
    className: "SORCERER_2014",
    groupName: CHOICE_GROUPS.SORCERER_METAMAGIC,
    // PHB 2014: 2 at lvl3, +1 at lvl10, +1 at lvl17
    picksAtLevel: mapPicks({ 3: 2, 10: 1, 17: 1 }),
  },
  {
    scope: "subclass",
    subclassName: "BATTLE_MASTER",
    groupName: CHOICE_GROUPS.BATTLE_MASTER_MANEUVERS,
    // PHB 2014: 3 at lvl3, then +2 at 7/10/15
    picksAtLevel: mapPicks({ 3: 3, 7: 2, 10: 2, 15: 2 }),
  },
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
