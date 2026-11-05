import type { AbilityKey } from "./types";

type DiceSpec = {
  label: string;
  count: number;
  sides: number;
  bonus?: number;
  addsModifier?: boolean;
  perSlot?: number;
  slotsPerStep?: number;
  maxCount?: number;
  /// «Тіньовий клинок»: 3к8 зі слота 3, 4к8 зі слота 5 — кроки не рівні.
  countFromSlot?: Readonly<Record<number, number>>;
  bonusPerSlot?: number;
  perCantripTier?: number;
};

type PiecesSpec = { label: string; count: number; perSlot?: number; perCantripTier?: number; isSummed?: boolean };

export type SpellDice = {
  attack?: true;
  save?: AbilityKey;
  /// Шкода приходить не в мить накладання (Мітка мисливця, Духовні охоронці) — панель чекає натискання.
  rollsLater?: true;
  pieces?: PiecesSpec;
  rolls: readonly DiceSpec[];
};

export type SpellRoll = { key: string; label: string; count: number; sides: number; bonus: number };

export type SpellRollPlan = {
  attack: boolean;
  save: AbilityKey | null;
  rollsLater: boolean;
  pieces: { label: string; count: number } | null;
  rolls: SpellRoll[];
};

export type SpellRollInput = { spellLevel: number; slotLevel: number; characterLevel: number; spellcastingModifier: number };

const MAX_SPELL_LEVEL = 3;

const cantrip = (count: number, sides: number): DiceSpec => ({ label: "Шкода", count, sides });
const damage = (count: number, sides: number, perSlot = 1): DiceSpec => ({ label: "Шкода", count, sides, perSlot });
const healing = (count: number, sides: number): DiceSpec => ({ label: "Лікування", count, sides, addsModifier: true, perSlot: 1 });

