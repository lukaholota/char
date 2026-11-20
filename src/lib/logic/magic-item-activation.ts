export type MagicItemActivationStep = "EQUIP" | "ATTUNE";

type ItemLink = { isEquipped: boolean; isAttuned: boolean; magicItem: { requiresAttunement: boolean } };

export function findMissingActivationSteps(link: ItemLink): MagicItemActivationStep[] {
  return [
    ...(link.isEquipped ? [] : ["EQUIP" as const]),
    ...(link.magicItem.requiresAttunement && !link.isAttuned ? ["ATTUNE" as const] : []),
  ];
}

export function isMagicItemActive(link: ItemLink): boolean {
  return findMissingActivationSteps(link).length === 0;
}

export function describeMissingSteps(steps: readonly MagicItemActivationStep[]): string {
  if (steps.length === 2) return "екіпіруйте предмет і налаштуйтеся на нього";
  return steps[0] === "EQUIP" ? "екіпіруйте предмет" : "налаштуйтеся на предмет";
}

export function describeActivationAction(steps: readonly MagicItemActivationStep[]): string {
  if (steps.length === 2) return "Екіпірувати й налаштуватися";
  return steps[0] === "EQUIP" ? "Екіпірувати" : "Налаштуватися";
}
