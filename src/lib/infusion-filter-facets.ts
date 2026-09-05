import type { InfusionData } from "@/lib/infusionsData";

/// Що саме дає вливання — зібрано з числових полів запису, бо гравець шукає «+1 до КБ»,
/// а не назву.

export const INFUSION_EFFECT_LABELS = {
  AC: "Бонус до КБ",
  ATTACK: "Бонус до атаки й шкоди",
  SPELL_ATTACK: "Бонус до атаки заклинаннями",
  SPEED: "Бонус до швидкості",
  GROWS: "Посилюється на 10 рівні",
} as const;

export type InfusionEffect = keyof typeof INFUSION_EFFECT_LABELS;

type InfusionEffectSource = Pick<
  InfusionData,
  "bonusToAC" | "bonusToAttackRoll" | "bonusToDamage" | "spellAttackBonus" | "speedBonus" | "increasesAtLevel10By"
>;

export function hasInfusionEffect(infusion: InfusionEffectSource, effect: string): boolean {
  if (effect === "AC") return (infusion.bonusToAC ?? 0) > 0;
  if (effect === "ATTACK") return (infusion.bonusToAttackRoll ?? 0) > 0 || (infusion.bonusToDamage ?? 0) > 0;
  if (effect === "SPELL_ATTACK") return (infusion.spellAttackBonus ?? 0) > 0;
  if (effect === "SPEED") return (infusion.speedBonus ?? 0) > 0;
  if (effect === "GROWS") return (infusion.increasesAtLevel10By ?? 0) > 0;
  return false;
}

export function collectInfusionEffects(infusions: readonly InfusionEffectSource[]): InfusionEffect[] {
  return (Object.keys(INFUSION_EFFECT_LABELS) as InfusionEffect[]).filter((effect) =>
    infusions.some((infusion) => hasInfusionEffect(infusion, effect))
  );
}
