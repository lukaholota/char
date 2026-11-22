import type { MagicItemEffect, MovementMode } from "@/rules/magic-item-effects";
import type { MagicWeaponTraits, WeaponHitDamage } from "@/rules/magic-weapons";
import type { RollScope } from "@/rules/state-effects";
import type { DamageTypeKey } from "@/rules/types";
import { formatModifier } from "@/lib/logic/utils";
import { formatDiceUkr } from "@/lib/logic/equipment-stats";
import { abilityTranslations, damageTypeTranslations, skillTranslations } from "@/lib/refs/translation";

const MOVEMENT_LABELS: Record<MovementMode, string> = { FLY: "польоту", CLIMB: "лазіння", SWIM: "плавання" };

const ADVANTAGE_LABELS: Record<RollScope, string> = {
  ABILITY_CHECK: "перевірки характеристик",
  STR_CHECK: "перевірки Сили",
  ACROBATICS_CHECK: "перевірки Акробатики",
  STEALTH_CHECK: "перевірки Непомітності",
  PERCEPTION_CHECK: "перевірки Уважності",
  INITIATIVE: "кидки Ініціативи",
  ATTACK: "кидки атаки",
  SAVE: "ряткидки",
  STR_SAVE: "ряткидки Сили",
  DEX_SAVE: "ряткидки Спритності",
  CONCENTRATION_SAVE: "ряткидки концентрації",
};

const listDamageTypes = (types: readonly string[]) => types.map((type) => damageTypeTranslations[type] ?? type).join(", ");

export function describeMagicItemEffect(effect: MagicItemEffect): string {
  switch (effect.kind) {
    case "AC_BONUS":
      return `КБ ${formatModifier(effect.bonus)}${effect.unarmoredOnly ? " без обладунку й щита" : ""}`;
    case "SAVE_BONUS":
      return effect.ability ? `Рятівний кидок (${abilityTranslations[effect.ability]}) ${formatModifier(effect.bonus)}` : `Усі рятівні кидки ${formatModifier(effect.bonus)}`;
    case "RANGED_DAMAGE_BONUS":
      return `Шкода дальньою зброєю ${formatModifier(effect.bonus)}`;
    case "ABILITY_SCORE":
      return `${abilityTranslations[effect.ability]} ${effect.score}, якщо ваше значення нижче`;
    case "ABILITY_BONUS":
      return `${abilityTranslations[effect.ability]} ${formatModifier(effect.bonus)}, не вище ${effect.max}`;
    case "CHECK_BONUS":
      return `Перевірки характеристик, навички й ініціатива ${formatModifier(effect.bonus)}`;
    case "SKILL_BONUS":
      return `${skillTranslations[effect.skill] ?? effect.skill} ${formatModifier(effect.bonus)}`;
    case "PROFICIENCY_BONUS":
      return `Бонус майстерності ${formatModifier(effect.bonus)}`;
    case "SPELL_ATTACK_BONUS":
      return `Атака заклинаннями ${formatModifier(effect.bonus)}`;
    case "SPELL_DC_BONUS":
      return `СК заклинань ${formatModifier(effect.bonus)}`;
    case "MOVEMENT":
      return effect.feet === "WALK"
        ? `Швидкість ${MOVEMENT_LABELS[effect.mode]} дорівнює швидкості ходьби`
        : `Швидкість ${MOVEMENT_LABELS[effect.mode]} ${effect.feet} футів`;
    case "DARKVISION":
      return effect.extendsExisting ? `Темнозір ${effect.range} футів або +${effect.range} до наявного` : `Темнозір ${effect.range} футів`;
    case "RESISTANCE":
      return `Опір до шкоди: ${listDamageTypes(effect.damageTypes)}`;
    case "IMMUNITY":
      return `Імунітет до шкоди: ${listDamageTypes(effect.damageTypes)}`;
    case "ADVANTAGE":
      return `Перевага на ${ADVANTAGE_LABELS[effect.scope]}`;
    case "NOTE":
      return effect.text;
  }
}

export function isCountedBySheet(effect: MagicItemEffect): boolean {
  return effect.kind !== "NOTE";
}

export function hasCountedEffects(effects: readonly MagicItemEffect[]): boolean {
  return effects.some(isCountedBySheet);
}

const HIT_DAMAGE_WORDS: Record<DamageTypeKey, string> = {
  ACID: "шкоди кислотою",
  BLUDGEONING: "дроблячої шкоди",
  LIGHTNING: "шкоди блискавкою",
  NECROTIC: "некротичної шкоди",
  POISON: "шкоди отрутою",
  PSYCHIC: "психічної шкоди",
  THUNDER: "шкоди громом",
  COLD: "шкоди холодом",
  FIRE: "шкоди вогнем",
  FORCE: "шкоди силовим полем",
  PIERCING: "колючої шкоди",
  RADIANT: "променевої шкоди",
  SLASHING: "рублячої шкоди",
};

export function describeHitDamage(hit: WeaponHitDamage): string {
  const damage = `+${hit.count}к${hit.sides} ${hit.customType ? `шкоди «${hit.customType}»` : ((hit.damageType && HIT_DAMAGE_WORDS[hit.damageType]) ?? "шкоди")}`;
  if (!hit.condition) return damage;
  return `${damage}${hit.condition.startsWith("поки") ? ", " : " "}${hit.condition}`;
}

export function describeMagicWeaponTraits(traits: MagicWeaponTraits): string[] {
  const profile = traits.profile;
  return [
    ...(profile?.attackAbility ? [`Влучання від характеристики: ${abilityTranslations[profile.attackAbility]}`] : []),
    ...(profile?.damage || profile?.damageType ? [`Шкода: ${[profile.damage ? formatDiceUkr(profile.damage) : "як у зброї", profile.damageType ? damageTypeTranslations[profile.damageType].toLowerCase() : ""].filter(Boolean).join(" ")}`] : []),
    ...(traits.bonus > 0 ? [`+${traits.bonus} до атаки й шкоди цією зброєю`] : []),
    ...traits.hits.map((hit) => `При влучанні ${describeHitDamage(hit)}`),
  ];
}
