import { findCreatureRolls, type CreatureRollSpot } from "./creature-rolls";
import { findDamageTypeIn, type DamageType } from "./creature-save";
import type { AreaShape } from "./game-areas";
import { findConditionStem, normalizeApostrophes, TOKEN_CONDITION_LABELS, type RuleConditionKey } from "./token-conditions";
import type { AbilityKey } from "./types";

export type CreatureSaveAction = {
  ability: AbilityKey;
  dc: number;
  damage: { count: number; sides: number; bonus: number };
  damageType: DamageType;
  isHalfOnSave: boolean;
  area?: Area;
  condition?: RuleConditionKey;
};

/// Ряткидок без шкоди від провалу: ефект — стан, якщо він однозначний, інакше його вирішує ведучий.
export type CreatureSaveEffect = { ability: AbilityKey; dc: number; condition: RuleConditionKey | null; area?: Area };

export type CreatureAreaAction = Omit<CreatureSaveAction, "area"> & Area;

type Area = { shape: AreaShape; sizeFeet: number };

const SHAPE_BY_STEM: ReadonlyArray<readonly [string, AreaShape]> = [
  ["конус", "cone"],
  ["лін", "line"],
  ["сфер", "circle"],
  ["радіус", "circle"],
  ["випромінюван", "circle"],
  ["циліндр", "circle"],
  ["куб", "square"],
];
const ABILITY_BY_STEM: ReadonlyArray<readonly [string, AbilityKey]> = [["сил", "STR"], ["спр", "DEX"], ["ста", "CON"], ["інт", "INT"], ["муд", "WIS"], ["хар", "CHA"]];

