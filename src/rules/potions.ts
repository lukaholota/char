type PotionSource = { engName?: string | null; itemType?: string | null };
type HealingDice = { count: number; sides: number; bonus: number };
type PotionRestore = { healing?: HealingDice; tempHp?: number };

export type PotionDrinkRoll = { healing: number; healingRolls: number[]; healingDice: HealingDice | null; tempHp: number };

const POTION_RESTORES: Record<string, PotionRestore> = {
  "Potion of Healing": { healing: { count: 2, sides: 4, bonus: 2 } },
  "Potion of Greater Healing": { healing: { count: 4, sides: 4, bonus: 4 } },
  "Potion of Superior Healing": { healing: { count: 8, sides: 4, bonus: 8 } },
  "Potion of Supreme Healing": { healing: { count: 10, sides: 4, bonus: 20 } },
  "Potion of Heroism": { tempHp: 10 },
};

export function isDrinkableMagicItem(item: PotionSource): boolean {
  return item.itemType === "POTION";
}

export function describeDrinkVerb(item: PotionSource): string {
  return item.engName?.startsWith("Oil") ? "Використати" : "Випити";
}

export function findPotionHealingDice(item: PotionSource): HealingDice | null {
  return (item.engName && POTION_RESTORES[item.engName]?.healing) || null;
}

export function findPotionTempHp(item: PotionSource): number {
  return (item.engName && POTION_RESTORES[item.engName]?.tempHp) || 0;
}

export function rollPotionDrink(item: PotionSource, random: () => number = Math.random): PotionDrinkRoll {
  const dice = findPotionHealingDice(item);
  const healingRolls = dice ? Array.from({ length: dice.count }, () => 1 + Math.floor(random() * dice.sides)) : [];
  const healing = dice ? healingRolls.reduce((sum, roll) => sum + roll, 0) + dice.bonus : 0;
  return { healing, healingRolls, healingDice: dice, tempHp: findPotionTempHp(item) };
}

export function describeHealingDice({ count, sides, bonus }: HealingDice): string {
  return `${count}к${sides} + ${bonus}`;
}
