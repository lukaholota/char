/**
 * Натхнення (2014 «Inspiration», 2024 «Heroic Inspiration»; KR31.3).
 *
 * Книги обох редакцій кажуть «або є, або немає»: «You can never have more than one instance of
 * Heroic Inspiration» (`data/2024/srd/playing-the-game.md`). Білдер навмисно гнучкий (рішення
 * власника 2026-09-13): персонаж зберігає лічильник `pers.heroic_inspiration_count`, а
 * `pers.can_stack_heroic_inspiration` вирішує, чи лічильник тримається в 0..1, як у книзі, чи росте.
 * У пул ресурсів (`usesCountSpecial`) натхнення не кладеться — та колонка перемикає суддю пулу
 * (BUG-011).
 *
 * Дає натхнення здебільшого майстер, тож гравець додає й витрачає його з листа руками. Правила
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

export type HeroicInspiration = {
  heroicInspirationCount: number;
  canStackHeroicInspiration: boolean;
};

export function limitHeroicInspirationCount({ heroicInspirationCount, canStackHeroicInspiration }: HeroicInspiration): number {
  const count = Number.isFinite(heroicInspirationCount) ? Math.max(0, Math.trunc(heroicInspirationCount)) : 0;
  return canStackHeroicInspiration ? count : Math.min(1, count);
}

export type LongRestHeroicInspiration = HeroicInspiration & {
  featureEngNames: readonly (string | null | undefined)[];
};

/// Відпочинок натхнення не забирає: книга не знає терміну дії. Без стакання «друге» натхнення в
/// того, хто вже має, губиться; зі стаканням — додається.
export function findHeroicInspirationCountAfterLongRest({
  featureEngNames,
  ...inspiration
}: LongRestHeroicInspiration): number {
  const gained = featureEngNames.some(grantsHeroicInspirationOnLongRest) ? 1 : 0;
  return limitHeroicInspirationCount({ ...inspiration, heroicInspirationCount: inspiration.heroicInspirationCount + gained });
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
