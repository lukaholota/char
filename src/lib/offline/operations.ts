import { limitHeroicInspirationCount } from "@/rules/heroic-inspiration";
import { applyChargesStep, type MagicItemCharges } from "@/rules/magic-item-charges";

export const OFFLINE_DETAIL_FIELDS = [
  "customProficiencies",
  "customLanguagesKnown",
  "customEquipment",
  "personalityTraits",
  "ideals",
  "bonds",
  "flaws",
  "backstory",
  "notes",
  "alignment",
  "xp",
  "cp",
  "ep",
  "sp",
  "gp",
  "pp",
] as const;

export type OfflineDetailField = (typeof OFFLINE_DETAIL_FIELDS)[number];
export type OfflineDetailsPatch = {
  customProficiencies?: string;
  customLanguagesKnown?: string;
  customEquipment?: string;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  notes?: string;
  alignment?: string;
  xp?: number;
  cp?: string;
  ep?: string;
  sp?: string;
  gp?: string;
  pp?: string;
};

const COIN_FIELDS: readonly OfflineDetailField[] = ["cp", "ep", "sp", "gp", "pp"];

export function normalizePersDetails(patch: OfflineDetailsPatch): OfflineDetailsPatch {
  const normalized: OfflineDetailsPatch = {};

  for (const field of OFFLINE_DETAIL_FIELDS) {
    const value = patch[field];
    if (value === undefined) continue;

    if (field === "xp") normalized.xp = Math.max(0, Math.trunc(Number(value) || 0));
    else if (COIN_FIELDS.includes(field)) normalized[field] = String(Math.max(0, parseInt(String(value)) || 0));
    else if (field === "alignment") normalized.alignment = String(value).slice(0, 100);
    else normalized[field] = String(value);
  }

  return normalized;
}

type OfflineOperationBase = {
  operationId: string;
  persId: number;
  createdAt: string;
};

export type FeatureUseDirection = "spend" | "restore";

export type OfflineOperation =
  | (OfflineOperationBase & { kind: "details"; patch: OfflineDetailsPatch })
  | (OfflineOperationBase & { kind: "hp"; mode: "damage" | "heal" | "temp"; amount: number })
  | (OfflineOperationBase & { kind: "death-saves"; successes: number; failures: number })
  | (OfflineOperationBase & { kind: "spend-spell-slot"; slotLevel: number })
  | (OfflineOperationBase & { kind: "restore-spell-slot"; slotLevel: number })
  | (OfflineOperationBase & { kind: "spend-pact-slot" })
  | (OfflineOperationBase & { kind: "restore-pact-slot" })
  | (OfflineOperationBase & { kind: "heroic-inspiration"; heroicInspirationCount: number })
  | (OfflineOperationBase & { kind: "hit-dice"; remainingByClass: Record<string, number> })
  | (OfflineOperationBase & { kind: "feature-use"; featureId: number; direction: FeatureUseDirection })
  | (OfflineOperationBase & { kind: "feature-state"; featureId: number; isActive: boolean })
  | (OfflineOperationBase & { kind: "concentration"; spellId: number | null })
  | (OfflineOperationBase & { kind: "spell-buff"; effectKey: string; isActive: boolean; spellId: number | null; endsWithConcentration: boolean })
  | (OfflineOperationBase & { kind: "exhaustion"; level: number })
  | (OfflineOperationBase & { kind: "magic-item-charges"; persMagicItemId: number; step: number })
  | (OfflineOperationBase & { kind: "spell-prepared"; spellId: number; isPrepared: boolean })
  | (OfflineOperationBase & { kind: "short-rest"; hitDiceSpent: OfflineHitDiceSpend[]; restoredHitPoints: number })
  | (OfflineOperationBase & { kind: "long-rest" });

/// Кидок кубиків здоровʼя робить клієнт і кладе суму в операцію: сервер при відтворенні не кидає
/// вдруге, тож хіти в базі дорівнюють тим, що гравець уже бачив на листі.
export type OfflineHitDiceSpend = { classId: number; count: number };

export type OfflineOperationKind = OfflineOperation["kind"];

/// Поля листа, яких вистачає, щоб порахувати результат операції над `pers`. Стелі комірок —
/// теж вхід, а не обчислення: клієнт бере їх зі своєї таблиці прогресії, сервер — із графа класів.
export type OfflinePersState = OfflineDetailsPatch & {
  persId: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  isDead: boolean;
  currentSpellSlots: number[];
  maxSpellSlots: number[];
  currentPactSlots: number;
  maxPactSlots: number;
  heroicInspirationCount: number;
  canStackHeroicInspiration: boolean;
  currentHitDice?: unknown;
};

function clampInteger(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const number = typeof value === "number" ? value : Number(value);
  const integer = Number.isFinite(number) ? Math.trunc(number) : minimum;
  return Math.max(minimum, Math.min(maximum, integer));
}

export function normalizeSlots(slots: unknown): number[] {
  const raw = Array.isArray(slots) ? slots : [];
  return Array.from({ length: 9 }, (_, index) => clampInteger(raw[index], 0));
}

