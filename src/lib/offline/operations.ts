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

export type OfflineOperation =
  | (OfflineOperationBase & { kind: "details"; patch: OfflineDetailsPatch })
  | (OfflineOperationBase & { kind: "hp"; mode: "damage" | "heal" | "temp"; amount: number })
  | (OfflineOperationBase & { kind: "death-saves"; successes: number; failures: number })
  | (OfflineOperationBase & { kind: "spend-spell-slot"; slotLevel: number })
  | (OfflineOperationBase & { kind: "spend-pact-slot" });

export type OfflineOperationKind = OfflineOperation["kind"];

export type OfflinePersState = OfflineDetailsPatch & {
  persId: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  isDead: boolean;
  currentSpellSlots: number[];
  currentPactSlots: number;
};

function clampInteger(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const number = typeof value === "number" ? value : Number(value);
  const integer = Number.isFinite(number) ? Math.trunc(number) : minimum;
  return Math.max(minimum, Math.min(maximum, integer));
}

function normalizeSlots(slots: unknown): number[] {
  const raw = Array.isArray(slots) ? slots : [];
  return Array.from({ length: 9 }, (_, index) => clampInteger(raw[index], 0));
}

export function applyOfflineOperation<T extends OfflinePersState>(pers: T, operation: OfflineOperation): T {
  if (operation.persId !== pers.persId) return pers;

  if (operation.kind === "details") {
    return { ...pers, ...operation.patch };
  }

  if (operation.kind === "hp") {
    const amount = clampInteger(operation.amount, 0);
    const maxHp = Math.max(1, clampInteger(pers.maxHp, 1));
    let currentHp = clampInteger(pers.currentHp, 0);
    let tempHp = clampInteger(pers.tempHp, 0);

    if (operation.mode === "damage") {
      const absorbed = Math.min(tempHp, amount);
      tempHp -= absorbed;
      currentHp = Math.max(0, currentHp - (amount - absorbed));
    } else if (operation.mode === "heal") {
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

  if (operation.kind === "death-saves") {
    const successes = clampInteger(operation.successes, 0, 3);
    const failures = clampInteger(operation.failures, 0, 3);
    if (pers.isDead) return { ...pers, deathSaveSuccesses: successes, deathSaveFailures: failures };
    if (successes >= 3) {
      return { ...pers, currentHp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false };
    }
    return {
      ...pers,
      deathSaveSuccesses: successes,
      deathSaveFailures: failures,
      isDead: failures >= 3,
    };
  }

  if (operation.kind === "spend-spell-slot") {
    const index = clampInteger(operation.slotLevel, 1, 9) - 1;
    const currentSpellSlots = normalizeSlots(pers.currentSpellSlots);
    currentSpellSlots[index] = Math.max(0, currentSpellSlots[index] - 1);
    return { ...pers, currentSpellSlots };
  }

  return { ...pers, currentPactSlots: Math.max(0, clampInteger(pers.currentPactSlots, 0) - 1) };
}

export function applyQueuedOperations<T extends OfflinePersState>(
  pers: T,
  operations: OfflineOperation[],
): T {
  return operations.reduce<T>(applyOfflineOperation, pers);
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
      return Number.isInteger(operation.slotLevel);
    case "spend-pact-slot":
      return true;
    default:
      return false;
  }
}
