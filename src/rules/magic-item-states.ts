import { isDrinkableMagicItem } from "./potions";
import { readRuleset } from "./ruleset";
import type { MagicItemEffect } from "./magic-item-effects";
import type { StateEffects, StateMark } from "./state-effects";
import { DAMAGE_TYPE_KEYS, type DamageTypeKey } from "./types";

/// Ефект, який предмет дає лише після дії гравця: клацнути підборами, насунути каптур, розгорнути крила.
/// `effects` рахує лист предметів (політ, імунітети), `findPart` — шар станів (кубики, швидкість ×2).
export type MagicItemState = {
  activationLabel: string;
  effects: MagicItemEffect[];
  findPart: (sourceKey: string) => Partial<StateEffects>;
};

type ItemStateSource = { engName?: string | null; ruleset?: string | null };
type EditionStates = MagicItemState | Partial<Record<"RULES_2014" | "RULES_2024", MagicItemState>>;

const ITEM_STATE_KEY_PREFIX = "ITEM:";

const note = (text: string): StateMark => ({ kind: "NOTE", text });

const invisible = (activationLabel: string, ...notes: string[]): MagicItemState => ({
  activationLabel,
  effects: [],
  findPart: (sourceKey) => ({
    rollModifiers: [{ mode: "ADVANTAGE", scope: "ATTACK", sourceKey }],
    marks: [note("невидимі: атаки по вас — з перешкодою"), ...notes.map(note)],
  }),
});

const flying = (activationLabel: string, feet: number, ...notes: string[]): MagicItemState => ({
  activationLabel,
  effects: [{ kind: "MOVEMENT", mode: "FLY", feet }],
  findPart: () => ({ marks: notes.map(note) }),
});

const DRUNK = "Випито";

const drunk = (effects: MagicItemEffect[], findPart: MagicItemState["findPart"] = () => ({})): MagicItemState => ({ activationLabel: DRUNK, effects, findPart });
const drunkNotes = (...notes: string[]) => drunk([], () => ({ marks: notes.map(note) }));
const giantStrength = (score: number) => drunk([{ kind: "ABILITY_SCORE", ability: "STR", score }], () => ({ marks: [note("1 година")] }));
const resistance = (damageType: DamageTypeKey) => drunk([{ kind: "RESISTANCE", damageTypes: [damageType] }], () => ({ marks: [note("1 година")] }));

const RESISTANCE_POTIONS = Object.fromEntries(
  (["ACID", "COLD", "FIRE", "FORCE", "LIGHTNING", "NECROTIC", "POISON", "PSYCHIC", "RADIANT", "THUNDER"] as const).map((type) => [
    `Potion of Resistance (${type.charAt(0)}${type.slice(1).toLowerCase()})`,
    { RULES_2014: resistance(type) },
  ]),
);