const SPELL_DICE_2014: Readonly<Record<string, SpellDice>> = {
  "Acid Splash": { save: "DEX", rolls: [cantrip(1, 6)] },
  "Booming Blade": { rolls: [{ label: "Влучання", count: 0, sides: 8 }, { label: "Рух", count: 1, sides: 8 }] },
  "Chill Touch": { attack: true, rolls: [cantrip(1, 8)] },
  "Create Bonfire": { save: "DEX", rolls: [cantrip(1, 8)] },
  "Eldritch Blast": { attack: true, pieces: { label: "Променів", count: 1, perCantripTier: 1 }, rolls: [{ ...cantrip(1, 10), perCantripTier: 0 }] },
  "Fire Bolt": { attack: true, rolls: [cantrip(1, 10)] },
  "Frostbite": { save: "CON", rolls: [cantrip(1, 6)] },
  "Green-Flame Blade": { rolls: [{ label: "Влучання", count: 0, sides: 8 }, { label: "Перескок", count: 0, sides: 8, addsModifier: true }] },
  "Infestation": { save: "CON", rolls: [cantrip(1, 6)] },
  "Lightning Lure": { save: "STR", rolls: [cantrip(1, 8)] },
  "Magic Stone": { attack: true, rolls: [{ ...cantrip(1, 6), addsModifier: true, perCantripTier: 0 }] },
  "Mind Sliver": { save: "INT", rolls: [cantrip(1, 6)] },
  "Poison Spray": { save: "CON", rolls: [cantrip(1, 12)] },
  "Primal Savagery": { attack: true, rolls: [cantrip(1, 10)] },
  "Produce Flame": { attack: true, rolls: [cantrip(1, 8)] },
  "Ray of Frost": { attack: true, rolls: [cantrip(1, 8)] },
  "Sacred Flame": { save: "DEX", rolls: [cantrip(1, 8)] },
  "Sapping Sting": { save: "CON", rolls: [cantrip(1, 4)] },
  "Shocking Grasp": { attack: true, rolls: [cantrip(1, 8)] },
  "Sword Burst": { save: "DEX", rolls: [cantrip(1, 6)] },
  "Thorn Whip": { attack: true, rolls: [cantrip(1, 6)] },
  "Thunderclap": { save: "CON", rolls: [cantrip(1, 6)] },
  "Toll the Dead": { save: "WIS", rolls: [cantrip(1, 8), { label: "Пораненому", count: 1, sides: 12 }] },
  "Vicious Mockery": { save: "WIS", rolls: [cantrip(1, 4)] },
  "Word of Radiance": { save: "CON", rolls: [cantrip(1, 6)] },

  "Absorb Elements": { rollsLater: true, rolls: [damage(1, 6)] },
  "Arms of Hadar": { save: "STR", rolls: [damage(2, 6)] },
  "Burning Hands": { save: "DEX", rolls: [damage(3, 6)] },
  "Catapult": { save: "DEX", rolls: [damage(3, 8)] },
  "Chaos Bolt": { attack: true, rolls: [damage(2, 8, 0), { label: "Додаткова", count: 1, sides: 6, perSlot: 1 }] },
  "Chromatic Orb": { attack: true, rolls: [damage(3, 8)] },
  "Color Spray": { rolls: [{ label: "Хіти", count: 6, sides: 10, perSlot: 2 }] },
  "Cure Wounds": { rolls: [healing(1, 8)] },
  "Dissonant Whispers": { save: "WIS", rolls: [damage(3, 6)] },
  "Divine Favor": { rollsLater: true, rolls: [damage(1, 4, 0)] },
  "Earth Tremor": { save: "DEX", rolls: [damage(1, 6)] },
  "Ensnaring Strike": { save: "STR", rollsLater: true, rolls: [damage(1, 6)] },
  "False Life": { rolls: [{ label: "Тимчасові хіти", count: 1, sides: 4, bonus: 4, bonusPerSlot: 5 }] },
  "Frost Fingers": { save: "CON", rolls: [damage(2, 8)] },
  "Guiding Bolt": { attack: true, rolls: [damage(4, 6)] },
  "Hail of Thorns": { save: "DEX", rollsLater: true, rolls: [{ ...damage(1, 10), maxCount: 6 }] },
  "Healing Word": { rolls: [healing(1, 4)] },
  "Hellish Rebuke": { save: "DEX", rolls: [damage(2, 10)] },
  "Hex": { rollsLater: true, rolls: [damage(1, 6, 0)] },
  "Hunter's Mark": { rollsLater: true, rolls: [damage(1, 6, 0)] },
  "Ice Knife": { attack: true, save: "DEX", rolls: [{ label: "Влучання", count: 1, sides: 10 }, { label: "Вибух", count: 2, sides: 6, perSlot: 1 }] },
  "Inflict Wounds": { attack: true, rolls: [damage(3, 10)] },
  "Jim's Magic Missile": { attack: true, pieces: { label: "Дротиків", count: 3, perSlot: 1 }, rolls: [damage(2, 4, 0)] },
  "Magic Missile": { pieces: { label: "Дротиків", count: 3, perSlot: 1, isSummed: true }, rolls: [{ label: "Шкода", count: 1, sides: 4, bonus: 1 }] },
  "Magnify Gravity": { save: "CON", rolls: [damage(2, 8)] },
  "Ray of Sickness": { attack: true, rolls: [damage(2, 8)] },
  "Searing Smite": { save: "CON", rollsLater: true, rolls: [damage(1, 6)] },
  "Sleep": { rolls: [{ label: "Хіти", count: 5, sides: 8, perSlot: 2 }] },
  "Tasha's Caustic Brew": { save: "DEX", rolls: [damage(2, 4, 2)] },
  "Thunderous Smite": { save: "STR", rollsLater: true, rolls: [damage(2, 6, 0)] },
  "Thunderwave": { save: "CON", rolls: [damage(2, 8)] },
  "Witch Bolt": { attack: true, rolls: [damage(1, 12)] },
  "Wrathful Smite": { save: "WIS", rollsLater: true, rolls: [damage(1, 6, 0)] },
  "Zephyr Strike": { rollsLater: true, rolls: [damage(1, 8, 0)] },

  "Aganazzar's Scorcher": { save: "DEX", rolls: [damage(3, 8)] },
  "Branding Smite": { rollsLater: true, rolls: [damage(2, 6)] },
  "Cloud of Daggers": { rollsLater: true, rolls: [damage(4, 4, 2)] },
  "Cordon of Arrows": { save: "DEX", rollsLater: true, rolls: [damage(1, 6, 0)] },
  "Dragon's Breath": { save: "DEX", rollsLater: true, rolls: [damage(3, 6)] },
  "Dust Devil": { save: "STR", rollsLater: true, rolls: [damage(1, 8)] },
  "Flame Blade": { attack: true, rollsLater: true, rolls: [{ ...damage(3, 6), slotsPerStep: 2 }] },
  "Flaming Sphere": { save: "DEX", rollsLater: true, rolls: [damage(2, 6)] },
  "Healing Spirit": { rollsLater: true, rolls: [{ label: "Лікування", count: 1, sides: 6, perSlot: 1 }] },
  "Heat Metal": { save: "CON", rolls: [damage(2, 8)] },
  "Maximilian's Earthen Grasp": { save: "STR", rolls: [damage(2, 6, 0)] },
  "Melf's Acid Arrow": { attack: true, rolls: [damage(4, 4), { label: "Наступного ходу", count: 2, sides: 4, perSlot: 1 }] },
  "Mind Spike": { save: "WIS", rolls: [damage(3, 8)] },
  "Moonbeam": { save: "CON", rollsLater: true, rolls: [damage(2, 10)] },
  "Phantasmal Force": { save: "INT", rollsLater: true, rolls: [damage(1, 6, 0)] },
  "Prayer of Healing": { rolls: [healing(2, 8)] },
  "Rime's Binding Ice": { save: "CON", rolls: [damage(3, 8)] },
  "Scorching Ray": { attack: true, pieces: { label: "Променів", count: 3, perSlot: 1 }, rolls: [damage(2, 6, 0)] },
  "Shadow Blade": { rollsLater: true, rolls: [{ ...damage(2, 8, 0), countFromSlot: { 3: 3, 5: 4, 7: 5 } }] },
  "Shatter": { save: "CON", rolls: [damage(3, 8)] },
  "Snilloc's Snowball Swarm": { save: "DEX", rolls: [damage(3, 6)] },
  "Spike Growth": { rollsLater: true, rolls: [damage(2, 4, 0)] },
  "Spiritual Weapon": { attack: true, rolls: [{ ...damage(1, 8), addsModifier: true, slotsPerStep: 2 }] },
  "Spray of Cards": { save: "DEX", rolls: [damage(2, 10)] },
  "Tasha's Mind Whip": { save: "INT", rolls: [damage(3, 6, 0)] },
  "Wither and Bloom": { save: "CON", rolls: [damage(2, 6)] },

  "Antagonize": { save: "WIS", rolls: [damage(4, 4)] },
  "Ashardalon's Stride": { rollsLater: true, rolls: [damage(1, 6)] },
  "Aura of Vitality": { rollsLater: true, rolls: [{ label: "Лікування", count: 2, sides: 6 }] },
  "Bestow Curse": { save: "WIS", rollsLater: true, rolls: [damage(1, 8, 0)] },
  "Blinding Smite": { save: "CON", rollsLater: true, rolls: [damage(3, 8, 0)] },
  "Call Lightning": { save: "DEX", rolls: [damage(3, 10)] },
  "Conjure Barrage": { save: "DEX", rolls: [damage(3, 8, 0)] },
  "Crusader's Mantle": { rollsLater: true, rolls: [damage(1, 4, 0)] },
  "Elemental Weapon": { rollsLater: true, rolls: [{ ...damage(1, 4, 0), countFromSlot: { 5: 2, 7: 3 } }] },
  "Erupting Earth": { save: "DEX", rolls: [damage(3, 12)] },
  "Fireball": { save: "DEX", rolls: [damage(8, 6)] },
  "Flame Arrows": { rollsLater: true, pieces: { label: "Стріл", count: 12, perSlot: 2 }, rolls: [damage(1, 6, 0)] },
  "Glyph of Warding": { save: "DEX", rollsLater: true, rolls: [damage(5, 8)] },
  "Hunger of Hadar": { save: "DEX", rollsLater: true, rolls: [{ label: "Холод", count: 2, sides: 6 }, { label: "Кислота", count: 2, sides: 6 }] },
  "Life Transference": { rolls: [{ label: "Шкода вам", count: 4, sides: 8, perSlot: 1 }] },
  "Lightning Arrow": { save: "DEX", rollsLater: true, rolls: [{ label: "Ціль", count: 4, sides: 8, perSlot: 1 }, { label: "Поруч", count: 2, sides: 8, perSlot: 1 }] },
  "Lightning Bolt": { save: "DEX", rolls: [damage(8, 6)] },
  "Mass Healing Word": { rolls: [healing(1, 4)] },
  "Melf's Minute Meteors": { save: "DEX", rollsLater: true, pieces: { label: "Метеорів", count: 6, perSlot: 2 }, rolls: [damage(2, 6, 0)] },
  "Pulse Wave": { save: "CON", rolls: [damage(6, 6)] },
  "Spirit Guardians": { save: "WIS", rollsLater: true, rolls: [damage(3, 8)] },
  "Spirit Shroud": { rollsLater: true, rolls: [{ ...damage(1, 8), slotsPerStep: 2 }] },
  "Thunder Step": { save: "CON", rolls: [damage(3, 10)] },
  "Tidal Wave": { save: "DEX", rolls: [damage(4, 8, 0)] },
  "Vampiric Touch": { attack: true, rolls: [damage(3, 6)] },
  "Wind Wall": { save: "STR", rolls: [damage(3, 8, 0)] },
};