export function applyOfflineOperation<T extends OfflinePersState>(pers: T, operation: OfflineOperation): T {
  if (operation.persId !== pers.persId) return pers;

  switch (operation.kind) {
    case "details":
      return { ...pers, ...operation.patch };
    case "hp":
      return applyHpChange(pers, operation.mode, operation.amount);
    case "death-saves":
      return applyDeathSaves(pers, operation.successes, operation.failures);
    case "spend-spell-slot":
      return { ...pers, currentSpellSlots: stepSlot(pers.currentSpellSlots, operation.slotLevel, -1, pers.maxSpellSlots) };
    case "restore-spell-slot":
      return { ...pers, currentSpellSlots: stepSlot(pers.currentSpellSlots, operation.slotLevel, +1, pers.maxSpellSlots) };
    case "spend-pact-slot":
      return { ...pers, currentPactSlots: Math.max(0, clampInteger(pers.currentPactSlots, 0) - 1) };
    case "restore-pact-slot":
      return {
        ...pers,
        currentPactSlots: restoreOne(clampInteger(pers.currentPactSlots, 0), clampInteger(pers.maxPactSlots, 0)),
      };
    case "heroic-inspiration":
      return {
        ...pers,
        heroicInspirationCount: limitHeroicInspirationCount({
          heroicInspirationCount: operation.heroicInspirationCount,
          canStackHeroicInspiration: pers.canStackHeroicInspiration,
        }),
      };
    case "hit-dice":
      return { ...pers, currentHitDice: normalizeHitDice(operation.remainingByClass) };
    case "feature-use":
    case "feature-state":
    case "concentration":
    case "spell-buff":
    case "exhaustion":
    case "magic-item-charges":
    case "spell-prepared":
    case "short-rest":
    case "long-rest":
      return pers;
  }
}

function applyHpChange<T extends OfflinePersState>(pers: T, mode: "damage" | "heal" | "temp", rawAmount: number): T {
  const amount = clampInteger(rawAmount, 0);
  const maxHp = Math.max(1, clampInteger(pers.maxHp, 1));
  let currentHp = clampInteger(pers.currentHp, 0);
  let tempHp = clampInteger(pers.tempHp, 0);

  if (mode === "damage") {
    const absorbed = Math.min(tempHp, amount);
    tempHp -= absorbed;
    currentHp = Math.max(0, currentHp - (amount - absorbed));
  } else if (mode === "heal") {
    currentHp = Math.min(maxHp, currentHp + amount);
  } else {
    tempHp = Math.max(tempHp, amount);
  }

  return {
    ...pers,
    currentHp,
    tempHp,
    ...(currentHp > 0 ? { deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false } : {}),
  };
}

function applyDeathSaves<T extends OfflinePersState>(pers: T, rawSuccesses: number, rawFailures: number): T {
  const successes = clampInteger(rawSuccesses, 0, 3);
  const failures = clampInteger(rawFailures, 0, 3);
  if (pers.isDead) return { ...pers, deathSaveSuccesses: successes, deathSaveFailures: failures };
  if (successes >= 3) {
    return { ...pers, currentHp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false };
  }
  return { ...pers, deathSaveSuccesses: successes, deathSaveFailures: failures, isDead: failures >= 3 };
}

function stepSlot(current: unknown, slotLevel: number, delta: 1 | -1, maximum: unknown): number[] {
  const index = clampInteger(slotLevel, 1, 9) - 1;
  const slots = normalizeSlots(current);
  slots[index] = delta < 0 ? Math.max(0, slots[index] - 1) : restoreOne(slots[index], normalizeSlots(maximum)[index]);
  return slots;
}

function restoreOne(current: number, ceiling: number): number {
  return current >= ceiling ? current : current + 1;
}

export function normalizeHitDice(remainingByClass: unknown): Record<string, number> {
  if (!remainingByClass || typeof remainingByClass !== "object" || Array.isArray(remainingByClass)) return {};
  const normalized: Record<string, number> = {};
  for (const [classId, remaining] of Object.entries(remainingByClass as Record<string, unknown>)) {
    if (!/^\d+$/.test(classId)) continue;
    normalized[classId] = clampInteger(remaining, 0);
  }
  return normalized;
}

export function applyQueuedOperations<T extends OfflinePersState>(
  pers: T,
  operations: OfflineOperation[],
): T {
  return operations.reduce<T>(applyOfflineOperation, pers);
}

export type OfflineFeatureUseItem = {
  featureId?: number;
  usesPoolKey?: string | null;
  usePrice?: number | null;
  usesRemaining?: number | null;
  usesPer?: number | null;
};

