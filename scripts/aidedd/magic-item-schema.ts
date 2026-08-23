export type MagicItemEdition = "RULES_2014" | "RULES_2024";

export type MagicItemKind =
  | "WEAPON"
  | "ARMOR"
  | "WONDROUS_ITEM"
  | "POTION"
  | "SCROLL"
  | "RING"
  | "WAND"
  | "ROD"
  | "STAFF";

export type MagicItemRarity =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "VERY_RARE"
  | "LEGENDARY"
  | "ARTIFACT";

export type MagicItemTable = {
  headers: string[];
  rows: string[][];
};

/// One page of aidedd's `om.php`, before any translation. Columns of `MagicItem` this maps onto:
/// nameEng → engName, itemType, rarity, requiresAttunement, descriptionEng → description.
/// The rest is context the translator and the record builder need but the table does not store.
export type ParsedMagicItem = {
  slug: string;
  nameEng: string;
  ruleset: MagicItemEdition;
  typeLineEng: string;
  itemType: MagicItemKind | "";
  itemSubtypeEng: string;
  rarity: MagicItemRarity | "";
  rarityVariantsEng: MagicItemRarity[];
  rarityVariesEng: boolean;
  bundlesMultipleVariants: boolean;
  requiresAttunement: boolean;
  attunementConditionEng: string;
  isCursed: boolean;
  isConsumable: boolean;
  isSummaryOnly: boolean;
  descriptionEng: string;
  tables: MagicItemTable[];
  source: string;
};

const ALWAYS_REQUIRED = [
  "slug",
  "nameEng",
  "typeLineEng",
  "itemType",
  "rarity",
  "descriptionEng",
  "source",
] as const;

export function findEmptyRequiredFields(item: ParsedMagicItem): string[] {
  return ALWAYS_REQUIRED.filter((field) => String(item[field]).trim() === "");
}

export const MAGIC_ITEM_KINDS: Record<string, MagicItemKind> = {
  weapon: "WEAPON",
  armor: "ARMOR",
  "wondrous item": "WONDROUS_ITEM",
  potion: "POTION",
  scroll: "SCROLL",
  ring: "RING",
  wand: "WAND",
  rod: "ROD",
  staff: "STAFF",
};

/// Longest phrase first: "very rare" has to win over "rare" when both match the same text.
export const MAGIC_ITEM_RARITIES: Array<[string, MagicItemRarity]> = [
  ["very rare", "VERY_RARE"],
  ["uncommon", "UNCOMMON"],
  ["legendary", "LEGENDARY"],
  ["artifact", "ARTIFACT"],
  ["common", "COMMON"],
  ["rare", "RARE"],
];

export const RARITY_ORDER: MagicItemRarity[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "VERY_RARE",
  "LEGENDARY",
  "ARTIFACT",
];