const SAME_IN_2024 = [
  "Acid Splash", "Eldritch Blast", "Fire Bolt", "Mind Sliver", "Produce Flame", "Ray of Frost", "Sacred Flame", "Shocking Grasp",
  "Thorn Whip", "Thunderclap", "Toll the Dead", "Word of Radiance",
  "Arms of Hadar", "Burning Hands", "Chromatic Orb", "Dissonant Whispers", "Divine Favor", "Ensnaring Strike", "Guiding Bolt",
  "Hellish Rebuke", "Hex", "Hunter's Mark", "Ice Knife", "Magic Missile", "Ray of Sickness", "Thunderwave",
  "Cloud of Daggers", "Dragon's Breath", "Flaming Sphere", "Heat Metal", "Melf's Acid Arrow", "Mind Spike", "Moonbeam",
  "Scorching Ray", "Shatter", "Spike Growth",
  "Aura of Vitality", "Bestow Curse", "Call Lightning", "Crusader's Mantle", "Elemental Weapon", "Fireball", "Glyph of Warding",
  "Lightning Arrow", "Lightning Bolt", "Spirit Guardians", "Vampiric Touch",
];

/// У 2024 кари накладаються вже після влучання, тож шкода кидається одразу.
const SPELL_DICE_2024: Readonly<Record<string, SpellDice>> = {
  ...Object.fromEntries(SAME_IN_2024.map((engName) => [engName, SPELL_DICE_2014[engName]])),
  "Chill Touch": { attack: true, rolls: [cantrip(1, 10)] },
  "Poison Spray": { attack: true, rolls: [cantrip(1, 12)] },
  "Sorcerous Burst": { attack: true, rolls: [cantrip(1, 8)] },
  "Starry Wisp": { attack: true, rolls: [cantrip(1, 8)] },
  "True Strike": { attack: true, rolls: [{ label: "Променева", count: 0, sides: 6 }] },
  "Vicious Mockery": { save: "WIS", rolls: [cantrip(1, 6)] },

  "Cure Wounds": { rolls: [{ ...healing(2, 8), perSlot: 2 }] },
  "Divine Smite": { rolls: [damage(2, 8), { label: "Почварі чи невмерлому", count: 1, sides: 8 }] },
  "False Life": { rolls: [{ label: "Тимчасові хіти", count: 2, sides: 4, bonus: 4, bonusPerSlot: 5 }] },
  "Hail of Thorns": { save: "DEX", rolls: [damage(1, 10)] },
  "Healing Word": { rolls: [{ ...healing(2, 4), perSlot: 2 }] },
  "Inflict Wounds": { save: "CON", rolls: [damage(2, 10)] },
  "Searing Smite": { save: "CON", rolls: [damage(1, 6)] },
  "Thunderous Smite": { save: "STR", rolls: [damage(2, 6)] },
  "Witch Bolt": { attack: true, rolls: [damage(2, 12), { label: "Наступні ходи", count: 1, sides: 12 }] },
  "Wrathful Smite": { save: "WIS", rolls: [damage(1, 6)] },

  "Cordon of Arrows": { save: "DEX", rollsLater: true, rolls: [damage(2, 4, 0)] },
  "Flame Blade": { attack: true, rollsLater: true, rolls: [{ ...damage(3, 6), addsModifier: true }] },
  "Phantasmal Force": { save: "INT", rollsLater: true, rolls: [damage(2, 8, 0)] },
  "Prayer of Healing": { rolls: [{ label: "Лікування", count: 2, sides: 8, perSlot: 1 }] },
  "Shining Smite": { rolls: [damage(2, 6)] },
  "Spiritual Weapon": { attack: true, rolls: [{ ...damage(1, 8), addsModifier: true }] },

  "Blinding Smite": { save: "CON", rolls: [damage(3, 8)] },
  "Hunger of Hadar": { save: "DEX", rollsLater: true, rolls: [{ label: "Холод", count: 2, sides: 6, perSlot: 1 }, { label: "Кислота", count: 2, sides: 6 }] },
  "Conjure Animals": { save: "DEX", rollsLater: true, rolls: [damage(3, 10)] },
  "Conjure Barrage": { save: "DEX", rolls: [damage(5, 8)] },
  "Mass Healing Word": { rolls: [healing(2, 4)] },
  "Wind Wall": { save: "STR", rolls: [damage(4, 8, 0)] },
};

