import { type CreatureSpeeds, parseCreatureSpeeds } from "../../src/rules/creature-speed";

/// Останній крок збірки каталогу: рядок швидкості перетворюється на числа тут і більше ніде.
/// Правила читають числа, а не шукають підрядок, і сторінка малює той самий рядок, що й раніше.
export function stampCreatureSpeeds<T extends { speed: string }>(creatures: T[]): (T & CreatureSpeeds)[] {
  return creatures.map((creature) => ({ ...creature, ...parseCreatureSpeeds(creature.speed) }));
}
