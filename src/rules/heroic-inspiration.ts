/**
 * Героїчне натхнення 2024 (KR31.3, знахідки `L12-secondary-flows-10`, `L10-sheet-config-09`,
 * `L19-parity-competitors-04`).
 *
 * Це **стан**, а не ресурс із максимумом: «You can never have more than one instance of Heroic
 * Inspiration» (`data/2024/srd/playing-the-game.md`). Тому в персонажа одна булева колонка
 * `pers.has_heroic_inspiration`, а не лічильник, не пул і не `usesCountSpecial` — та колонка
 * перемикає суддю пулу (BUG-011), і натхнення туди класти не можна.
 *
 * Дає натхнення здебільшого майстер, тож гравець вмикає й витрачає його з листа руками. Правила
 * нижче покривають лише те, що застосунок може вивести сам: довгий відпочинок носія риси й
 * підказки приміщень бастіону.
 */

/**
 * Фічі, що дають натхнення після довгого відпочинку. Одна форма речення в корпусі —
 * «You gain Heroic Inspiration whenever you finish a Long Rest» — і один носій, Людина 2024
 * (`data/2024/srd/character-origins.md`). Гейт `tests/content/heroic-inspiration-2024.test.ts`
 * звіряє реєстр із корпусом: другий носій цього речення зробить його червоним, а не мовчки
 * лишиться без натхнення.
 */
const FEATURES_GRANTING_HEROIC_INSPIRATION_ON_LONG_REST = new Set(["Human: Resourceful (2024)"]);

export function grantsHeroicInspirationOnLongRest(engName: string | null | undefined): boolean {
  return engName != null && FEATURES_GRANTING_HEROIC_INSPIRATION_ON_LONG_REST.has(engName);
}

export function listFeaturesGrantingHeroicInspirationOnLongRest(): string[] {
  return [...FEATURES_GRANTING_HEROIC_INSPIRATION_ON_LONG_REST];
}

export type LongRestHeroicInspiration = {
  hasHeroicInspiration: boolean;
  featureEngNames: readonly (string | null | undefined)[];
};

/// Відпочинок натхнення не забирає: книга не знає терміну дії, а «друге» натхнення в того, хто
/// вже має, просто губиться — булеве значення це й виражає.
export function findHeroicInspirationAfterLongRest({ hasHeroicInspiration, featureEngNames }: LongRestHeroicInspiration): boolean {
  return hasHeroicInspiration || featureEngNames.some(grantsHeroicInspirationOnLongRest);
}

/**
 * Приміщення бастіону, що дають натхнення (DMG 2024, `data/2024/normalized/bastion-facilities.json`).
 * Бастіон — трекер, а не рушій ([Р26](../../docs/DECISIONS.md#р26)): підказка на картці
 * приміщення, а не автоматична видача. Той самий гейт звіряє перелік слагів із каталогом.
 */
const BASTION_FACILITY_HEROIC_INSPIRATION_HINTS: Record<string, string> = {
  "lords-alliance-noble-residence": "Дає Героїчне натхнення після довгого відпочинку в цьому приміщенні.",
  "seance-parlor":
    "Наказ «Дослідження» (ворожіння) дає Героїчне натхнення — не частіше, ніж раз на довгий відпочинок.",
  workshop:
    "Дає Героїчне натхнення після повного короткого відпочинку в цьому приміщенні — не частіше, ніж раз на довгий відпочинок.",
};

export function findHeroicInspirationHintForFacility(slug: string): string | null {
  return BASTION_FACILITY_HEROIC_INSPIRATION_HINTS[slug] ?? null;
}

export function listBastionFacilitiesGrantingHeroicInspiration(): string[] {
  return Object.keys(BASTION_FACILITY_HEROIC_INSPIRATION_HINTS);
}
