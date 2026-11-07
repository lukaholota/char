import { findCreatureRolls } from "./creature-rolls";
import { findDamageTypeIn, type DamageType } from "./creature-save";
import type { AreaShape } from "./game-areas";
import type { AbilityKey } from "./types";

export type CreatureSaveAction = {
  ability: AbilityKey;
  dc: number;
  damage: { count: number; sides: number; bonus: number };
  damageType: DamageType;
  isHalfOnSave: boolean;
  area?: Area;
};

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
  return { ability, dc, damage: { count, sides, bonus }, damageType, isHalfOnSave: HALF_ON_SAVE.test(text), ...(area ? { area } : {}) };
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
  return [...text.matchAll(SAVE_ABILITY)].map((match) => {
    const word = match[1].toLocaleLowerCase("uk");
    return ABILITY_BY_STEM.find(([stem]) => word.startsWith(stem))?.[1] ?? null;
  });
}

function findOnlyDamageSpot(text: string) {
  const spots = findCreatureRolls(text).flatMap((spot) => (spot.roll.kind === "damage" ? [{ start: spot.start, end: spot.end, roll: spot.roll }] : []));
  return spots.length === 1 ? spots[0] : null;
}
