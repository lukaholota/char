/**
 * Які опціональні фічі класу видно на цьому рівні підвищення.
 *
 * Винесено з `LevelUpWizard` без зміни поведінки: обчислення чисте, а майстер і без нього
 * перевалює за межу декомпозиції. Три різновиди рядка `class_optional_feature`:
 *   — **заміна** (`replaces*`) — гравець міняє вже взяту опцію на іншу;
 *   — **автовидача за умовою** — фіча приходить сама, якщо взято потрібний вибір, і кроку не має;
 *   — решта — власне вибір, який показуємо кроком «Опціональні фічі».
 */

export type OptionalFeatureRow = {
  optionalFeatureId?: number | null;
  featureId?: number | null;
  grantedOnLevels?: number[] | null;
  appearsOnlyIfChoicesTaken?: Array<{ choiceOptionId?: number | null }> | null;
  replacesInvocation?: boolean | null;
  replacesFightingStyle?: boolean | null;
  replacesManeuver?: boolean | null;
  replacesFeatures?: unknown[] | null;
};

type ChoiceSelections = Record<string, unknown> | null | undefined;

export function findVisibleOptionalFeatures<Row extends OptionalFeatureRow>(input: {
  persChoiceOptionIds: readonly number[];
  selections: readonly ChoiceSelections[];
  classOptionalFeatures: readonly Row[];
  classLevelAfter: number;
}): { selectable: Row[]; replacements: Row[] } {
  const takenChoiceOptionIds = collectTakenChoiceOptionIds(input.persChoiceOptionIds, input.selections);

  const atThisLevel = input.classOptionalFeatures
    .filter((option) => (option.grantedOnLevels ?? []).includes(input.classLevelAfter))
    .filter((option) => Boolean(option.optionalFeatureId))
    .filter((option) => passesChoiceGate(option, takenChoiceOptionIds));

  return {
    selectable: atThisLevel.filter(
      (option) => !isReplacement(option) && !isGrantedByAnotherChoice(option),
    ),
    replacements: atThisLevel.filter(isReplacement),
  };
}

/** Вибори, які персонаж уже має, плюс ті, які він щойно зробив у майстрі. */
function collectTakenChoiceOptionIds(
  persChoiceOptionIds: readonly number[],
  selections: readonly ChoiceSelections[],
): Set<number> {
  const taken = new Set<number>(persChoiceOptionIds.filter(Number.isFinite));

  for (const selection of selections) {
    for (const value of Object.values(selection ?? {})) {
      for (const raw of Array.isArray(value) ? value : [value]) {
        const id = Number(raw);
        if (Number.isFinite(id)) taken.add(id);
      }
    }
  }

  return taken;
}

function passesChoiceGate(option: OptionalFeatureRow, taken: Set<number>): boolean {
  const dependencies = option.appearsOnlyIfChoicesTaken ?? [];
  if (dependencies.length === 0) return true;
  return dependencies.some((dependency) => taken.has(Number(dependency?.choiceOptionId)));
}

function isReplacement(option: OptionalFeatureRow): boolean {
  return Boolean(
    option.replacesInvocation ||
      option.replacesFightingStyle ||
      option.replacesManeuver ||
      (option.replacesFeatures?.length ?? 0) > 0,
  );
}

function isGrantedByAnotherChoice(option: OptionalFeatureRow): boolean {
  return Boolean(option.featureId) && (option.appearsOnlyIfChoicesTaken?.length ?? 0) > 0;
}
