import { countWithWordUk } from "@/lib/ukrainian-plural";
import { POINT_FORMS } from "@/lib/components/wizard/pick-hint";

export function findAsiStepHint(pointsLeft: number, isBackgroundAsiIncomplete: boolean): string | null {
  if (pointsLeft < 0) return `Витрачено на ${countWithWordUk(-pointsLeft, POINT_FORMS)} більше, ніж є. Зменште якусь характеристику.`;
  if (isBackgroundAsiIncomplete) return "Розподіліть бонуси походження від передісторії.";
  return null;
}
