import { formatModifier } from "@/lib/logic/utils";
import type { CustomRollFormula } from "@/rules/custom-roll-formula";

export function formatCustomRoll(formula: CustomRollFormula, bonus: number): string {
  return `${formula.count}к${formula.sides}${bonus ? formatModifier(bonus) : ""}`;
}
