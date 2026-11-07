import { clampExhaustionLevel, MAX_EXHAUSTION_LEVEL } from "@/rules/exhaustion";

/// Назви — ратифіковані значення `DND_DICTIONARY.conditions` зі словника; тест звіряє їх із ним.
export const TOKEN_CONDITION_LABELS = {
  blinded: "Засліплений",
  charmed: "Причарований",
  deafened: "Оглухлий",
  frightened: "Наляканий",
  grappled: "Схоплений",
  incapacitated: "Недієздатний",
  invisible: "Невидимий",
  paralyzed: "Паралізований",
  petrified: "Окамʼянілий",
  poisoned: "Отруєний",
  prone: "Повалений",
  restrained: "Скований",
  stunned: "Приголомшений",
  unconscious: "Непритомний",
} as const;

/// Не стан з правил, а позначка заклинання на токені: «Благословення» дає +к4 до атак і ряткидків.
export const TOKEN_SPELL_MARK_LABELS = { blessed: "Благословенний" } as const;
export const BLESSED_MARK = "blessed";
export const BLESSED_DIE = { sides: 4, sign: 1 } as const;

export type TokenConditionKey = keyof typeof TOKEN_CONDITION_LABELS | keyof typeof TOKEN_SPELL_MARK_LABELS;
const TOKEN_MARK_LABELS: Record<TokenConditionKey, string> = { ...TOKEN_CONDITION_LABELS, ...TOKEN_SPELL_MARK_LABELS };
export const TOKEN_CONDITION_KEYS = Object.keys(TOKEN_MARK_LABELS) as TokenConditionKey[];
export const EXHAUSTION_LABEL = "Виснажений";

const TOKEN_CONDITION_SHORT_LABELS: Record<TokenConditionKey, string> = {
  blinded: "Зс",
  charmed: "Пч",
  deafened: "Ог",
  frightened: "На",
  grappled: "Сх",
  incapacitated: "Нд",
  invisible: "Нв",
  paralyzed: "Пр",
  petrified: "Ок",
  poisoned: "От",
  prone: "По",
  restrained: "Ск",
  stunned: "Пг",
  unconscious: "Нп",
  blessed: "Бл",
};

export type TokenConditions = { conditions: TokenConditionKey[]; exhaustionLevel: number };
export type TokenConditionChange = { kind: "toggle"; condition: TokenConditionKey; isActive: boolean } | { kind: "exhaustion"; level: number };
export type TokenConditionMark = { key: string; label: string; shortLabel: string };

export const NO_TOKEN_CONDITIONS: TokenConditions = { conditions: [], exhaustionLevel: 0 };

export function isTokenConditionKey(value: unknown): value is TokenConditionKey {
  return typeof value === "string" && Object.hasOwn(TOKEN_MARK_LABELS, value);
}

export function findTokenConditionLabel(key: TokenConditionKey): string {
  return TOKEN_MARK_LABELS[key];
}

export function parseTokenConditionChange(raw: unknown): TokenConditionChange | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { kind, condition, isActive, level } = raw as Record<string, unknown>;
  if (kind === "toggle" && isTokenConditionKey(condition) && typeof isActive === "boolean") return { kind, condition, isActive };
  if (kind === "exhaustion" && Number.isInteger(level) && (level as number) >= 0 && (level as number) <= MAX_EXHAUSTION_LEVEL) return { kind, level: level as number };
  return null;
}

/// Рядки з бази можуть мати застарілі ключі: невідомі відкидаються, порядок завжди однаковий.
export function normalizeTokenConditions(stored: { conditions: string[]; exhaustionLevel: number }): TokenConditions {
  return {
    conditions: TOKEN_CONDITION_KEYS.filter((key) => stored.conditions.includes(key)),
    exhaustionLevel: clampExhaustionLevel(stored.exhaustionLevel),
  };
}

/// Те саме, що робить SQL на сервері, — щоб тап показувався одразу, до відповіді.
export function applyTokenConditionChange(current: TokenConditions, change: TokenConditionChange): TokenConditions {
  if (change.kind === "exhaustion") return { ...current, exhaustionLevel: change.level };
  const others = current.conditions.filter((key) => key !== change.condition);
  return normalizeTokenConditions({ conditions: change.isActive ? [...others, change.condition] : others, exhaustionLevel: current.exhaustionLevel });
}

export function buildExhaustionLabel(level: number): string {
  return `${EXHAUSTION_LABEL} ${level}`;
}

export function buildTokenConditionMarks({ conditions, exhaustionLevel }: TokenConditions): TokenConditionMark[] {
  const marks: TokenConditionMark[] = conditions.map((key) => ({ key, label: TOKEN_MARK_LABELS[key], shortLabel: TOKEN_CONDITION_SHORT_LABELS[key] }));
  if (exhaustionLevel > 0) marks.push({ key: "exhaustion", label: buildExhaustionLabel(exhaustionLevel), shortLabel: `Ви${exhaustionLevel}` });
  return marks;
}

/// Токен малий: показуємо не більше двох позначок, решту — числом «+N».
export function splitTokenConditionMarks(marks: TokenConditionMark[], maxShown = 2): { shown: TokenConditionMark[]; hiddenCount: number } {
  return { shown: marks.slice(0, maxShown), hiddenCount: Math.max(0, marks.length - maxShown) };
}

export function canChangeTokenConditions(actor: { userId: number; isGm: boolean }, hero: { userId: number } | null): boolean {
  return actor.isGm || (hero !== null && hero.userId === actor.userId);
}
