/// Ознаки предмета, що не є ані типом, ані рідкістю, але за якими гравець його шукає.
/// 2014 знає лише «дарує заклинання»; прокляття й витратність прийшли з імпортом 2024.

export const MAGIC_ITEM_TRAIT_LABELS = {
  SPELLS: "Дарує заклинання",
  CURSED: "Проклятий",
  CONSUMABLE: "Витратний",
} as const;

export type MagicItemTrait = keyof typeof MAGIC_ITEM_TRAIT_LABELS;

export type MagicItemTraitSource = {
  givesSpells?: readonly unknown[] | null;
  isCursed?: boolean | null;
  isConsumable?: boolean | null;
};

export function hasMagicItemTrait(item: MagicItemTraitSource, trait: string): boolean {
  if (trait === "SPELLS") return (item.givesSpells?.length ?? 0) > 0;
  if (trait === "CURSED") return Boolean(item.isCursed);
  if (trait === "CONSUMABLE") return Boolean(item.isConsumable);
  return false;
}

export function collectMagicItemTraits(items: readonly MagicItemTraitSource[]): MagicItemTrait[] {
  return (Object.keys(MAGIC_ITEM_TRAIT_LABELS) as MagicItemTrait[]).filter((trait) =>
    items.some((item) => hasMagicItemTrait(item, trait))
  );
}
