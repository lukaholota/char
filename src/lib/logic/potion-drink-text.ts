import type { PotionDrinkRoll } from "@/rules/potions";
import { describeHealingDice } from "@/rules/potions";

type DrinkOutcome = { name: string; roll: PotionDrinkRoll; healed: number; stateLabel: string | null };

export function describePotionDrink({ name, roll, healed, stateLabel }: DrinkOutcome): { title: string; description?: string } {
  const parts = [
    ...(roll.healingDice ? [describeHealing(roll, roll.healingDice, healed)] : []),
    ...(roll.tempHp > 0 ? [`${roll.tempHp} тимчасових ХП`] : []),
    ...(stateLabel ? ["ефект діє — видно в «Станах» угорі листа"] : []),
  ];
  return { title: `Випито: ${name}`, description: parts.length > 0 ? parts.join(" · ") : undefined };
}

function describeHealing(roll: PotionDrinkRoll, dice: NonNullable<PotionDrinkRoll["healingDice"]>, healed: number): string {
  const rolled = `${describeHealingDice(dice)}: ${[...roll.healingRolls, dice.bonus].join(" + ")}`;
  if (healed >= roll.healing) return `+${roll.healing} ХП (${rolled})`;
  return healed === 0 ? `ХП уже були повні — випало ${roll.healing} (${rolled})` : `+${healed} ХП до повних (випало ${roll.healing}: ${rolled})`;
}
