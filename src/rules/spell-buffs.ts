import type { StateEffects, StatePart } from "./state-effects";

export type Ruleset = "RULES_2014" | "RULES_2024";

export const SPELL_BUFF_KEYS = [
  "MAGE_ARMOR",
  "SHIELD_OF_FAITH",
  "HASTE",
  "LONGSTRIDER",
  "ENLARGE",
  "REDUCE",
  "BARKSKIN",
  "BLESS",
] as const;

export type SpellBuffKey = (typeof SPELL_BUFF_KEYS)[number];

type SpellBuff = {
  spellEngName: string;
  /// Обладунок мага триває 8 годин і переживає короткий відпочинок; решта — ні.
  survivesShortRest?: boolean;
  findEffects: (ruleset: Ruleset, sourceKey: SpellBuffKey) => Partial<StateEffects>;
};

const SPELL_BUFFS: Record<SpellBuffKey, SpellBuff> = {
  MAGE_ARMOR: {
    spellEngName: "Mage Armor",
    survivesShortRest: true,
    findEffects: () => ({ unarmoredArmorClassBase: 13 }),
  },
  SHIELD_OF_FAITH: {
    spellEngName: "Shield of Faith",
    findEffects: () => ({ armorClassBonus: 2 }),
  },
  HASTE: {
    spellEngName: "Haste",
    findEffects: (_ruleset, sourceKey) => ({
      armorClassBonus: 2,
      speedMultiplier: 2,
      rollModifiers: [{ mode: "ADVANTAGE", scope: "DEX_SAVE", sourceKey }],
      marks: [{ kind: "HASTE_EXTRA_ACTION" }, { kind: "HASTE_LETHARGY" }],
    }),
  },
  LONGSTRIDER: {
    spellEngName: "Longstrider",
    findEffects: () => ({ speedBonus: 10 }),
  },
  ENLARGE: {
    spellEngName: "Enlarge/Reduce",
    findEffects: (_ruleset, sourceKey) => ({
      size: "ONE_LARGER",
      rollModifiers: [
        { mode: "ADVANTAGE", scope: "STR_CHECK", sourceKey },
        { mode: "ADVANTAGE", scope: "STR_SAVE", sourceKey },
      ],
      bonusDice: [{ scope: "WEAPON_DAMAGE", sides: 4, sign: 1, sourceKey }],
    }),
  },
  REDUCE: {
    spellEngName: "Enlarge/Reduce",
    findEffects: (_ruleset, sourceKey) => ({
      size: "ONE_SMALLER",
      rollModifiers: [
        { mode: "DISADVANTAGE", scope: "STR_CHECK", sourceKey },
        { mode: "DISADVANTAGE", scope: "STR_SAVE", sourceKey },
      ],
      bonusDice: [{ scope: "WEAPON_DAMAGE", sides: 4, sign: -1, sourceKey }],
    }),
  },
  /// 2014: «КБ не може бути меншим за 16»; 2024: «КЗ 17, якщо нижчий». Концентрацію (є лише в 2014)
  /// бере з прапорця заклинання в базі, а не звідси.
  BARKSKIN: {
    spellEngName: "Barkskin",
    findEffects: (ruleset) => ({ armorClassFloor: ruleset === "RULES_2014" ? 16 : 17 }),
  },
  BLESS: {
    spellEngName: "Bless",
    findEffects: (_ruleset, sourceKey) => ({
      bonusDice: [
        { scope: "ATTACK", sides: 4, sign: 1, sourceKey },
        { scope: "SAVE", sides: 4, sign: 1, sourceKey },
      ],
    }),
  },
};

export function isSpellBuffKey(value: string): value is SpellBuffKey {
  return (SPELL_BUFF_KEYS as readonly string[]).includes(value);
}

export function listSpellBuffKeysFor(spellEngName: string | null | undefined): SpellBuffKey[] {
  return SPELL_BUFF_KEYS.filter((key) => SPELL_BUFFS[key].spellEngName === spellEngName);
}

export function findSpellBuffSpellEngName(key: SpellBuffKey): string {
  return SPELL_BUFFS[key].spellEngName;
}

export function doesSpellBuffSurviveShortRest(key: SpellBuffKey): boolean {
  return Boolean(SPELL_BUFFS[key].survivesShortRest);
}

export function collectSpellBuffParts(activeKeys: readonly string[], ruleset: Ruleset): StatePart[] {
  return activeKeys.filter(isSpellBuffKey).map((key) => ({ sourceKey: key, part: SPELL_BUFFS[key].findEffects(ruleset, key) }));
}

/// Підсумок бафа до увімкнення — плитка шторки показує, що він дасть.
export function findSpellBuffPart(key: SpellBuffKey, ruleset: Ruleset): Partial<StateEffects> {
  return SPELL_BUFFS[key].findEffects(ruleset, key);
}
