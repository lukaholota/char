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
