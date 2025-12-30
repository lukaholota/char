
import magicItems from './generated/magicItems.json';
import { MagicItem, ItemRarity, MagicItemType } from '@prisma/client';

export type MagicItemWithSpells = MagicItem & {
  givesSpells: {
    spellId: number;
    name: string;
    engName: string;
    level: number;
  }[];
};

export const getAllMagicItems = (): MagicItemWithSpells[] => {
  return magicItems as unknown as MagicItemWithSpells[];
};

export const getMagicItemById = (id: number): MagicItemWithSpells | undefined => {
  const items = getAllMagicItems();
  return items.find((i) => i.magicItemId === id);
};
