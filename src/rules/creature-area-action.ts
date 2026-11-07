import { findCreatureRolls } from "./creature-rolls";
import { findDamageTypeIn, type DamageType } from "./creature-save";
import type { AreaShape } from "./game-areas";
import type { AbilityKey } from "./types";

export type CreatureAreaAction = {
  shape: AreaShape;
  sizeFeet: number;
  ability: AbilityKey;
  dc: number;
  damage: { count: number; sides: number; bonus: number };
  damageType: DamageType;
  isHalfOnSave: boolean;
};

type Area = Pick<CreatureAreaAction, "shape" | "sizeFeet">;

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
const SAVE_ABILITY = /(?:рятівн\p{L}*\s+кидок|ряткидок)\s+(\p{L}+)/giu;
const SAVE_DC = /СК\s*(\d+)/gu;
const DAMAGE_PHRASE = /^[^.:;(]{0,40}?у?шкод\p{L}*(?:\s+\p{L}+)?/iu;
/// Шкода «на початку ходу» — це не шкода від провалу, а ефект, що триває.
const DELAYED_DAMAGE = /^[^.]{0,60}на початку/iu;
const HALF_ON_SAVE = /вдвічі мен|половин\p{L}*\s+(?:цього|цієї|цих|в разі успіху)|(?:успіх:\s*(?:лише\s+)?|лише\s+)половин/iu;

export function findCreatureAreaAction(text: string): CreatureAreaAction | null {
  const damageSpot = findOnlyDamageSpot(text);
  if (!damageSpot) return null;
  const beforeDamage = text.slice(0, damageSpot.start);
  const area = findSingle(findAreas(beforeDamage));
  const ability = findSingle(findSaveAbilities(beforeDamage));
  const dc = findSingle([...beforeDamage.matchAll(SAVE_DC)].map((match) => Number(match[1])));
  const afterDamage = text.slice(damageSpot.end);
  const damageType = findDamageTypeIn(afterDamage.match(DAMAGE_PHRASE)?.[0] ?? "");
  if (!area || !ability || !dc || !damageType || DELAYED_DAMAGE.test(afterDamage)) return null;
  const { count, sides, bonus } = damageSpot.roll;
  return { ...area, ability, dc, damage: { count, sides, bonus }, damageType, isHalfOnSave: HALF_ON_SAVE.test(text) };
}

function findSingle<T>(items: readonly T[]): T | null {
  const [first] = items;
  const isSame = items.every((item) => JSON.stringify(item) === JSON.stringify(first));
  return items.length > 0 && isSame ? first : null;
}

function findAreas(text: string): Area[] {
  const sizeFirst = [...text.matchAll(SIZE_BEFORE_SHAPE)].map((match) => buildArea(match[2], match[1]));
  const shapeFirst = [...text.matchAll(SIZE_AFTER_SHAPE)].map((match) => buildArea(match[1], match[2]));
  return [...sizeFirst, ...shapeFirst];
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
