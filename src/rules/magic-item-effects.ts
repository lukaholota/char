import { readRuleset } from "./ruleset";
import type { RollScope } from "./state-effects";
import type { AbilityKey, DamageTypeKey, Ruleset } from "./types";

export type MovementMode = "FLY" | "CLIMB" | "SWIM";

export type MagicItemEffect =
  | { kind: "AC_BONUS"; bonus: number; unarmoredOnly?: boolean }
  | { kind: "SAVE_BONUS"; bonus: number; ability?: AbilityKey }
  | { kind: "RANGED_DAMAGE_BONUS"; bonus: number }
  | { kind: "ABILITY_SCORE"; ability: AbilityKey; score: number }
  | { kind: "ABILITY_BONUS"; ability: AbilityKey; bonus: number; max: number }
  | { kind: "CHECK_BONUS"; bonus: number }
  | { kind: "SKILL_BONUS"; skill: string; bonus: number }
  | { kind: "PROFICIENCY_BONUS"; bonus: number }
  | { kind: "SPELL_ATTACK_BONUS"; bonus: number }
  | { kind: "SPELL_DC_BONUS"; bonus: number }
  | { kind: "MOVEMENT"; mode: MovementMode; feet: number | "WALK" }
  | { kind: "DARKVISION"; range: number; extendsExisting?: boolean }
  | { kind: "RESISTANCE"; damageTypes: DamageTypeKey[] }
  | { kind: "IMMUNITY"; damageTypes: DamageTypeKey[] }
  | { kind: "ADVANTAGE"; scope: RollScope }
  | { kind: "NOTE"; text: string };

export type MagicItemEffectSource = {
  engName?: string | null;
  ruleset?: string | null;
  bonusToAC?: number | null;
  noArmorOrShieldForACBonus?: boolean | null;
  bonusToSavingThrows?: unknown;
  bonusToRangedDamage?: number | null;
};

export type ActiveMagicItem = { name: string; effects: readonly MagicItemEffect[] };
export type ItemPart = { label: string; value: number };

type EditionEffects = MagicItemEffect[] | Partial<Record<Ruleset, MagicItemEffect[]>>;

const score = (ability: AbilityKey, value: number): MagicItemEffect => ({ kind: "ABILITY_SCORE", ability, score: value });
const raise = (ability: AbilityKey): MagicItemEffect => ({ kind: "ABILITY_BONUS", ability, bonus: 2, max: 20 });
const armorClass = (bonus: number): MagicItemEffect => ({ kind: "AC_BONUS", bonus });
const saves = (bonus: number): MagicItemEffect => ({ kind: "SAVE_BONUS", bonus });
const spellAttack = (bonus: number): MagicItemEffect => ({ kind: "SPELL_ATTACK_BONUS", bonus });
const spellDc = (bonus: number): MagicItemEffect => ({ kind: "SPELL_DC_BONUS", bonus });
const move = (mode: MovementMode, feet: number | "WALK"): MagicItemEffect => ({ kind: "MOVEMENT", mode, feet });
const resist = (...damageTypes: DamageTypeKey[]): MagicItemEffect => ({ kind: "RESISTANCE", damageTypes });
const immune = (...damageTypes: DamageTypeKey[]): MagicItemEffect => ({ kind: "IMMUNITY", damageTypes });
const note = (text: string): MagicItemEffect => ({ kind: "NOTE", text });
const advantage = (scope: RollScope): MagicItemEffect => ({ kind: "ADVANTAGE", scope });

const PACT_KEEPER_NOTE = note("Лише для заклинань чаклуна.");
const WAR_MAGE_NOTE = note("Ігнорує половинне укриття під час атаки заклинанням.");
const VARIANT_SPELL_NOTE = note("Бонус залежить від різновиду (+1, +2 або +3) — додайте його вручну до атаки й СК заклинань.");
const HELD_NOTE = note("Діє, поки ви тримаєте предмет: зніміть позначку «Екіпіровано», коли він не в руках.");
const RESISTANCE_CHOICE_NOTE = note("Тип опору обирається для конкретного предмета — додайте його вручну.");