export function listSpellDice(ruleset: "RULES_2014" | "RULES_2024"): ReadonlyArray<[string, SpellDice]> {
  return Object.entries(ruleset === "RULES_2024" ? SPELL_DICE_2024 : SPELL_DICE_2014);
}

export function findSpellDice(spell: { engName?: string | null; level: number; ruleset?: string | null }): SpellDice | null {
  if (spell.level > MAX_SPELL_LEVEL || !spell.engName) return null;
  return (spell.ruleset === "RULES_2024" ? SPELL_DICE_2024 : SPELL_DICE_2014)[spell.engName] ?? null;
}

export function planSpellRolls(dice: SpellDice, input: SpellRollInput): SpellRollPlan {
  const steps = { slot: Math.max(0, input.slotLevel - input.spellLevel), tier: input.spellLevel === 0 ? findCantripTier(input.characterLevel) - 1 : 0 };
  const pieces = dice.pieces ? countPieces(dice.pieces, steps) : null;
  const rolls = dice.rolls
    .map((spec, index) => buildRoll(spec, index, input, steps, dice.pieces?.isSummed ? pieces ?? 1 : 1))
    .filter((roll) => roll.count > 0);
  return {
    attack: Boolean(dice.attack),
    save: dice.save ?? null,
    rollsLater: Boolean(dice.rollsLater),
    pieces: dice.pieces && !dice.pieces.isSummed ? { label: dice.pieces.label, count: pieces ?? 0 } : null,
    rolls,
  };
}

