import { parseCreatureHitPoints } from "@/rules/wildshape";

export const CREATURE_HIT_POINT_LIMIT = 9999;
const MAX_HIT_DICE = 200;
const HIT_FORMULA = /\((\d+)[кkd](\d+)(?:\s*([+−–-])?\s*(\d+))?\s*\)/iu;

export type CreatureHitPoints = { current: number; max: number };
export type HitPointChange = { kind: "damage" | "heal" | "set_max"; amount: number };

const HIT_POINT_CHANGE_KINDS: HitPointChange["kind"][] = ["damage", "heal", "set_max"];

/// Хіти статблоку — «40 (9к8 + 18)»; без формули лишається перше число, без числа — null.
export function rollCreatureMaxHitPoints(statblockHitPoints: string | undefined, random: () => number = Math.random): number | null {
  const average = parseCreatureHitPoints(statblockHitPoints ?? "");
  const formula = statblockHitPoints?.match(HIT_FORMULA);
  if (!formula) return average;
  const count = Number(formula[1]);
  const sides = Number(formula[2]);
  if (count < 1 || count > MAX_HIT_DICE || sides < 2) return average;
  let total = formula[4] ? Number(formula[4]) * (formula[3] && formula[3] !== "+" ? -1 : 1) : 0;
  for (let die = 0; die < count; die += 1) total += Math.floor(random() * sides) + 1;
  return Math.min(CREATURE_HIT_POINT_LIMIT, Math.max(1, total));
}

/// Рядки без збережених хітів — старі: беруться хіти статблоку, істота ціла.
export function findCreatureHitPoints(stored: { hpMax: number | null; hpCurrent: number | null }, statblockHitPoints: string | undefined): CreatureHitPoints | null {
  const max = stored.hpMax ?? parseCreatureHitPoints(statblockHitPoints ?? "");
  if (max === null || max < 1) return null;
  return { current: Math.min(max, stored.hpCurrent ?? max), max };
}

export function isCreatureDown(hitPoints: CreatureHitPoints | null): boolean {
  return hitPoints !== null && hitPoints.current === 0;
}

export function parseHitPointChange(raw: unknown): HitPointChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, amount } = raw as Record<string, unknown>;
  if (!HIT_POINT_CHANGE_KINDS.includes(kind as HitPointChange["kind"])) return null;
  if (!Number.isInteger(amount) || (amount as number) < 1 || (amount as number) > CREATURE_HIT_POINT_LIMIT) return null;
  return { kind: kind as HitPointChange["kind"], amount: amount as number };
}

/// Шкода не опускає нижче нуля, лікування — вище максимуму; новий максимум не лишає поточних хітів над собою.
export function applyHitPointChange(hitPoints: CreatureHitPoints | null, change: HitPointChange): CreatureHitPoints | null {
  if (change.kind === "set_max") return { current: Math.min(hitPoints?.current ?? change.amount, change.amount), max: change.amount };
  if (!hitPoints) return null;
  const delta = change.kind === "damage" ? -change.amount : change.amount;
  return { current: Math.min(hitPoints.max, Math.max(0, hitPoints.current + delta)), max: hitPoints.max };
}

export type HitPointBarTone = "healthy" | "hurt" | "critical";

export function findHitPointBarTone({ current, max }: CreatureHitPoints): HitPointBarTone {
  if (current * 2 > max) return "healthy";
  return current * 4 > max ? "hurt" : "critical";
}