/// Числа з колонок магічного предмета (КБ, ряткидки, шкода дальньою зброєю) лишаються джерелом;
/// реєстр доповнює їх там, де колонка порожня (2024), і дає решту ефектів.
const MAGIC_ITEM_EFFECTS: Record<string, EditionEffects> = {
  "Headband of Intellect": [score("INT", 19)],
  "Amulet of Health": [score("CON", 19)],
  "Gauntlets of Ogre Power": [score("STR", 19)],
  "Belt of Hill Giant Strength": [score("STR", 21)],
  "Belt of Stone Giant Strength": [score("STR", 23)],
  "Belt of Frost Giant Strength": [score("STR", 23)],
  "Belt of Fire Giant Strength": [score("STR", 25)],
  "Belt of Cloud Giant Strength": [score("STR", 27)],
  "Belt of Storm Giant Strength": [score("STR", 29)],
  "Belt of Dwarvenkind": [
    raise("CON"),
    { kind: "DARKVISION", range: 60 },
    resist("POISON"),
    note("Перевага на ряткидки проти отрути та на Переконання з дворфами; ви знаєте Дворфську."),
  ],
  "Ioun Stone (Strength)": [raise("STR")],
  "Ioun Stone (Agility)": [raise("DEX")],
  "Ioun Stone (Fortitude)": [raise("CON")],
  "Ioun Stone (Intellect)": [raise("INT")],
  "Ioun Stone (Insight)": [raise("WIS")],
  "Ioun Stone (Leadership)": [raise("CHA")],
  "Ioun Stone (Mastery)": [{ kind: "PROFICIENCY_BONUS", bonus: 1 }],
  "Ioun Stone (Protection)": [armorClass(1)],
  "Stone of Good Luck (Luckstone)": [{ kind: "CHECK_BONUS", bonus: 1 }, saves(1)],
  "Cloak of Protection": [armorClass(1), saves(1)],
  "Ring of Protection": [armorClass(1), saves(1)],
  "Robe of Stars": [saves(1)],
  "Luck Blade": [saves(1)],
  "Bracers of Defense": [{ kind: "AC_BONUS", bonus: 2, unarmoredOnly: true }],
  "Bracers of Archery": [
    { kind: "RANGED_DAMAGE_BONUS", bonus: 2 },
    note("Бонус до шкоди — лише довгим і коротким луком."),
  ],
  "Armor +1": [armorClass(1)],
  "Armor +2": [armorClass(2)],
  "Armor +3": [armorClass(3)],
  "Shield +1": [armorClass(1)],
  "Shield +2": [armorClass(2)],
  "Shield +3": [armorClass(3)],
  "Elven Chain": [armorClass(1)],
  "Glamoured Studded Leather": [armorClass(1)],
  "Dwarven Plate": [armorClass(2)],
  "Demon Armor": [armorClass(1), note("Беззбройні удари: 1к8 рублячої шкоди, +1 до атаки й шкоди.")],
  "Dragon Scale Mail": [armorClass(1), RESISTANCE_CHOICE_NOTE],
  "Efreeti Chain": [armorClass(3), immune("FIRE"), note("Ви знаєте Первинну мову й ходите розплавленим камінням.")],
  "Shield of the Cavalier": [armorClass(2)],
  "Scarab of Protection": { RULES_2024: [armorClass(1)] },
  "Wand of Orcus": [armorClass(3), HELD_NOTE],
  "Staff of Power": [armorClass(2), saves(2), spellAttack(2), HELD_NOTE],
  "Blackstaff": [armorClass(2), saves(2), spellAttack(2), HELD_NOTE],
  "Staff of the Magi": [spellAttack(2), HELD_NOTE],
  "Staff of the Woodlands": [spellAttack(2), HELD_NOTE],
  "Talisman of Pure Good": [spellAttack(2)],
  "Talisman of Ultimate Evil": [spellAttack(2)],
  "Robe of the Archmagi": [
    spellAttack(2),
    spellDc(2),
    note("Без обладунку базовий КБ — 15 + Спритність; перевага на ряткидки проти заклинань і магії."),
  ],
  "Rod of the Pact Keeper +1": [spellAttack(1), spellDc(1), PACT_KEEPER_NOTE],
  "Rod of the Pact Keeper +2": [spellAttack(2), spellDc(2), PACT_KEEPER_NOTE],
  "Rod of the Pact Keeper +3": [spellAttack(3), spellDc(3), PACT_KEEPER_NOTE],
  "Wand of the War Mage +1": [spellAttack(1), WAR_MAGE_NOTE],
  "Wand of the War Mage +2": [spellAttack(2), WAR_MAGE_NOTE],
  "Wand of the War Mage +3": [spellAttack(3), WAR_MAGE_NOTE],
  "Amulet of the Devout": [VARIANT_SPELL_NOTE],
  "Arcane Grimoire": [VARIANT_SPELL_NOTE],
  "Bloodwell Vial": [VARIANT_SPELL_NOTE],
  "Moon Sickle": [VARIANT_SPELL_NOTE],
  "All-Purpose Tool": [VARIANT_SPELL_NOTE],
  "Rhythm-Maker's Drum": [VARIANT_SPELL_NOTE],
  "Gloves of Thievery": {
    RULES_2014: [{ kind: "SKILL_BONUS", skill: "SLEIGHT_OF_HAND", bonus: 5 }, note("Ще +5 до перевірок Спритності, щоб зламати замок.")],
    RULES_2024: [{ kind: "SKILL_BONUS", skill: "SLEIGHT_OF_HAND", bonus: 5 }],
  },
  "Gloves of Swimming and Climbing": {
    RULES_2014: [note("Лазіння й плавання не коштують зайвого переміщення; +5 до Атлетики, щоб лізти чи плисти.")],
    RULES_2024: [move("CLIMB", "WALK"), move("SWIM", "WALK"), note("+5 до Атлетики, щоб лізти чи плисти.")],
  },
  "Winged Boots": { RULES_2014: [move("FLY", "WALK"), note("Літати можна сумарно до 4 годин; за 12 годин без польоту відновлюється 2 години.")] },
  "Slippers of Spider Climbing": [move("CLIMB", "WALK"), note("Можна ходити стінами й стелею, лишаючи руки вільними.")],
  "Ring of Swimming": [move("SWIM", 40)],
  "Cloak of the Manta Ray": {
    RULES_2014: [move("SWIM", 60), note("Діє з накинутим каптуром; ви дихаєте під водою.")],
    RULES_2024: [move("SWIM", 60), note("Ви дихаєте під водою.")],
  },
  "Mariner's Armor": [move("SWIM", "WALK")],
  "Goggles of Night": [{ kind: "DARKVISION", range: 60, extendsExisting: true }],
  "Ring of Warmth": {
    RULES_2014: [resist("COLD"), note("Холод до −45 °C вам не шкодить.")],
    RULES_2024: [note("Шкода холодом зменшується на 2к8; холод вам не шкодить.")],
  },
  "Boots of the Winterlands": [resist("COLD"), note("Ви ігноруєте важкопрохідну місцевість з криги чи снігу.")],
  "Periapt of Proof against Poison": [immune("POISON"), note("Ви маєте імунітет до стану «Отруєний».")],
  "Ring of Resistance": [RESISTANCE_CHOICE_NOTE],
  "Armor of Resistance": [RESISTANCE_CHOICE_NOTE],
  "Boots of Striding and Springing": [note("Швидкість ходьби щонайменше 30 футів і не падає від ваги чи важкого обладунку.")],
  "Weapon of Warning": {
    RULES_2014: [advantage("INITIATIVE"), note("Вас і союзників у межах 30 футів не можна застати зненацька.")],
    RULES_2024: [advantage("INITIATIVE"), note("Союзники в межах 30 футів теж мають перевагу на Ініціативу.")],
  },
  "Sentinel Shield": [advantage("INITIATIVE"), advantage("PERCEPTION_CHECK")],
  "Cloak of Elvenkind": { RULES_2024: [advantage("STEALTH_CHECK"), note("Уважність, щоб помітити вас, — з перешкодою.")] },
  "Boots of Elvenkind": {
    RULES_2014: [note("Ваші кроки беззвучні; перевага на Непомітність, коли ви покладаєтеся на тихий рух.")],
    RULES_2024: [advantage("STEALTH_CHECK"), note("Ваші кроки беззвучні.")],
  },
  "Cloak of Displacement": [note("Атаки по вас — з перешкодою. Отримали шкоду — ефект зникає до початку вашого наступного ходу.")],
  "Mantle of Spell Resistance": [note("Перевага на ряткидки проти заклинань.")],
  "Ring of Spell Turning": { RULES_2014: [note("Перевага на ряткидки проти заклинання, націленого лише на вас, а не на область.")] },
  "Spellguard Shield": [note("Перевага на ряткидки проти заклинань і магічних ефектів; атаки заклинаннями по вас — з перешкодою.")],
  "Eyes of the Eagle": [note("Перевага на Уважність, яка покладається на зір.")],
  "Eyes of Minute Seeing": { RULES_2014: [note("Перевага на Розслідування, яке покладається на зір, у межах 1 фута.")] },
  "Necklace of Adaptation": {
    RULES_2014: [note("Ви дихаєте в будь-якому середовищі; перевага на ряткидки проти шкідливих газів і випарів.")],
    RULES_2024: [note("Ви дихаєте в будь-якому середовищі; перевага на ряткидки, щоб уникнути чи позбутися стану Отруєний.")],
  },
};

