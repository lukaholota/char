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
  /// Шкода другого типу під тим самим ряткидком (Крижаний шторм): окрема група кубиків, щоб опори рахувались по типах.
  second?: { count: number; sides: number; perSlot?: number };
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

export type SpellRoll = { key: string; label: string; count: number; sides: number; bonus: number; secondDice?: { count: number; sides: number } };

export type SpellRollPlan = {
  attack: boolean;
  save: AbilityKey | null;
  rollsLater: boolean;
  pieces: { label: string; count: number } | null;
  /// Дротики Чарівної стріли кидаються однією сумою, але цілей може бути стільки, скільки дротиків.
  darts?: number;
  rolls: SpellRoll[];
};

export type SpellRollInput = { spellLevel: number; slotLevel: number; characterLevel: number; spellcastingModifier: number };

const MAX_SPELL_LEVEL = 9;

const cantrip = (count: number, sides: number): DiceSpec => ({ label: "Шкода", count, sides });
const damage = (count: number, sides: number, perSlot = 1): DiceSpec => ({ label: "Шкода", count, sides, perSlot });
const healing = (count: number, sides: number): DiceSpec => ({ label: "Лікування", count, sides, addsModifier: true, perSlot: 1 });
/// Один кидок лікує кожного з цілей: окремий підпис, щоб мапа не просила обрати одного героя.
const groupHealing = (spec: DiceSpec): DiceSpec => ({ ...spec, label: "Лікування кожного" });
/// Число без кубиків («Зцілення» — 70 хітів): sides 0 лишає кидок у плані, хоча кидати нічого.
const flat = (label: string, bonus: number, bonusPerSlot = 0): DiceSpec => ({ label, count: 0, sides: 0, bonus, bonusPerSlot });

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
  "Prayer of Healing": { rolls: [groupHealing(healing(2, 8))] },
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
  "Mass Healing Word": { rolls: [groupHealing(healing(1, 4))] },
  "Melf's Minute Meteors": { save: "DEX", rollsLater: true, pieces: { label: "Метеорів", count: 6, perSlot: 2 }, rolls: [damage(2, 6, 0)] },
  "Pulse Wave": { save: "CON", rolls: [damage(6, 6)] },
  "Spirit Guardians": { save: "WIS", rollsLater: true, rolls: [damage(3, 8)] },
  "Spirit Shroud": { rollsLater: true, rolls: [{ ...damage(1, 8), slotsPerStep: 2 }] },
  "Thunder Step": { save: "CON", rolls: [damage(3, 10)] },
  "Tidal Wave": { save: "DEX", rolls: [damage(4, 8, 0)] },
  "Vampiric Touch": { attack: true, rolls: [damage(3, 6)] },
  "Wind Wall": { save: "STR", rolls: [damage(3, 8, 0)] },

  "Blight": { save: "CON", rolls: [damage(8, 8)] },
  "Control Water": { save: "STR", rollsLater: true, rolls: [damage(2, 8, 0)] },
  "Dimension Door": { rollsLater: true, rolls: [{ label: "Шкода вам", count: 4, sides: 6 }] },
  "Elemental Bane": { save: "CON", rollsLater: true, rolls: [damage(2, 6, 0)] },
  "Evard's Black Tentacles": { save: "DEX", rollsLater: true, rolls: [damage(3, 6, 0)] },
  "Fire Shield": { rollsLater: true, rolls: [damage(2, 8, 0)] },
  "Gravity Sinkhole": { save: "CON", rolls: [damage(5, 10)] },
  "Guardian of Nature": { rollsLater: true, rolls: [damage(1, 6, 0)] },
  "Ice Storm": { save: "DEX", rolls: [{ ...damage(2, 8), second: { count: 4, sides: 6 } }] },
  "Mordenkainen's Faithful Hound": { attack: true, rollsLater: true, rolls: [damage(4, 8, 0)] },
  "Phantasmal Killer": { save: "WIS", rollsLater: true, rolls: [damage(4, 10)] },
  "Raulothim's Psychic Lance": { save: "INT", rolls: [damage(7, 6)] },
  "Shadow of Moil": { rollsLater: true, rolls: [damage(2, 8, 0)] },
  "Sickening Radiance": { save: "CON", rollsLater: true, rolls: [damage(4, 10, 0)] },
  "Staggering Smite": { save: "WIS", rollsLater: true, rolls: [damage(4, 6, 0)] },
  "Storm Sphere": { attack: true, save: "STR", rollsLater: true, rolls: [{ label: "Сфера", count: 2, sides: 6, perSlot: 1 }, { label: "Блискавка", count: 4, sides: 6, perSlot: 1 }] },
  "Vitriolic Sphere": { save: "DEX", rolls: [damage(10, 4, 2), { label: "Наступного ходу", count: 5, sides: 4 }] },
  "Wall of Fire": { save: "DEX", rolls: [damage(5, 8)] },

  "Banishing Smite": { rollsLater: true, rolls: [damage(5, 10, 0)] },
  "Bigby's Hand": { attack: true, rolls: [damage(4, 8, 2), { label: "Стискання", count: 2, sides: 6, addsModifier: true, perSlot: 2 }] },
  "Cloudkill": { save: "CON", rollsLater: true, rolls: [damage(5, 8)] },
  "Cone of Cold": { save: "CON", rolls: [damage(8, 8)] },
  "Conjure Volley": { save: "DEX", rolls: [damage(8, 8, 0)] },
  "Contact Other Plane": { rollsLater: true, rolls: [{ label: "Шкода вам", count: 6, sides: 6 }] },
  "Dawn": { save: "CON", rolls: [damage(4, 10, 0)] },
  /// shortcut: друга половина «променева або некротична на вибір» рахується як променева, поки на панелі немає вибору типу шкоди.
  "Destructive Wave": { save: "CON", rolls: [{ ...damage(5, 6, 0), second: { count: 5, sides: 6 } }] },
  "Dream": { save: "WIS", rollsLater: true, rolls: [damage(3, 6, 0)] },
  "Enervation": { save: "DEX", rolls: [{ label: "Провал", count: 4, sides: 8, perSlot: 1 }, { label: "Успіх", count: 2, sides: 8 }] },
  "Flame Strike": { save: "DEX", rolls: [{ ...damage(4, 6), second: { count: 4, sides: 6 } }] },
  "Geas": { save: "WIS", rollsLater: true, rolls: [damage(5, 10, 0)] },
  "Holy Weapon": { save: "CON", rollsLater: true, rolls: [damage(2, 8, 0), { label: "Спалах", count: 4, sides: 8 }] },
  "Immolation": { save: "DEX", rolls: [damage(8, 6, 0), { label: "Наступні ходи", count: 4, sides: 6 }] },
  "Insect Plague": { save: "CON", rolls: [damage(4, 10)] },
  "Maelstrom": { save: "STR", rollsLater: true, rolls: [damage(6, 6, 0)] },
  "Mass Cure Wounds": { rolls: [groupHealing(healing(3, 8))] },
  "Negative Energy Flood": { save: "CON", rolls: [damage(5, 12, 0)] },
  "Steel Wind Strike": { attack: true, pieces: { label: "Цілей", count: 5 }, rolls: [damage(6, 10, 0)] },
  "Synaptic Static": { save: "INT", rolls: [damage(8, 6, 0)] },
  "Transmute Rock": { save: "DEX", rollsLater: true, rolls: [damage(4, 8, 0)] },
  "Wall of Light": { save: "CON", rolls: [damage(4, 8), { label: "Промінь", count: 4, sides: 8, perSlot: 1 }] },
  "Wrath of Nature": { attack: true, save: "DEX", rollsLater: true, rolls: [{ label: "Дерева", count: 4, sides: 6 }, { label: "Каміння", count: 3, sides: 8 }] },

  "Blade Barrier": { save: "DEX", rollsLater: true, rolls: [damage(6, 10, 0)] },
  "Bones of the Earth": { rollsLater: true, rolls: [damage(6, 6, 0)] },
  "Chain Lightning": { save: "DEX", rolls: [damage(10, 8, 0)] },
  "Circle of Death": { save: "CON", rolls: [damage(8, 6, 2)] },
  "Create Homunculus": { rolls: [{ label: "Шкода вам", count: 2, sides: 4 }] },
  "Disintegrate": { save: "DEX", rolls: [{ ...damage(10, 6, 3), bonus: 40 }] },
  "Forbiddance": { rollsLater: true, rolls: [damage(5, 10, 0)] },
  "Gravity Fissure": { save: "CON", rolls: [damage(8, 8)] },
  "Harm": { save: "CON", rolls: [damage(14, 6, 0)] },
  "Heal": { rolls: [flat("Лікування", 70, 10)] },
  "Heroes' Feast": { rolls: [{ label: "Максимум хітів", count: 2, sides: 10 }] },
  "Investiture of Flame": { save: "DEX", rollsLater: true, rolls: [{ label: "Поруч", count: 1, sides: 10 }, { label: "Лінія вогню", count: 4, sides: 8 }] },
  "Investiture of Ice": { save: "CON", rollsLater: true, rolls: [damage(4, 6, 0)] },
  "Investiture of Wind": { save: "CON", rollsLater: true, rolls: [damage(2, 10, 0)] },
  "Mental Prison": { save: "INT", rolls: [damage(5, 10, 0), { label: "Втеча", count: 10, sides: 10 }] },
  "Otiluke's Freezing Sphere": { save: "CON", rolls: [damage(10, 6)] },
  "Soul Cage": { rollsLater: true, rolls: [{ label: "Лікування", count: 2, sides: 8 }] },
  "Sunbeam": { save: "CON", rolls: [damage(6, 8, 0)] },
  "Tenser's Transformation": { rollsLater: true, rolls: [damage(2, 12, 0)] },
  "Wall of Ice": { save: "DEX", rolls: [damage(10, 6, 2), { label: "Крижане повітря", count: 5, sides: 6, perSlot: 1 }] },
  "Wall of Thorns": { save: "DEX", rolls: [damage(7, 8), { label: "Крізь стіну", count: 7, sides: 8, perSlot: 1 }] },

  "Crown of Stars": { attack: true, rollsLater: true, rolls: [damage(4, 12, 0)] },
  "Delayed Blast Fireball": { save: "DEX", rolls: [damage(12, 6)] },
  "Draconic Transformation": { save: "DEX", rolls: [damage(6, 8, 0)] },
  "Finger of Death": { save: "CON", rolls: [{ ...damage(7, 8, 0), bonus: 30 }] },
  "Fire Storm": { save: "DEX", rolls: [damage(7, 10, 0)] },
  "Mordenkainen's Sword": { attack: true, rolls: [damage(3, 10, 0)] },
  "Prismatic Spray": { save: "DEX", rollsLater: true, rolls: [{ label: "Колір", count: 1, sides: 8 }, { label: "Шкода променя", count: 10, sides: 6 }] },
  "Regenerate": { rolls: [{ label: "Лікування", count: 4, sides: 8, bonus: 15 }] },
  "Symbol": { save: "CON", rollsLater: true, rolls: [damage(10, 10, 0)] },
  "Teleport": { rollsLater: true, rolls: [{ label: "Шкода від невдачі", count: 3, sides: 10 }] },
  "Whirlwind": { save: "DEX", rolls: [damage(10, 6, 0)] },

  "Abi-Dalzim's Horrid Wilting": { save: "CON", rolls: [damage(12, 8, 0)] },
  "Dark Star": { save: "CON", rollsLater: true, rolls: [damage(8, 10, 0)] },
  "Earthquake": { save: "DEX", rollsLater: true, rolls: [damage(5, 6, 0)] },
  "Feeblemind": { save: "INT", rolls: [damage(4, 6, 0)] },
  "Illusory Dragon": { save: "INT", rollsLater: true, rolls: [damage(7, 6, 0)] },
  "Incendiary Cloud": { save: "DEX", rolls: [damage(10, 8, 0)] },
  "Maddening Darkness": { save: "WIS", rollsLater: true, rolls: [damage(8, 8, 0)] },
  "Reality Break": {
    save: "WIS",
    rollsLater: true,
    rolls: [{ label: "Ефект", count: 1, sides: 10 }, { label: "Розрив", count: 6, sides: 12 }, { label: "Вихор", count: 8, sides: 12 }, { label: "Холод безодні", count: 10, sides: 12 }],
  },
  "Sunburst": { save: "CON", rolls: [damage(12, 6, 0)] },
  "Tsunami": { save: "STR", rolls: [damage(6, 10, 0), { label: "Наступні раунди", count: 5, sides: 10 }] },

  "Blade of Disaster": { attack: true, rolls: [damage(4, 12, 0), { label: "Критичне", count: 12, sides: 12 }] },
  "Mass Heal": { rolls: [flat("Запас лікування", 700)] },
  "Meteor Swarm": { save: "DEX", rolls: [{ ...damage(20, 6, 0), second: { count: 20, sides: 6 } }] },
  "Prismatic Wall": { save: "DEX", rollsLater: true, rolls: [{ label: "Шкода шару", count: 10, sides: 6 }] },
  "Psychic Scream": { save: "INT", rolls: [damage(14, 6, 0)] },
  "Ravenous Void": { rollsLater: true, rolls: [damage(5, 10, 0)] },
  "Storm of Vengeance": {
    save: "CON",
    rolls: [damage(2, 6, 0), { label: "Кислотний дощ", count: 1, sides: 6 }, { label: "Блискавка", count: 10, sides: 6 }, { label: "Град", count: 2, sides: 6 }, { label: "Холод", count: 1, sides: 6 }],
  },
  "Time Ravage": { save: "CON", rolls: [damage(10, 12, 0)] },
  "Time Stop": { rolls: [{ label: "Ходів", count: 1, sides: 4, bonus: 1 }] },
  "Weird": { save: "WIS", rollsLater: true, rolls: [damage(4, 10, 0)] },
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
  "Blight", "Control Water", "Dimension Door", "Fire Shield", "Vitriolic Sphere", "Wall of Fire",
  "Cone of Cold", "Contact Other Plane", "Destructive Wave", "Dream", "Geas", "Insect Plague", "Steel Wind Strike", "Synaptic Static",
  "Chain Lightning", "Disintegrate", "Forbiddance", "Harm", "Heal", "Heroes' Feast", "Otiluke's Freezing Sphere", "Sunbeam",
  "Wall of Ice", "Wall of Thorns",
  "Delayed Blast Fireball", "Finger of Death", "Fire Storm", "Regenerate", "Symbol", "Teleport",
  "Incendiary Cloud", "Sunburst", "Tsunami", "Mass Heal", "Meteor Swarm", "Time Stop",
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
  "Prayer of Healing": { rolls: [groupHealing({ label: "Лікування", count: 2, sides: 8, perSlot: 1 })] },
  "Shining Smite": { rolls: [damage(2, 6)] },
  "Spiritual Weapon": { attack: true, rolls: [{ ...damage(1, 8), addsModifier: true }] },

  "Blinding Smite": { save: "CON", rolls: [damage(3, 8)] },
  "Hunger of Hadar": { save: "DEX", rollsLater: true, rolls: [{ label: "Холод", count: 2, sides: 6, perSlot: 1 }, { label: "Кислота", count: 2, sides: 6 }] },
  "Conjure Animals": { save: "DEX", rollsLater: true, rolls: [damage(3, 10)] },
  "Conjure Barrage": { save: "DEX", rolls: [damage(5, 8)] },
  "Mass Healing Word": { rolls: [groupHealing(healing(2, 4))] },
  "Wind Wall": { save: "STR", rolls: [damage(4, 8, 0)] },

  "Conjure Minor Elementals": { rollsLater: true, rolls: [damage(2, 8)] },
  "Conjure Woodland Beings": { save: "WIS", rollsLater: true, rolls: [damage(5, 8)] },
  "Evard's Black Tentacles": { save: "STR", rolls: [damage(3, 6, 0)] },
  "Fount of Moonlight": { save: "CON", rollsLater: true, rolls: [damage(2, 6, 0)] },
  "Grasping Vine": { attack: true, rolls: [damage(4, 8, 0)] },
  "Ice Storm": { save: "DEX", rolls: [{ ...damage(2, 10), second: { count: 4, sides: 6 } }] },
  "Mordenkainen's Faithful Hound": { save: "DEX", rollsLater: true, rolls: [damage(4, 8, 0)] },
  "Phantasmal Killer": { save: "WIS", rolls: [damage(4, 10), { label: "Наступні ходи", count: 4, sides: 10, perSlot: 1 }] },
  "Staggering Smite": { save: "WIS", rolls: [damage(4, 6)] },

  "Banishing Smite": { rolls: [damage(5, 10, 0)] },
  "Bigby's Hand": { attack: true, rolls: [damage(5, 8, 2), { label: "Стискання", count: 4, sides: 6, addsModifier: true, perSlot: 2 }] },
  "Cloudkill": { save: "CON", rolls: [damage(5, 8)] },
  "Conjure Elemental": { save: "DEX", rollsLater: true, rolls: [damage(8, 8), { label: "Наступні ходи", count: 4, sides: 8 }] },
  "Conjure Volley": { save: "DEX", rolls: [damage(8, 8, 0)] },
  "Contagion": { save: "CON", rolls: [damage(11, 8, 0)] },
  "Flame Strike": { save: "DEX", rolls: [{ ...damage(5, 6), second: { count: 5, sides: 6, perSlot: 1 } }] },
  "Jallarzi's Storm of Radiance": { save: "CON", rolls: [{ ...damage(2, 10), second: { count: 2, sides: 10, perSlot: 1 } }] },
  "Mass Cure Wounds": { rolls: [groupHealing(healing(5, 8))] },
  "Yolande's Regal Presence": { save: "WIS", rollsLater: true, rolls: [damage(4, 6, 0)] },

  "Blade Barrier": { save: "DEX", rolls: [damage(6, 10, 0)] },
  "Circle of Death": { save: "CON", rolls: [damage(8, 8, 2)] },
  "Conjure Fey": { attack: true, rolls: [{ ...damage(3, 12), addsModifier: true }] },

  "Conjure Celestial": { save: "DEX", rollsLater: true, rolls: [healing(4, 12), damage(6, 12)] },
  "Mordenkainen's Sword": { attack: true, rolls: [{ ...damage(4, 12, 0), addsModifier: true }] },
  "Prismatic Spray": { save: "DEX", rollsLater: true, rolls: [{ label: "Колір", count: 1, sides: 8 }, { label: "Шкода променя", count: 12, sides: 6 }] },

  "Befuddlement": { save: "INT", rolls: [damage(10, 12, 0)] },
  "Earthquake": { save: "DEX", rollsLater: true, rolls: [damage(12, 6, 0)] },

  "Power Word Kill": { rollsLater: true, rolls: [damage(12, 12, 0)] },
  "Prismatic Wall": { save: "DEX", rollsLater: true, rolls: [{ label: "Шкода шару", count: 12, sides: 6 }] },
  "Storm of Vengeance": {
    save: "CON",
    rolls: [damage(2, 6, 0), { label: "Кислотний дощ", count: 4, sides: 6 }, { label: "Блискавка", count: 10, sides: 6 }, { label: "Град", count: 2, sides: 6 }, { label: "Холод", count: 1, sides: 6 }],
  },
  "Weird": { save: "WIS", rolls: [damage(10, 10, 0), { label: "Наступні ходи", count: 5, sides: 10 }] },
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
    .filter((roll) => roll.count > 0 || roll.sides === 0);
  return {
    attack: Boolean(dice.attack),
    save: dice.save ?? null,
    rollsLater: Boolean(dice.rollsLater),
    pieces: dice.pieces && !dice.pieces.isSummed ? { label: dice.pieces.label, count: pieces ?? 0 } : null,
    ...(dice.pieces?.isSummed && pieces ? { darts: pieces } : {}),
    rolls,
  };
}

type Steps = { slot: number; tier: number };

function buildRoll(spec: DiceSpec, index: number, input: SpellRollInput, steps: Steps, multiplier: number): SpellRoll {
  const bonus = (spec.bonus ?? 0) + (spec.addsModifier ? input.spellcastingModifier : 0) + (spec.bonusPerSlot ?? 0) * steps.slot;
  const secondDice = spec.second ? { secondDice: { count: spec.second.count + steps.slot * (spec.second.perSlot ?? 0), sides: spec.second.sides } } : {};
  return { key: `spell-${index}`, label: spec.label, count: countDice(spec, input.slotLevel, steps) * multiplier, sides: spec.sides, bonus: bonus * multiplier, ...secondDice };
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