const POTION_STATES: Record<string, EditionStates> = {
  ...RESISTANCE_POTIONS,
  "Potion of Climbing": drunk([{ kind: "MOVEMENT", mode: "CLIMB", feet: "WALK" }], () => ({ marks: [note("перевага на Атлетику, щоб лізти"), note("1 година")] })),
  "Potion of Flying": drunk([{ kind: "MOVEMENT", mode: "FLY", feet: "WALK" }], () => ({ marks: [note("можете зависати"), note("1 година")] })),
  "Potion of Hill Giant Strength": giantStrength(21),
  "Potion of Giant Strength (Hill)": giantStrength(21),
  "Potion of Stone Giant Strength": giantStrength(23),
  "Potion of Giant Strength (Stone Giant)": giantStrength(23),
  "Potion of Frost Giant Strength": giantStrength(23),
  "Potion of Giant Strength (Frost Giant)": giantStrength(23),
  "Potion of Fire Giant Strength": giantStrength(25),
  "Potion of Giant Strength (Fire Giant)": giantStrength(25),
  "Potion of Cloud Giant Strength": giantStrength(27),
  "Potion of Giant Strength (Cloud Giant)": giantStrength(27),
  "Potion of Storm Giant Strength": giantStrength(29),
  "Potion of Giant Strength (Storm Giant)": giantStrength(29),
  "Potion of Invisibility": {
    RULES_2014: invisible(DRUNK, "зникає, коли ви атакуєте чи творите заклинання", "1 година"),
    RULES_2024: invisible(DRUNK, "зникає, коли ви атакуєте, завдаєте шкоди чи творите заклинання", "1 година"),
  },
  "Potion of Greater Invisibility": invisible(DRUNK),
  "Potion of Invulnerability": drunk([{ kind: "RESISTANCE", damageTypes: [...DAMAGE_TYPE_KEYS] }], () => ({ marks: [note("1 хвилина")] })),
  "Potion of Heroism": drunk([], (sourceKey) => ({
    bonusDice: [
      { scope: "ATTACK", sides: 4, sign: 1, sourceKey },
      { scope: "SAVE", sides: 4, sign: 1, sourceKey },
    ],
    marks: [note("1 година")],
  })),
  "Potion of Speed": drunk([], (sourceKey) => ({
    armorClassBonus: 2,
    speedMultiplier: 2,
    rollModifiers: [{ mode: "ADVANTAGE", scope: "DEX_SAVE", sourceKey }],
    marks: [{ kind: "HASTE_EXTRA_ACTION" }, { kind: "HASTE_LETHARGY" }, note("1 хвилина")],
  })),
  "Potion of Growth": drunk([], (sourceKey) => ({
    size: "ONE_LARGER",
    rollModifiers: [
      { mode: "ADVANTAGE", scope: "STR_CHECK", sourceKey },
      { mode: "ADVANTAGE", scope: "STR_SAVE", sourceKey },
    ],
    bonusDice: [{ scope: "WEAPON_DAMAGE", sides: 4, sign: 1, sourceKey }],
  })),
  "Potion of Diminution": drunk([], (sourceKey) => ({
    size: "ONE_SMALLER",
    rollModifiers: [
      { mode: "DISADVANTAGE", scope: "STR_CHECK", sourceKey },
      { mode: "DISADVANTAGE", scope: "STR_SAVE", sourceKey },
    ],
    bonusDice: [{ scope: "WEAPON_DAMAGE", sides: 4, sign: -1, sourceKey }],
  })),
  "Potion of Water Breathing": drunkNotes("дихаєте під водою", "1 година"),
  "Potion of Gaseous Form": drunkNotes("газоподібна форма: лише політ 10 фт, без атак і заклинань"),
};

const MAGIC_ITEM_STATES: Record<string, EditionStates> = {
  ...POTION_STATES,
  "Boots of Speed": {
    activationLabel: "Клацнути підборами",
    effects: [],
    findPart: () => ({ speedMultiplier: 2, marks: [note("принагідні атаки по вас — з перешкодою"), note("сумарно 10 хв до Довгого відпочинку")] }),
  },
  "Cloak of Elvenkind": {
    RULES_2014: {
      activationLabel: "Накинути каптур",
      effects: [],
      findPart: (sourceKey) => ({
        rollModifiers: [{ mode: "ADVANTAGE", scope: "STEALTH_CHECK", sourceKey }],
        marks: [note("Уважність, щоб побачити вас, — з перешкодою")],
      }),
    },
  },
  "Ring of Invisibility": {
    RULES_2014: invisible("Стати невидимим", "зникає, коли ви атакуєте чи творите заклинання"),
    RULES_2024: invisible("Стати невидимим"),
  },
  "Cloak of Invisibility": {
    RULES_2014: invisible("Насунути каптур", "сумарно до 2 годин"),
    RULES_2024: invisible("Насунути каптур", "1 година за 1 заряд"),
  },
  "Wings of Flying": flying("Розгорнути крила", 60, "1 година; знову — через 1к12 годин"),
  "Armor of Invulnerability": {
    RULES_2014: {
      activationLabel: "Стати невразливим",
      effects: [],
      findPart: () => ({ marks: [note("імунітет до немагічної шкоди"), note("10 хв, раз до світанку")] }),
    },
    RULES_2024: {
      activationLabel: "Стати невразливим",
      effects: [{ kind: "IMMUNITY", damageTypes: ["BLUDGEONING", "PIERCING", "SLASHING"] }],
      findPart: () => ({ marks: [note("10 хв, раз до світанку")] }),
    },
  },
};

export function findMagicItemState(item: ItemStateSource): MagicItemState | null {
  const entry = item.engName ? MAGIC_ITEM_STATES[item.engName] : undefined;
  if (!entry) return null;
  if ("activationLabel" in entry) return entry;
  return entry[readRuleset(item.ruleset)] ?? null;
}

export function findSwitchableItemState(item: ItemStateSource & { itemType?: string | null }): MagicItemState | null {
  return isDrinkableMagicItem(item) ? null : findMagicItemState(item);
}

export function buildItemStateKey(magicItemId: number): string {
  return `${ITEM_STATE_KEY_PREFIX}${magicItemId}`;
}

export function readItemStateMagicItemId(effectKey: string): number | null {
  if (!effectKey.startsWith(ITEM_STATE_KEY_PREFIX)) return null;
  const id = Number(effectKey.slice(ITEM_STATE_KEY_PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}
