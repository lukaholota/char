import { pickD20Value, type D20Mode } from "./dice-roll";

export const GAME_ROLL_VISIBILITIES = ["PUBLIC", "GM", "SELF", "SECRET"] as const;
export type GameRollVisibility = (typeof GAME_ROLL_VISIBILITIES)[number];

export const GAME_ROLL_SOURCES = ["CHARACTER", "FREE"] as const;
export type GameRollSource = (typeof GAME_ROLL_SOURCES)[number] | "CREATURE";

export type GameRollDiceGroup = { sides: number; values: number[] };
export type GameRollExtraDie = { sides: number; sign: 1 | -1; label: string; value: number };

export type GameRoll = {
  d20Mode: D20Mode | null;
  modeSources: string[];
  groups: GameRollDiceGroup[];
  extra: GameRollExtraDie[];
  bonus: number;
  total: number;
  check: { dc: number; isSuccess: boolean } | null;
};

export const GAME_ROLL_LIMITS = { dice: 50, extraDice: 6, label: 120, textItem: 60, modeSources: 6, sides: [2, 3, 4, 6, 8, 10, 12, 20, 100], bonus: 1000 } as const;

export function computeGameRollTotal(roll: Pick<GameRoll, "d20Mode" | "groups" | "extra" | "bonus">): number {
  const mainValues = roll.groups.flatMap((group) => group.values);
  const base = roll.d20Mode ? pickD20Value(mainValues, roll.d20Mode) : mainValues.reduce((sum, value) => sum + value, 0);
  const extraTotal = roll.extra.reduce((sum, die) => sum + die.sign * die.value, 0);
  const rawTotal = base + extraTotal + roll.bonus;
  return !roll.d20Mode && extraTotal < 0 ? Math.max(1, rawTotal) : rawTotal;
}

export function findNaturalD20(roll: Pick<GameRoll, "d20Mode" | "groups">): "NAT_20" | "NAT_1" | null {
  if (!roll.d20Mode) return null;
  const kept = pickD20Value(roll.groups.flatMap((group) => group.values), roll.d20Mode);
  if (kept === 20) return "NAT_20";
  if (kept === 1) return "NAT_1";
  return null;
}

export function canSeeGameRoll(visibility: GameRollVisibility, viewer: { isAuthor: boolean; isGm: boolean }): boolean {
  if (viewer.isAuthor || visibility === "PUBLIC") return true;
  return (visibility === "GM" || visibility === "SECRET") && viewer.isGm;
}

export function canSeeGameRollValues(visibility: GameRollVisibility, viewer: { isGm: boolean }): boolean {
  return visibility !== "SECRET" || viewer.isGm;
}

export function buildSecretRollLabel(roll: Pick<GameRoll, "groups">): string {
  return `Секретний кидок · ${roll.groups.map((group) => `${group.values.length}к${group.sides}`).join(" + ")}`;
}

export function isGameRollVisibility(value: unknown): value is GameRollVisibility {
  return GAME_ROLL_VISIBILITIES.includes(value as GameRollVisibility);
}

/// Кубики кидає клієнт (dice-box не вміє наперед задані грані), тож сервер перевіряє форму й суму, а не чесність.
export function findGameRollProblem(roll: unknown): string | null {
  if (!isRecord(roll)) return "roll is not an object";
  const shapeProblem = findShapeProblem(roll);
  if (shapeProblem) return shapeProblem;
  const typed = roll as GameRoll;
  if (typed.d20Mode && !isD20Group(typed)) return "d20 mode needs one d20 group with 1–2 dice";
  if (computeGameRollTotal(typed) !== typed.total) return "total does not match dice";
  if (typed.check && typed.check.isSuccess !== typed.total >= typed.check.dc) return "check result does not match total";
  return null;
}

function findShapeProblem(roll: Record<string, unknown>): string | null {
  if (roll.d20Mode !== null && !["NORMAL", "ADVANTAGE", "DISADVANTAGE"].includes(roll.d20Mode as string)) return "bad d20 mode";
  if (!isTextList(roll.modeSources, GAME_ROLL_LIMITS.modeSources)) return "bad mode sources";
  if (!Array.isArray(roll.groups) || !roll.groups.length || !roll.groups.every(isDiceGroup)) return "bad dice groups";
  if (!Array.isArray(roll.extra) || roll.extra.length > GAME_ROLL_LIMITS.extraDice || !roll.extra.every(isExtraDie)) return "bad extra dice";
  const diceCount = (roll.groups as GameRollDiceGroup[]).reduce((sum, group) => sum + group.values.length, 0) + roll.extra.length;
  if (diceCount > GAME_ROLL_LIMITS.dice) return "too many dice";
  if (!isWholeNumber(roll.bonus) || Math.abs(roll.bonus) > GAME_ROLL_LIMITS.bonus) return "bad bonus";
  if (!isWholeNumber(roll.total)) return "bad total";
  if (roll.check !== null && !isCheck(roll.check)) return "bad check";
  return null;
}

function isD20Group(roll: GameRoll): boolean {
  const [group, ...rest] = roll.groups;
  const expectedCount = roll.d20Mode === "NORMAL" ? 1 : 2;
  return !rest.length && group.sides === 20 && group.values.length === expectedCount;
}

function isDiceGroup(value: unknown): value is GameRollDiceGroup {
  if (!isRecord(value) || !isAllowedSides(value.sides) || !Array.isArray(value.values) || !value.values.length) return false;
  const sides = value.sides;
  return value.values.every((face) => isWholeNumber(face) && face >= 1 && face <= sides);
}

function isExtraDie(value: unknown): value is GameRollExtraDie {
  if (!isRecord(value) || !isAllowedSides(value.sides) || (value.sign !== 1 && value.sign !== -1)) return false;
  if (typeof value.label !== "string" || value.label.length > GAME_ROLL_LIMITS.textItem) return false;
  return isWholeNumber(value.value) && value.value >= 1 && value.value <= value.sides;
}

function isCheck(value: unknown): boolean {
  return isRecord(value) && isWholeNumber(value.dc) && typeof value.isSuccess === "boolean";
}

function isTextList(value: unknown, maxItems: number): boolean {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => typeof item === "string" && item.length <= GAME_ROLL_LIMITS.textItem);
}

function isAllowedSides(value: unknown): value is number {
  return (GAME_ROLL_LIMITS.sides as readonly unknown[]).includes(value);
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
