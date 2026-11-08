import { pickD20Value, type D20Mode } from "./dice-roll";
import { readAbilityModifier, readSignedNumber } from "./creature-rolls";
import { findSpellDice } from "./spell-dice";
import { findConditionStem, normalizeApostrophes, TOKEN_CONDITION_LABELS, type RuleConditionKey } from "./token-conditions";
import type { AbilityKey } from "./types";

export type DamageType = "acid" | "bludgeoning" | "cold" | "fire" | "force" | "lightning" | "necrotic" | "piercing" | "poison" | "psychic" | "radiant" | "slashing" | "thunder";
export type DamageDefense = "immune" | "resistant" | "vulnerable";
export type SpellSaveDamage = { ability: AbilityKey; damageType: DamageType; isHalfOnSave: boolean };
/// Ряткидок без шкоди має damageType null; стан накладається лише при провалі.
export type SaveEffect = { ability: AbilityKey; damageType: DamageType | null; isHalfOnSave: boolean; condition?: RuleConditionKey };

export type CreatureSaveStats = {
  savingThrows: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  specialAbilities: string;
  damageImmunity: string;
  damageResistance: string;
  damageVulnerability?: string;
  conditionImmunity?: string;
};

export type CreatureSaveResult = {
  d20: number[];
  mode: D20Mode;
  bonus: number;
  total: number;
  isSaved: boolean;
  isAutoFail: boolean;
  defense: DamageDefense | null;
  damage: number;
  condition?: RuleConditionKey;
  /// к4 «Благословення» тощо: value вже зі знаком.
  dice?: SaveDieRoll[];
};

export type SaveDieRoll = { sides: number; value: number };

export type CreatureSaveInput = {
  creature: CreatureSaveStats | null;
  conditions: readonly string[];
  effect: SaveEffect;
  dc: number;
  rolledDamage: number;
  d20Pair: readonly [number, number];
  dice?: readonly SaveDieRoll[];
};

/// Замовляння без шкоди при успіху, решта — половина. Не тут: кари й зони «пізніше» (шкода не в мить накладання),
/// Розжарений метал і Каустичне вариво (ряткидок не від шкоди), Крижаний ніж (вибух — окремий кидок).
const SAVE_DAMAGE: Readonly<Record<string, readonly [DamageType, "half" | "none"]>> = {
  "Acid Splash": ["acid", "none"],
  "Create Bonfire": ["fire", "none"],
  "Frostbite": ["cold", "none"],
  "Infestation": ["poison", "none"],
  "Lightning Lure": ["lightning", "none"],
  "Mind Sliver": ["psychic", "none"],
  "Poison Spray": ["poison", "none"],
  "Sacred Flame": ["radiant", "none"],
  "Sapping Sting": ["necrotic", "none"],
  "Sword Burst": ["force", "none"],
  "Thunderclap": ["thunder", "none"],
  "Toll the Dead": ["necrotic", "none"],
  "Vicious Mockery": ["psychic", "none"],
  "Word of Radiance": ["radiant", "none"],
  "Catapult": ["bludgeoning", "none"],
  "Earth Tremor": ["bludgeoning", "none"],
  "Arms of Hadar": ["necrotic", "half"],
  "Burning Hands": ["fire", "half"],
  "Dissonant Whispers": ["psychic", "half"],
  "Frost Fingers": ["cold", "half"],
  "Hail of Thorns": ["piercing", "half"],
  "Hellish Rebuke": ["fire", "half"],
  "Inflict Wounds": ["necrotic", "half"],
  "Magnify Gravity": ["force", "half"],
  "Thunderwave": ["thunder", "half"],
  "Aganazzar's Scorcher": ["fire", "half"],
  "Mind Spike": ["psychic", "half"],
  "Rime's Binding Ice": ["cold", "half"],
  "Shatter": ["thunder", "half"],
  "Snilloc's Snowball Swarm": ["cold", "half"],
  "Spray of Cards": ["force", "half"],
  "Tasha's Mind Whip": ["psychic", "half"],
  "Wither and Bloom": ["necrotic", "half"],
  "Antagonize": ["psychic", "half"],
  "Call Lightning": ["lightning", "half"],
  "Erupting Earth": ["bludgeoning", "half"],
  "Fireball": ["fire", "half"],
  "Lightning Bolt": ["lightning", "half"],
  "Pulse Wave": ["force", "half"],
  "Thunder Step": ["thunder", "half"],
  "Tidal Wave": ["bludgeoning", "half"],
  "Wind Wall": ["bludgeoning", "half"],
};

const DAMAGE_STEMS: Readonly<Record<DamageType, readonly string[]>> = {
  acid: ["кислот"],
  bludgeoning: ["дробл", "дробил"],
  cold: ["холод"],
  fire: ["вогн", "вогон"],
  force: ["силов"],
  lightning: ["блискав"],
  necrotic: ["некрот"],
  piercing: ["колюч"],
  poison: ["отру"],
  psychic: ["психіч"],
  radiant: ["промен", "сяюч"],
  slashing: ["рубл", "ріжуч"],
  thunder: ["гром"],
};

export function findDamageTypeIn(text: string): DamageType | null {
  const lowered = text.toLocaleLowerCase("uk");
  const found = (Object.keys(DAMAGE_STEMS) as DamageType[]).filter((type) => DAMAGE_STEMS[type].some((stem) => lowered.includes(stem)));
  return found.length === 1 ? found[0] : null;
}

/// Групи, що не діють проти заклинання або залежать від вибору майстра: їх вирішує майстер сам.
const UNRESOLVED_GROUP = /немагічн|посріблен|адамантин|залежно|вибор|див\./iu;

