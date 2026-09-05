/**
 * Другий шар персонажа у звіриній формі: копія `pers` із підміненими Силою, Спритністю,
 * Тілобудовою, КБ, швидкістю й хітами. Калькуляторів це не змінює — вони як були чистими
 * функціями від `pers`, так і лишаються, тож навички, рятівні кидки та ініціатива
 * перераховуються самі ([Р-1](docs/o24-wildshape-second-layer/README.md)).
 *
 * Інтелект, Мудрість, Харизма, риси й фічі не чіпаються, а дії, атаки й особливості звіра
 * показує статблок, а не лист ([Р-2](docs/o24-wildshape-second-layer/README.md)).
 *
 * Дві редакції розходяться тут у трьох місцях, і кожне бере рішення з правил, а не з умови в
 * коді: хіти (2014 — стос звіра, 2024 — свої плюс тимчасові), КБ (Коло місяця 2024 бере
 * `13 + МУД`, якщо це більше) і володіння (2014 лишає персонажеві, 2024 бере більше з двох).
 */

import { Ability, Skills } from "@prisma/client";
import type { PersWithRelations } from "@/lib/actions/pers";
import type { CreatureData } from "@/lib/bestiaryData";
import {
  type WildshapeContext,
  findBeastFormArmorClass,
  parseAbilityScore,
  parseArmorClass,
  usesBetterOfBeastProficiencies,
  usesSeparateBeastHitPoints,
} from "@/rules/wildshape";
import { parseBeastSaveModifiers, parseBeastSkillModifiers } from "./beast-proficiencies";
import { calculateFinalAC, calculateFinalModifier, calculateFinalSave, calculateFinalSkill } from "./bonus-calculator";

/// Швидкість на листі рахується як `30 + бонус` — іншого каналу в калькулятора немає, тож
/// швидкість звіра доводиться класти саме бонусом. Число тут і в `calculateFinalSpeed` одне.
const BASE_WALK_SPEED = 30;

/// `context` — рівень друїда, коло й редакція. Саме редакція, а не каталог, з якого приїхала
/// істота: правила бере персонаж.
export type BeastFormLayer = {
  creature: CreatureData;
  context: WildshapeContext;
  beastCurrentHp: number;
  beastMaxHp: number;
};

/// Характеристики, які Дика форма 2014 підміняє. Решта — персонажеві, і другого числа поруч
/// не отримують ([Р-5](docs/o24-wildshape-second-layer/README.md)).
const BEAST_FORM_ABILITIES = [Ability.STR, Ability.DEX, Ability.CON] as const;

export function buildBeastFormPers(pers: PersWithRelations, layer: BeastFormLayer): PersWithRelations {
  const withAbilities = replaceAbilitiesWithBeast(pers, layer.creature);
  const withHitPoints = applyHitPointsOfEdition(withAbilities, layer);
  const withSpeed = replaceSpeedWithBeast(withHitPoints, layer.creature);
  const withArmorClass = replaceArmorClassWithBeast(withSpeed, layer);
  return raiseProficienciesToBeast(withArmorClass, layer);
}

/// Чи малює лист стос хітів звіра замість власних. У 2024 хіти лишаються персонажеві, тимчасові
/// йому видає сервер при вході — тож підміняти тут нема чого.
export function hasBeastHitPointStack(layer: BeastFormLayer): boolean {
  return usesSeparateBeastHitPoints(layer.context.ruleset);
}

/// Які саме характеристики справді підмінено — нерозібраний статблок не має вдавати, що
/// підмінив. Позначку «змінено» на листі малюють рівно за цим списком.
export function listBeastAbilities(creature: CreatureData): Ability[] {
  return BEAST_FORM_ABILITIES.filter((ability) => findBeastScore(creature, ability) !== null);
}

function replaceAbilitiesWithBeast(pers: PersWithRelations, creature: CreatureData): PersWithRelations {
  const replaced = listBeastAbilities(creature);
  if (replaced.length === 0) return pers;

  return {
    ...pers,
    str: findBeastScore(creature, Ability.STR) ?? pers.str,
    dex: findBeastScore(creature, Ability.DEX) ?? pers.dex,
    con: findBeastScore(creature, Ability.CON) ?? pers.con,
    statBonuses: clearAbilityEntries(pers.statBonuses, replaced),
    statModifierBonuses: clearAbilityEntries(pers.statModifierBonuses, replaced),
  };
}

