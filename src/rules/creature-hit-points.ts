import { parseCreatureHitPoints } from "@/rules/wildshape";

export const CREATURE_HIT_POINT_LIMIT = 9999;
const MAX_HIT_DICE = 200;
const HIT_FORMULA = /\((\d+)[кkd](\d+)(?:\s*([+−–-])?\s*(\d+))?\s*\)/iu;

/// temp — тимчасові хіти: шкода знімає їх першими, лікування їх не дає.
export type CreatureHitPoints = { current: number; max: number; temp?: number };
export type HitPointChange = { kind: "damage" | "heal" | "set_max" | "set_temp"; amount: number };

const HIT_POINT_CHANGE_KINDS: HitPointChange["kind"][] = ["damage", "heal", "set_max", "set_temp"];

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
export function findCreatureHitPoints(stored: { hpMax: number | null; hpCurrent: number | null; hpTemp?: number }, statblockHitPoints: string | undefined): CreatureHitPoints | null {
  const max = stored.hpMax ?? parseCreatureHitPoints(statblockHitPoints ?? "");
  if (max === null || max < 1) return null;
  return { current: Math.min(max, stored.hpCurrent ?? max), max, ...(stored.hpTemp ? { temp: stored.hpTemp } : {}) };
}

export function isCreatureDown(hitPoints: CreatureHitPoints | null): boolean {
  return hitPoints !== null && hitPoints.current === 0;
}

export function parseHitPointChange(raw: unknown): HitPointChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, amount } = raw as Record<string, unknown>;
  if (!HIT_POINT_CHANGE_KINDS.includes(kind as HitPointChange["kind"])) return null;
  const minimum = kind === "set_temp" ? 0 : 1;
  if (!Number.isInteger(amount) || (amount as number) < minimum || (amount as number) > CREATURE_HIT_POINT_LIMIT) return null;
  return { kind: kind as HitPointChange["kind"], amount: amount as number };
}

/// Шкода спершу знімає тимчасові хіти й не опускає нижче нуля, лікування — не вище максимуму.
export function applyHitPointChange(hitPoints: CreatureHitPoints | null, change: HitPointChange): CreatureHitPoints | null {
  if (change.kind === "set_max") return { ...hitPoints, current: Math.min(hitPoints?.current ?? change.amount, change.amount), max: change.amount };
  if (!hitPoints) return null;
  if (change.kind === "set_temp") return { ...hitPoints, temp: change.amount };
  if (change.kind === "heal") return { ...hitPoints, current: Math.min(hitPoints.max, hitPoints.current + change.amount) };
  const temp = hitPoints.temp ?? 0;
  const absorbed = Math.min(temp, change.amount);
  return { ...hitPoints, current: Math.max(0, hitPoints.current - (change.amount - absorbed)), ...(absorbed ? { temp: temp - absorbed } : {}) };
}

/// Скасування хітів: максимум, тоді поточні (тимчасові обнулено, щоб шкода не пішла в них), тоді тимчасові.
export function findHitPointChangesTo(from: CreatureHitPoints, to: CreatureHitPoints): HitPointChange[] {
  const maxChange: HitPointChange[] = from.max === to.max ? [] : [{ kind: "set_max", amount: to.max }];
  const delta = to.current - Math.min(from.current, to.max);
  const fromTemp = from.temp ?? 0;
  const toTemp = to.temp ?? fromTemp;
  const clearTemp: HitPointChange[] = delta < 0 && fromTemp > 0 ? [{ kind: "set_temp", amount: 0 }] : [];
  const currentChange: HitPointChange[] = delta === 0 ? [] : [{ kind: delta > 0 ? "heal" : "damage", amount: Math.abs(delta) }];
  const tempAfter = clearTemp.length ? 0 : fromTemp;
  const tempChange: HitPointChange[] = tempAfter === toTemp ? [] : [{ kind: "set_temp", amount: toTemp }];
  return [...maxChange, ...clearTemp, ...currentChange, ...tempChange];
}

export type HitPointEdit = { max?: number; current?: number; temp?: number; damage?: number; heal?: number };

/// Правка з панелі: спершу нові числа, потім шкода й лікування поверх них.
export function findHitPointChangesFromEdit(from: CreatureHitPoints | null, edit: HitPointEdit): HitPointChange[] {
  if (!from) return edit.max ? [{ kind: "set_max", amount: edit.max }] : [];
  const max = edit.max ?? from.max;
  const target = findHitPointChangesTo(from, { max, current: Math.min(max, edit.current ?? from.current), temp: edit.temp ?? from.temp });
  const damage: HitPointChange[] = edit.damage ? [{ kind: "damage", amount: edit.damage }] : [];
  const heal: HitPointChange[] = edit.heal ? [{ kind: "heal", amount: edit.heal }] : [];
  return [...target, ...damage, ...heal];
}

export type HitPointBarTone = "healthy" | "hurt" | "critical";

export function findHitPointBarTone({ current, max }: CreatureHitPoints): HitPointBarTone {
  if (current * 2 > max) return "healthy";
  return current * 4 > max ? "hurt" : "critical";
}