const ABILITY_SAVE_PREFIX: Readonly<Record<AbilityKey, string>> = { STR: "сил", DEX: "спр", CON: "ста", INT: "інт", WIS: "муд", CHA: "хар" };
const ABILITY_SCORE_FIELD = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
} as const satisfies Record<AbilityKey, keyof CreatureSaveStats>;

const AUTO_FAIL_CONDITIONS = new Set(["paralyzed", "stunned", "unconscious", "petrified"]);
const MAGIC_RESISTANCE = /Опір магії/u;

export function findSpellSaveDamage(spell: { engName?: string | null; level: number; ruleset?: string | null }): SpellSaveDamage | null {
  const dice = findSpellDice(spell);
  const effect = spell.engName ? SAVE_DAMAGE[spell.engName] : undefined;
  if (!dice?.save || dice.attack || dice.rollsLater || !effect) return null;
  return { ability: dice.save, damageType: effect[0], isHalfOnSave: effect[1] === "half" };
}

export function findDamageDefense(creature: Pick<CreatureSaveStats, "damageImmunity" | "damageResistance" | "damageVulnerability">, damageType: DamageType): DamageDefense | null {
  if (hasDamageType(creature.damageImmunity, damageType)) return "immune";
  const isResistant = hasDamageType(creature.damageResistance, damageType);
  const isVulnerable = hasDamageType(creature.damageVulnerability ?? "", damageType);
  if (isResistant === isVulnerable) return null;
  return isResistant ? "resistant" : "vulnerable";
}

function hasDamageType(defenses: string, damageType: DamageType): boolean {
  const groups = defenses.toLocaleLowerCase("uk").split(";").filter((group) => !UNRESOLVED_GROUP.test(group));
  return groups.some((group) => DAMAGE_STEMS[damageType].some((stem) => group.includes(stem)));
}

/// «Спр +6» з рядка ряткидків, інакше модифікатор характеристики; «+ БМ» призваних істот не додається — він від заклинателя.
export function findCreatureSaveBonus(creature: CreatureSaveStats, ability: AbilityKey): number {
  const prefix = ABILITY_SAVE_PREFIX[ability];
  const listed = creature.savingThrows.split(",").find((part) => part.trim().toLocaleLowerCase("uk").startsWith(prefix));
  const listedBonus = listed ? readSignedNumber(listed) : null;
  return listedBonus ?? readAbilityModifier(creature[ABILITY_SCORE_FIELD[ability]]) ?? 0;
}

export function findCreatureSaveMode(creature: CreatureSaveStats | null, conditions: readonly string[], ability: AbilityKey): D20Mode {
  const hasAdvantage = MAGIC_RESISTANCE.test(creature?.specialAbilities ?? "");
  const hasDisadvantage = ability === "DEX" && conditions.includes("restrained");
  if (hasAdvantage === hasDisadvantage) return "NORMAL";
  return hasAdvantage ? "ADVANTAGE" : "DISADVANTAGE";
}

export function isCreatureSaveAutoFail(conditions: readonly string[], ability: AbilityKey): boolean {
  return (ability === "STR" || ability === "DEX") && conditions.some((condition) => AUTO_FAIL_CONDITIONS.has(condition));
}

/// Половина й опори округлюються вниз, опір рахується після половини — як у правилах.
export function findSaveDamage(rolledDamage: number, isSaved: boolean, effect: SaveEffect, defense: DamageDefense | null): number {
  const afterSave = !isSaved ? rolledDamage : effect.isHalfOnSave ? Math.floor(rolledDamage / 2) : 0;
  if (defense === "immune") return 0;
  if (defense === "resistant") return Math.floor(afterSave / 2);
  return defense === "vulnerable" ? afterSave * 2 : afterSave;
}

export function resolveCreatureSave({ creature, conditions, effect, dc, rolledDamage, d20Pair, dice = [] }: CreatureSaveInput): CreatureSaveResult {
  const mode = findCreatureSaveMode(creature, conditions, effect.ability);
  const d20 = mode === "NORMAL" ? [d20Pair[0]] : [...d20Pair];
  const bonus = creature ? findCreatureSaveBonus(creature, effect.ability) : 0;
  const total = pickD20Value(d20, mode) + bonus + sumSaveDice(dice);
  const isAutoFail = isCreatureSaveAutoFail(conditions, effect.ability);
  const isSaved = !isAutoFail && total >= dc;
  const isConditionImmune = Boolean(effect.condition && hasConditionImmunity(creature?.conditionImmunity ?? "", effect.condition));
  const damageDefense = creature && effect.damageType ? findDamageDefense(creature, effect.damageType) : null;
  const defense = effect.damageType ? damageDefense : isConditionImmune ? "immune" : null;
  const damage = findSaveDamage(rolledDamage, isSaved, effect, defense);
  return { d20, mode, bonus, total, isSaved, isAutoFail, defense, damage, ...findFailedCondition(effect, isSaved, isConditionImmune), ...(dice.length ? { dice: [...dice] } : {}) };
}

export function findFailedCondition(effect: SaveEffect, isSaved: boolean, isImmune: boolean): { condition?: RuleConditionKey } {
  return !isSaved && effect.condition && !isImmune ? { condition: effect.condition } : {};
}

function hasConditionImmunity(conditionImmunity: string, condition: RuleConditionKey): boolean {
  return normalizeApostrophes(conditionImmunity.toLocaleLowerCase("uk")).includes(findConditionStem(TOKEN_CONDITION_LABELS[condition]));
}

export function sumSaveDice(dice: readonly SaveDieRoll[]): number {
  return dice.reduce((sum, die) => sum + die.value, 0);
}