/// Расовий +2 до Сили не додається до Сили ведмедя: характеристика звіра заміщає, а не
/// підсилює. Бонуси до Інтелекту, Мудрості й Харизми лишаються на місці.
function clearAbilityEntries(bonuses: PersWithRelations["statBonuses"], replaced: Ability[]) {
  if (!bonuses || typeof bonuses !== "object" || Array.isArray(bonuses)) return bonuses;

  const kept = { ...(bonuses as Record<string, unknown>) };
  for (const ability of replaced) delete kept[ability];
  return kept as PersWithRelations["statBonuses"];
}

function findBeastScore(creature: CreatureData, ability: Ability): number | null {
  if (ability === Ability.STR) return parseAbilityScore(creature.strength);
  if (ability === Ability.DEX) return parseAbilityScore(creature.dexterity);
  return parseAbilityScore(creature.constitution);
}

/// 2014 — хіти звіра окремий стос, а не бонус до власних: блок хітів на листі стає звіриним
/// цілком ([Р-6](docs/o24-wildshape-second-layer/README.md)). 2024 — персонаж лишається у своїх
/// хітах, тож блок не чіпається взагалі, включно з тимчасовими.
function applyHitPointsOfEdition(pers: PersWithRelations, layer: BeastFormLayer): PersWithRelations {
  return hasBeastHitPointStack(layer) ? replaceHitPointsWithBeast(pers, layer) : pers;
}

function replaceHitPointsWithBeast(pers: PersWithRelations, layer: BeastFormLayer): PersWithRelations {
  return {
    ...pers,
    maxHp: layer.beastMaxHp,
    currentHp: Math.max(0, Math.min(layer.beastCurrentHp, layer.beastMaxHp)),
    tempHp: 0,
    hpBonuses: null,
  };
}

function replaceSpeedWithBeast(pers: PersWithRelations, creature: CreatureData): PersWithRelations {
  return { ...pers, speedBonuses: { value: (creature.walkSpeed ?? 0) - BASE_WALK_SPEED } };
}

/**
 * КБ у формі — рівно той, що дало правило: ані щит, ані расовий бонус, ані обладунок, який
 * злився з новою подобою, до нього не додаються. Калькулятор лишається недоторканим, тож
 * надбавки спершу вимірюються з нульовою базою, а тоді база береться так, щоб сума дала
 * потрібне число.
 */
function replaceArmorClassWithBeast(pers: PersWithRelations, layer: BeastFormLayer): PersWithRelations {
  const beastArmorClass = parseArmorClass(layer.creature.ac);
  if (beastArmorClass === null) return pers;

  const armorClass = findBeastFormArmorClass({
    beastArmorClass,
    wisdomModifier: calculateFinalModifier(pers, Ability.WIS),
    context: layer.context,
  });

  const additions = calculateFinalAC({ ...pers, overrideBaseAC: 0 });
  return { ...pers, overrideBaseAC: armorClass - additions };
}

/**
 * Правило 2024 «береться більше з двох»: володіння персонажа лишаються з його бонусом
 * майстерності, але там, де статблок звіра дає більше, показується число статблока. Робиться це
 * надбавкою до вже порахованого модифікатора, а не підміною володіння, — інакше довелося б
 * чіпати калькулятори, які лист і PDF ділять із рештою листа.
 */
function raiseProficienciesToBeast(pers: PersWithRelations, layer: BeastFormLayer): PersWithRelations {
  if (!usesBetterOfBeastProficiencies(layer.context.ruleset)) return pers;

  return {
    ...pers,
    skillBonuses: raiseEntries<PersWithRelations["skillBonuses"], Skills>(
      pers.skillBonuses,
      parseBeastSkillModifiers(layer.creature.skills),
      (skill) => calculateFinalSkill(pers, skill).total
    ),
    saveBonuses: raiseEntries<PersWithRelations["saveBonuses"], Ability>(
      pers.saveBonuses,
      parseBeastSaveModifiers(layer.creature.savingThrows),
      (ability) => calculateFinalSave(pers, ability)
    ),
  };
}

function raiseEntries<T, K extends string>(
  bonuses: T,
  beastModifiers: Partial<Record<K, number>>,
  findOwnModifier: (key: K) => number
): T {
  const raised: Record<string, number> = { ...readNumericBonuses(bonuses) };

  for (const key of Object.keys(beastModifiers) as K[]) {
    const shortfall = (beastModifiers[key] ?? 0) - findOwnModifier(key);
    if (shortfall > 0) raised[key] = (raised[key] ?? 0) + shortfall;
  }

  return raised as T;
}

function readNumericBonuses(bonuses: unknown): Record<string, number> {
  if (!bonuses || typeof bonuses !== "object" || Array.isArray(bonuses)) return {};

  return Object.fromEntries(
    Object.entries(bonuses).filter((entry): entry is [string, number] => typeof entry[1] === "number")
  );
}
