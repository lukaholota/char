import magicItems from './generated/magicItems.json';
import magicItems2024Json from '../../data/2024/normalized/magic-items.json';
import { ItemRarity, MagicItemType, Ruleset, Source } from "@/lib/prisma-enums";
import type { MagicItem } from "@prisma/client";

export type MagicItemWithSpells = MagicItem & {
  givesSpells: {
    spellId: number;
    name: string;
    engName: string;
    level: number;
  }[];
  typeLineEng?: string | null;
  attunementConditionEng?: string | null;
  isCursed?: boolean;
  isConsumable?: boolean;
  /// Таблиця `magic_item` джерела не зберігає; його несе лише імпорт 2024.
  source?: string | null;
};

const magicItems2014: MagicItemWithSpells[] = (magicItems as unknown as MagicItemWithSpells[]).map((i) => ({
  ...i,
  ruleset: "RULES_2014" as Ruleset,
  typeLineEng: null,
  attunementConditionEng: null,
  isCursed: false,
  isConsumable: false,
}));

type Raw2024MagicItem = {
  magicItemId: number;
  engName: string;
  name: string;
  itemType?: string;
  rarity?: string;
  requiresAttunement?: boolean;
  attunementConditionEng?: string | null;
  typeLineEng?: string | null;
  isCursed?: boolean;
  isConsumable?: boolean;
  description?: string;
  shortDescription?: string | null;
  ruleset?: string;
  source?: string;
};

/// `magicItemId` береться з файла, а не з позиції в масиві: на нього посилається
/// `pers_magic_item`, і перестановка рядків у каталозі перевішувала б предмети персонажів
/// на чужі записи. Блок 20001+ зарезервований під 2024 — див. prisma/seed/magicItemIds.ts.
const magicItems2024: MagicItemWithSpells[] = (magicItems2024Json as Raw2024MagicItem[]).map((i) => ({
  magicItemId: i.magicItemId,
  name: i.name,
  engName: i.engName,
  itemType: (i.itemType ?? "WONDROUS_ITEM") as MagicItemType,
  rarity: (i.rarity ?? "COMMON") as ItemRarity,
  requiresAttunement: Boolean(i.requiresAttunement),
  attunementConditionEng: i.attunementConditionEng ?? null,
  typeLineEng: i.typeLineEng ?? null,
  isCursed: Boolean(i.isCursed),
  isConsumable: Boolean(i.isConsumable),
  description: i.description ?? "",
  shortDescription: i.shortDescription ?? null,
  source: (i.source ?? "DMG_2024") as Source,
  weaponProficiencies: null,
  weaponProficienciesSpecial: null,
  bonusToAC: null,
  bonusToRangedDamage: null,
  bonusToSavingThrows: null,
  noArmorOrShieldForACBonus: false,
  ruleset: "RULES_2024" as Ruleset,
  givesSpells: [],
}));

export const getAllMagicItems = (ruleset: Ruleset = "RULES_2014"): MagicItemWithSpells[] => {
  return ruleset === "RULES_2024" ? magicItems2024 : magicItems2014;
};

export const getMagicItemById = (id: number, ruleset: Ruleset = "RULES_2014"): MagicItemWithSpells | undefined => {
  const items = getAllMagicItems(ruleset);
  return items.find((i) => i.magicItemId === id);
};
