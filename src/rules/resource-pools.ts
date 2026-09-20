/**
 * Хто задає максимум спільного пулу ресурсів (BUG-011).
 *
 * `usesPoolKey` стоїть і на фічі, яка пул **дає**, і на кожній, що з нього **витрачає**:
 * `CHANNEL_DIVINITY` носять 40 фіч, `SORCERY_POINTS` — девʼять. Максимум мусить брати саме
 * та, що дає, а код брав першу-ліпшу з бази без сортування — тобто ту, яка випадково лежала
 * першою в купі. Оновлення будь-якого рядка тексту пересуває його в купі й міняє відповідь:
 * рівно так KR24.2 перемкнув Дику форму з 2 використань на 4.
 */

export type PoolProviderCandidate = {
  featureId: number;
  usesCountDependsOnProficiencyBonus?: boolean | null;
  usesCountSpecial?: unknown;
  classFeatures?: unknown[] | null;
  subclassFeatures?: unknown[] | null;
};

/**
 * Порядок переваги, виведений із даних (перевірено на всіх пʼяти пулах із кількома
 * претендентами):
 *
 * 1. **Класова фіча перед фічею підкласу.** «Дика форма» дає пул друїду, а «Дух тотема» кола
 *    Пастуха з нього витрачає; «Джерело магії» дає чаклуну очки, «Руна бурі» їх витрачає.
 * 2. **Максимум за рівнем або бонусом майстерності перед пласким числом.** Клірик 6 має два
 *    Божественні канали за таблицею рівнів, а не одне пласке з фічі, спільної з паладином.
 * 3. **Менший `featureId`** — щоб відповідь не залежала від фізичного порядку рядків.
 */
export function findPoolProvider<T extends PoolProviderCandidate>(candidates: T[]): T | null {
  const ranked = [...candidates].sort(comparePoolProviders);
  return ranked[0] ?? null;
}

function comparePoolProviders(left: PoolProviderCandidate, right: PoolProviderCandidate): number {
  return (
    Number(isClassFeature(right)) - Number(isClassFeature(left)) ||
    Number(hasScaledMaximum(right)) - Number(hasScaledMaximum(left)) ||
    left.featureId - right.featureId
  );
}

function isClassFeature(candidate: PoolProviderCandidate): boolean {
  return (candidate.classFeatures ?? []).length > 0;
}

/// Максимум, що росте з рівнем або бонусом майстерності, належить фічі, яка пул дає: фіча-витрата
/// носить пласке число власного ліміту на відпочинок.
function hasScaledMaximum(candidate: PoolProviderCandidate): boolean {
  return Boolean(candidate.usesCountDependsOnProficiencyBonus) || isFilledObject(candidate.usesCountSpecial);
}

function isFilledObject(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "object" && value !== null;
}

/**
 * Скільки використань повертає короткий відпочинок (KR31.3, знахідка `L12-secondary-flows-07`).
 *
 * Модель відпочинку вміла тільки «до максимуму», бо `limitedUsesPer` розрізняє лише те, **який**
 * відпочинок відновлює, а не **скільки**. У 2024 пʼять класових фіч повертають рівно одне
 * витрачене використання на короткому відпочинку й усі — на довгому:
 *
 * > You regain one expended use when you finish a Short Rest, and you regain all expended uses
 * > when you finish a Long Rest.
 *
 * Двоє з них — підкласові (KR31.3, підкласовий прохід): Кубики псіонічної енергії Псі-воїна й
 * Душеклинка книга повертає тим самим правилом, тільки словом «Dice» замість «uses».
 *
 * Носії лишаються `SHORT_REST`: довгий відпочинок і так зводить обидва типи до максимуму, тож
 * запит у місці виклику не міняється — міняється тільки ця гілка.
 */
const FEATURES_REGAINING_ONE_USE_ON_SHORT_REST = new Set([
  "Barbarian: Rage (2024)",
  "Cleric: Channel Divinity (2024)",
  "Druid: Wild Shape (2024)",
  "Fighter: Second Wind (2024)",
  "Paladin: Channel Divinity (2024)",
  "Psi Warrior: Psionic Power (2024)",
  "Soulknife: Psionic Power (2024)",
]);

export function regainsOneUseOnShortRest(engName: string | null | undefined): boolean {
  return engName != null && FEATURES_REGAINING_ONE_USE_ON_SHORT_REST.has(engName);
}

export function listFeaturesRegainingOneUseOnShortRest(): string[] {
  return [...FEATURES_REGAINING_ONE_USE_ON_SHORT_REST];
}

export type ShortRestRecovery = {
  engName: string | null | undefined;
  usesRemaining: number | null | undefined;
  maxUses: number;
};

export function findUsesAfterShortRest({ engName, usesRemaining, maxUses }: ShortRestRecovery): number {
  return findRegainedUsesAfterShortRest({ regainsOneUse: regainsOneUseOnShortRest(engName), usesRemaining, maxUses });
}

export type RegainedUsesAfterShortRest = {
  regainsOneUse: boolean;
  usesRemaining: number | null | undefined;
  maxUses: number;
};

/// Лист не знає англійської назви риси — він отримує готовий прапорець `regainsOneUseOnShortRest`.
export function findRegainedUsesAfterShortRest({ regainsOneUse, usesRemaining, maxUses }: RegainedUsesAfterShortRest): number {
  const max = toCount(maxUses);
  if (!regainsOneUse) return max;
  return Math.min(Math.min(toCount(usesRemaining ?? max), max) + 1, max);
}

function toCount(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

/**
 * Наскільки доростає залишок використань, коли рівень підняв максимум
 * (KR31.3, знахідка `L08-levelup-machine-08`).
 *
 * Дзеркалить `applySpellSlotMaximumDelta`: слоти вже доростають на дельту максимуму, а лічильники
 * фіч і пулів стояли на старому витраченому числі до найближчого відпочинку. Правило те саме —
 * `залишок + новий максимум − старий`, підрізане до нового максимуму.
 *
 * `null` у відповіді означає «не чіпати рядок»: або залишок і так правильний, або максимум
 * невідомий. Невідомий він не лише через порожні дані: `calculateMaxUsesForFeature` повертає
 * `null` і для **безлімітних** значень — Лють 2014 на 20-му рівні записана як
 * `{"lvl": 20, "uses": "UNLIMITED"}`, і рядок таблиці збігається, а число з нього не виймається.
 * Підрізати такий залишок до нуля означало б забрати в варвара всі люті рівно на 20-му рівні.
 */
export type UsesMaximumDelta = {
  usesRemaining: number | null | undefined;
  beforeMaximum: number | null;
  afterMaximum: number | null;
};

export function applyUsesMaximumDelta({ usesRemaining, beforeMaximum, afterMaximum }: UsesMaximumDelta): number | null {
  if (beforeMaximum == null || afterMaximum == null) return null;
  if (usesRemaining == null) return null;

  const before = toCount(beforeMaximum);
  const after = toCount(afterMaximum);
  const current = toCount(usesRemaining);
  const next = Math.max(0, Math.min(after, current + after - before));

  return next === current ? null : next;
}
