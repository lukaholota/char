import type { MetamagicData } from "./metamagicData";

export function describeMetamagicCost(option: Pick<MetamagicData, "cost" | "isCostSpellLevel">): string {
  if (option.isCostSpellLevel) return "Очки чародійства = рівень заклинання";
  return `${option.cost} ${findSorceryPointWord(option.cost)} чародійства`;
}

function findSorceryPointWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return "очко";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "очки";
  return "очок";
}