const COLUMN_KINDS = new Set<MagicItemEffect["kind"]>(["AC_BONUS", "SAVE_BONUS", "RANGED_DAMAGE_BONUS"]);

export function findMagicItemEffects(item: MagicItemEffectSource): MagicItemEffect[] {
  const fromColumns = readColumnEffects(item);
  const coveredKinds = new Set(fromColumns.map((effect) => effect.kind));
  const fromRegistry = findRegistryEffects(item.engName, item.ruleset)
    .filter((effect) => !(COLUMN_KINDS.has(effect.kind) && coveredKinds.has(effect.kind)));
  return [...fromColumns, ...fromRegistry];
}

function findRegistryEffects(engName: string | null | undefined, ruleset: string | null | undefined): MagicItemEffect[] {
  const entry = engName ? MAGIC_ITEM_EFFECTS[engName] : undefined;
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  return entry[readRuleset(ruleset)] ?? [];
}

const SAVE_COLUMN_ABILITIES: Record<string, AbilityKey> = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };

function readColumnEffects(item: MagicItemEffectSource): MagicItemEffect[] {
  const effects: MagicItemEffect[] = [];
  if (item.bonusToAC) effects.push({ kind: "AC_BONUS", bonus: item.bonusToAC, unarmoredOnly: Boolean(item.noArmorOrShieldForACBonus) });
  const columnSaves = item.bonusToSavingThrows;
  if (columnSaves && typeof columnSaves === "object") {
    for (const [key, bonus] of Object.entries(columnSaves as Record<string, unknown>)) {
      if (typeof bonus !== "number" || bonus === 0) continue;
      effects.push(key === "all" ? saves(bonus) : { kind: "SAVE_BONUS", bonus, ability: SAVE_COLUMN_ABILITIES[key] });
    }
  }
  if (item.bonusToRangedDamage) effects.push({ kind: "RANGED_DAMAGE_BONUS", bonus: item.bonusToRangedDamage });
  return effects;
}