type Steps = { slot: number; tier: number };

function buildRoll(spec: DiceSpec, index: number, input: SpellRollInput, steps: Steps, multiplier: number): SpellRoll {
  const bonus = (spec.bonus ?? 0) + (spec.addsModifier ? input.spellcastingModifier : 0) + (spec.bonusPerSlot ?? 0) * steps.slot;
  return { key: `spell-${index}`, label: spec.label, count: countDice(spec, input.slotLevel, steps) * multiplier, sides: spec.sides, bonus: bonus * multiplier };
}

function countDice(spec: DiceSpec, slotLevel: number, steps: Steps): number {
  if (spec.countFromSlot) return findCountFromSlot(spec.countFromSlot, slotLevel) ?? spec.count;
  const upcast = Math.floor(steps.slot / (spec.slotsPerStep ?? 1)) * (spec.perSlot ?? 0);
  const count = spec.count + upcast + steps.tier * (spec.perCantripTier ?? 1);
  return spec.maxCount ? Math.min(spec.maxCount, count) : count;
}

function findCountFromSlot(countFromSlot: Readonly<Record<number, number>>, slotLevel: number): number | undefined {
  const reached = Object.keys(countFromSlot).map(Number).filter((slot) => slot <= slotLevel);
  return reached.length ? countFromSlot[Math.max(...reached)] : undefined;
}

function countPieces(pieces: PiecesSpec, steps: Steps): number {
  return pieces.count + steps.slot * (pieces.perSlot ?? 0) + steps.tier * (pieces.perCantripTier ?? 0);
}

export function findCantripTier(characterLevel: number): number {
  if (characterLevel >= 17) return 4;
  if (characterLevel >= 11) return 3;
  return characterLevel >= 5 ? 2 : 1;
}