/// Ресурси рис на слайді живуть у згрупованому списку, а не в полях `pers`; пул (`usesPoolKey`)
/// ділять кілька рис, тож одна операція рухає всіх, хто в пулі.
export function applyQueuedFeatureUses<T extends OfflineFeatureUseItem>(
  items: T[],
  persId: number,
  operations: OfflineOperation[],
): T[] {
  let next = items;
  for (const operation of operations) {
    if (operation.kind !== "feature-use" || operation.persId !== persId) continue;

    const target = next.find((item) => item.featureId === operation.featureId);
    if (!target) continue;

    const affects = (item: T) =>
      target.usesPoolKey ? item.usesPoolKey === target.usesPoolKey : item.featureId === operation.featureId;
    const cost = Math.max(1, clampInteger(target.usePrice ?? 1, 1));
    const max = clampInteger(target.usesPer ?? 0, 0);
    const current = clampInteger(target.usesRemaining ?? target.usesPer ?? 0, 0);
    const remaining = stepFeatureUses(current, max, cost, operation.direction);
    if (remaining === current) continue;

    next = next.map((item) => (affects(item) ? { ...item, usesRemaining: remaining } : item));
  }
  return next;
}

export function stepFeatureUses(current: number, max: number, cost: number, direction: FeatureUseDirection): number {
  if (direction === "spend") return current < cost ? current : Math.max(0, current - cost);
  return Math.min(max, current + cost);
}

export function applyQueuedItemCharges<T extends MagicItemCharges & { persMagicItemId: number }>(
  items: T[],
  persId: number,
  operations: OfflineOperation[],
): T[] {
  return operations.reduce<T[]>((current, operation) => {
    if (operation.kind !== "magic-item-charges" || operation.persId !== persId) return current;
    return current.map((item) =>
      item.persMagicItemId === operation.persMagicItemId
        ? { ...item, ...applyChargesStep(item, clampInteger(operation.step, -999, 999)) }
        : item,
    );
  }, items);
}

export function applyQueuedSpellPreparation<T extends { spellId?: number | null; isPrepared?: boolean | null }>(
  rows: T[],
  persId: number,
  operations: OfflineOperation[],
  readSpellId: (row: T) => number | null = (row) => row.spellId ?? null,
): T[] {
  return operations.reduce<T[]>((current, operation) => {
    if (operation.kind !== "spell-prepared" || operation.persId !== persId) return current;
    return current.map((row) =>
      readSpellId(row) === operation.spellId ? { ...row, isPrepared: operation.isPrepared } : row,
    );
  }, rows);
}

export function isOfflineOperation(value: unknown): value is OfflineOperation {
  if (!value || typeof value !== "object") return false;
  const operation = value as Record<string, unknown>;
  const { operationId, persId, createdAt } = operation;
  if (typeof operationId !== "string" || operationId.length < 8 || operationId.length > 64) return false;
  if (!Number.isInteger(persId) || Number(persId) <= 0) return false;
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) return false;

  switch (operation.kind) {
    case "details":
      return Boolean(operation.patch) && typeof operation.patch === "object" && !Array.isArray(operation.patch);
    case "hp":
      return ["damage", "heal", "temp"].includes(String(operation.mode)) && Number.isFinite(operation.amount);
    case "death-saves":
      return Number.isFinite(operation.successes) && Number.isFinite(operation.failures);
    case "spend-spell-slot":
    case "restore-spell-slot":
      return Number.isInteger(operation.slotLevel);
    case "spend-pact-slot":
    case "restore-pact-slot":
      return true;
    case "heroic-inspiration":
      return Number.isInteger(operation.heroicInspirationCount);
    case "hit-dice":
      return Boolean(operation.remainingByClass) && typeof operation.remainingByClass === "object";
    case "feature-use":
      return Number.isInteger(operation.featureId) && ["spend", "restore"].includes(String(operation.direction));
    case "feature-state":
      return Number.isInteger(operation.featureId) && typeof operation.isActive === "boolean";
    case "concentration":
      return operation.spellId === null || Number.isInteger(operation.spellId);
    case "spell-buff":
      return (
        typeof operation.effectKey === "string" &&
        typeof operation.isActive === "boolean" &&
        typeof operation.endsWithConcentration === "boolean" &&
        (operation.spellId === null || Number.isInteger(operation.spellId))
      );
    case "exhaustion":
      return Number.isInteger(operation.level);
    case "magic-item-charges":
      return Number.isInteger(operation.persMagicItemId) && Number.isInteger(operation.step);
    case "spell-prepared":
      return Number.isInteger(operation.spellId) && typeof operation.isPrepared === "boolean";
    case "short-rest":
      return isHitDiceSpendList(operation.hitDiceSpent) && Number.isFinite(operation.restoredHitPoints);
    case "long-rest":
      return true;
    default:
      return false;
  }
}

function isHitDiceSpendList(value: unknown): value is OfflineHitDiceSpend[] {
  if (!Array.isArray(value) || value.length > 20) return false;
  return value.every(
    (spend) =>
      Boolean(spend) &&
      typeof spend === "object" &&
      Number.isInteger((spend as OfflineHitDiceSpend).classId) &&
      Number.isInteger((spend as OfflineHitDiceSpend).count) &&
      (spend as OfflineHitDiceSpend).count >= 0,
  );
}