const SHAPE_STEMS = SHAPE_BY_STEM.map(([stem]) => stem).join("|");
const SIZE_BEFORE_SHAPE = new RegExp(String.raw`(\d+)-футов\p{L}*\s+(${SHAPE_STEMS})`, "giu");
const SIZE_AFTER_SHAPE = new RegExp(String.raw`(${SHAPE_STEMS})\p{L}*\s+(?:радіус\p{L}*\s+)?(\d+)\s*(?:фут|фт)`, "giu");
/// «Кожна істота в межах 30 футів від мандрагори» — коло навколо мовця чи обраної точки.
const EACH_WITHIN = /кожн\p{L}*\s+(?:істот\p{L}*|ціл\p{L}*)\s+(?:у|в)\s+межах\s+(\d+)\s*(?:фут|фт)/giu;
const SAVE_ABILITY = /(?:рятівн\p{L}*\s+кидок|ряткидок)\s+(\p{L}+)/giu;
const SAVE_DC = /(?:СК|СЛ|DC)\s*(\d+)/gu;
const DAMAGE_PHRASE = /^[^.:;(]{0,40}?у?шкод\p{L}*(?:\s+\p{L}+)?/iu;
/// Шкода «на початку ходу» — це не шкода від провалу, а ефект, що триває.
const DELAYED_DAMAGE = /^[^.]{0,60}на початку/iu;
const SAVE_WITH_DC = /(?:рятівн\p{L}*\s+кидок|ряткидок)\s+(\p{L}+)[^.]{0,20}?(?:СК|СЛ|DC)\s*(\d+)(?!\s*(?:\+|плюс|\d))/giu;
/// «Провал: ціль отримує стан…», «При провалі ціль…» — ефект у реченні після ряткидка.
const FAILURE_SENTENCE = /^\s*(?:(?:перш\p{L}*|при|за|у разі|в разі)\s+)?провал/iu;
const FAILURE_WORDS = /інакше|провал/iu;
const SUCCESS_CLAUSE = /(?:при|за|у разі|в разі)\s+успіху|успіх:/iu;
/// Ряткидок самої істоти («він повинен пройти…») не стосується цілі — кнопки для нього немає.
const TARGET_WORDS = /ціл[ьіяює](?!\p{L})|ціллю|істот|ворог|нежит|гуманоїд|звір/iu;
/// «Невидимим» у тексті стає сама істота, а не ціль, що провалила ряткидок.
const CONDITION_STEMS = (Object.entries(TOKEN_CONDITION_LABELS) as Array<[RuleConditionKey, string]>).filter(([key]) => key !== "invisible").map(([key, label]) => [key, findConditionStem(label)] as const)
  .concat([["prone", "з ніг"], ["prone", "ниць"], ["prone", "навзнак"]] as const);
const HALF_ON_SAVE = /вдвічі мен|половин\p{L}*\s+(?:цього|цієї|цих|в разі успіху)|(?:успіх:\s*(?:лише\s+)?|лише\s+)половин|(?:при|за|у разі|в разі)\s+успіху[^.]{0,40}?половин/iu;

export function findCreatureAreaAction(text: string): CreatureAreaAction | null {
  const action = findCreatureSaveAction(text);
  if (!action?.area) return null;
  const { area, ...save } = action;
  return { ...area, ...save };
}

/// Без слів про область — ряткидок однієї цілі; кілька різних областей — нерозпізнано.
export function findCreatureSaveAction(text: string): CreatureSaveAction | null {
  const damageSpot = findOnlyDamageSpot(text);
  if (!damageSpot) return null;
  const beforeDamage = text.slice(0, damageSpot.start);
  const areas = findAreas(beforeDamage);
  const area = findSingle(areas);
  const ability = findSingle(findSaveAbilities(beforeDamage));
  const dc = findSingle([...beforeDamage.matchAll(SAVE_DC)].map((match) => Number(match[1])));
  const afterDamage = text.slice(damageSpot.end);
  const damageType = findDamageTypeIn(afterDamage.match(DAMAGE_PHRASE)?.[0] ?? "");
  if ((areas.length > 0 && !area) || !ability || !dc || !damageType || DELAYED_DAMAGE.test(afterDamage)) return null;
  const { count, sides, bonus } = damageSpot.roll;
  const condition = findFailedSaveCondition(afterDamage);
  return { ability, dc, damage: { count, sides, bonus }, damageType, isHalfOnSave: HALF_ON_SAVE.test(text), ...(area ? { area } : {}), ...(condition ? { condition } : {}) };
}

/// Шкода до ряткидка (атака, промінь) — окремий кидок; шкода після нього — нерозпізнаний ряткидок зі шкодою.
export function findCreatureSaveEffect(text: string): CreatureSaveEffect | null {
  if (!TARGET_WORDS.test(text) || findCreatureSaveAction(text)) return null;
  const spots = findCreatureSaveSpots(text);
  const save = findSingle(spots.map(({ roll }) => roll));
  if (!save || hasDamageAfter(text, spots[0].start)) return null;
  const areas = findAreas(text.slice(0, spots[0].start));
  const area = findSingle(areas);
  if (areas.length > 0 && !area) return null;
  return { ability: save.ability, dc: save.dc, condition: findFailedSaveCondition(text.slice(spots[0].end)), ...(area ? { area } : {}) };
}

export function findCreatureSaveSpots(text: string): Array<CreatureRollSpot & { roll: { kind: "save"; ability: AbilityKey; dc: number } }> {
  return [...text.matchAll(SAVE_WITH_DC)].flatMap((match) => {
    const ability = findAbilityByWord(match[1]);
    return ability ? [{ start: match.index, end: match.index + match[0].length, roll: { kind: "save" as const, ability, dc: Number(match[2]) } }] : [];
  });
}

function hasDamageAfter(text: string, start: number): boolean {
  return findCreatureRolls(text.slice(start)).some((spot) => spot.roll.kind === "damage");
}

function findFailedSaveCondition(afterSave: string): RuleConditionKey | null {
  const [first, second = ""] = afterSave.replace(/фт\./gu, "фт").split(/[.;]/u);
  const sentence = FAILURE_SENTENCE.test(second) && !FAILURE_WORDS.test(first) ? second : first;
  const clause = normalizeApostrophes(sentence.split(SUCCESS_CLAUSE)[0].toLocaleLowerCase("uk"));
  const found = new Set(CONDITION_STEMS.filter(([, stem]) => clause.includes(stem)).map(([key]) => key));
  return found.size === 1 ? [...found][0] : null;
}

function findSingle<T>(items: readonly T[]): T | null {
  const [first] = items;
  const isSame = items.every((item) => JSON.stringify(item) === JSON.stringify(first));
  return items.length > 0 && isSame ? first : null;
}

function findAreas(text: string): Area[] {
  const sizeFirst = [...text.matchAll(SIZE_BEFORE_SHAPE)].map((match) => buildArea(match[2], match[1]));
  const shapeFirst = [...text.matchAll(SIZE_AFTER_SHAPE)].map((match) => buildArea(match[1], match[2]));
  const around = [...text.matchAll(EACH_WITHIN)].map((match): Area => ({ shape: "circle", sizeFeet: Number(match[1]) }));
  return [...sizeFirst, ...shapeFirst, ...around];
}

function buildArea(shapeWord: string, feet: string): Area {
  const stem = SHAPE_BY_STEM.find(([prefix]) => shapeWord.toLocaleLowerCase("uk").startsWith(prefix));
  return { shape: stem?.[1] ?? "circle", sizeFeet: Number(feet) };
}

function findSaveAbilities(text: string): Array<AbilityKey | null> {
  return [...text.matchAll(SAVE_ABILITY)].map((match) => findAbilityByWord(match[1]));
}

function findAbilityByWord(word: string): AbilityKey | null {
  const lowered = word.toLocaleLowerCase("uk");
  return ABILITY_BY_STEM.find(([stem]) => lowered.startsWith(stem))?.[1] ?? null;
}

function findOnlyDamageSpot(text: string) {
  const spots = findCreatureRolls(text).flatMap((spot) => (spot.roll.kind === "damage" ? [{ start: spot.start, end: spot.end, roll: spot.roll }] : []));
  return spots.length === 1 ? spots[0] : null;
}