/// Предмет, що встановлює значення (Пов'язка інтелекту — 19), діє першим і лише найсильніший;
/// приріст «+2, максимум 20» додається після нього.
export function explainItemAbilityParts(items: readonly ActiveMagicItem[], ability: AbilityKey, scoreBefore: number): ItemPart[] {
  const setter = findStrongestSetter(items, ability);
  const parts: ItemPart[] = [];
  let current = scoreBefore;
  if (setter && setter.score > current) {
    parts.push({ label: setter.name, value: setter.score - current });
    current = setter.score;
  }
  for (const item of items) {
    for (const effect of item.effects) {
      if (effect.kind !== "ABILITY_BONUS" || effect.ability !== ability) continue;
      const gain = Math.max(0, Math.min(effect.bonus, effect.max - current));
      if (gain > 0) parts.push({ label: item.name, value: gain });
      current += gain;
    }
  }
  return parts;
}

function findStrongestSetter(items: readonly ActiveMagicItem[], ability: AbilityKey): { name: string; score: number } | null {
  let strongest: { name: string; score: number } | null = null;
  for (const item of items) {
    for (const effect of item.effects) {
      if (effect.kind === "ABILITY_SCORE" && effect.ability === ability && effect.score > (strongest?.score ?? 0)) {
        strongest = { name: item.name, score: effect.score };
      }
    }
  }
  return strongest;
}

export function explainItemBonusParts(items: readonly ActiveMagicItem[], pickBonus: (effect: MagicItemEffect) => number): ItemPart[] {
  return items
    .map((item) => ({ label: item.name, value: item.effects.reduce((total, effect) => total + pickBonus(effect), 0) }))
    .filter((part) => part.value !== 0);
}

export const pickSaveBonus = (ability: AbilityKey) => (effect: MagicItemEffect) =>
  effect.kind === "SAVE_BONUS" && (!effect.ability || effect.ability === ability) ? effect.bonus : 0;
export const pickCheckBonus = (effect: MagicItemEffect) => (effect.kind === "CHECK_BONUS" ? effect.bonus : 0);
export const pickSkillBonus = (skill: string) => (effect: MagicItemEffect) =>
  (effect.kind === "CHECK_BONUS" ? effect.bonus : 0) + (effect.kind === "SKILL_BONUS" && effect.skill === skill ? effect.bonus : 0);
export const pickProficiencyBonus = (effect: MagicItemEffect) => (effect.kind === "PROFICIENCY_BONUS" ? effect.bonus : 0);
export const pickSpellAttackBonus = (effect: MagicItemEffect) => (effect.kind === "SPELL_ATTACK_BONUS" ? effect.bonus : 0);
export const pickSpellDcBonus = (effect: MagicItemEffect) => (effect.kind === "SPELL_DC_BONUS" ? effect.bonus : 0);
export const pickRangedDamageBonus = (effect: MagicItemEffect) => (effect.kind === "RANGED_DAMAGE_BONUS" ? effect.bonus : 0);
export const pickArmorClassBonus = (wearsArmorOrShield: boolean) => (effect: MagicItemEffect) =>
  effect.kind === "AC_BONUS" && !(effect.unarmoredOnly && wearsArmorOrShield) ? effect.bonus : 0;

export function findItemMovementSpeeds(items: readonly ActiveMagicItem[], walkingSpeed: number): Partial<Record<MovementMode, number>> {
  const speeds: Partial<Record<MovementMode, number>> = {};
  for (const effect of items.flatMap((item) => item.effects)) {
    if (effect.kind !== "MOVEMENT") continue;
    const feet = effect.feet === "WALK" ? walkingSpeed : effect.feet;
    speeds[effect.mode] = Math.max(speeds[effect.mode] ?? 0, feet);
  }
  return speeds;
}

/// Окуляри нічного бачення додають 60 футів до наявного темнозору, а без нього дають 60.
export function findItemDarkvisionRange(items: readonly ActiveMagicItem[], ownRange: number | null): number | null {
  let range = ownRange;
  const effects = items.flatMap((item) => item.effects).flatMap((effect) => (effect.kind === "DARKVISION" ? [effect] : []));
  for (const effect of effects) if (!effect.extendsExisting) range = Math.max(range ?? 0, effect.range);
  for (const effect of effects) if (effect.extendsExisting) range = range ? range + effect.range : effect.range;
  return range;
}

export function collectItemDamageTypes(items: readonly ActiveMagicItem[], kind: "RESISTANCE" | "IMMUNITY"): DamageTypeKey[] {
  return items.flatMap((item) => item.effects).flatMap((effect) => (effect.kind === kind ? effect.damageTypes : []));
}
