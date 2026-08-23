import {
  COVERED_BY_EXISTING_ENTRIES,
  SOURCE_ITEM_TYPE_OVERRIDES,
} from "../../prisma/seed/magicItemBatches";
import { ExistingMagicItem } from "./existing-magic-items";
import { MagicItemManifestRow } from "./build-magic-items-manifest";
import { MagicItemTranslation } from "./read-magic-item-batches";
import { ParsedMagicItem } from "./magic-item-schema";

/// Only the six text-and-classification columns are rebuilt from the import. Everything mechanical
/// (`bonusToAC`, `bonusToSavingThrows`, `weaponProficienciesSpecial`, `givesSpells`…) is carried
/// over from the catalogue row verbatim: the previous merge script silently dropped two of those
/// columns and zeroed a third, which is exactly the failure KR14.1 forbids repeating.
export type MagicItemRecord = {
  magicItemId: number;
  name: string;
  engName: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  description: string;
  shortDescription: string;
  ruleset: "RULES_2014";
  carriedOver: Record<string, unknown>;
  isNewToCatalog: boolean;
};

const CARRIED_OVER_COLUMNS = [
  "weaponProficiencies",
  "weaponProficienciesSpecial",
  "bonusToAC",
  "bonusToRangedDamage",
  "bonusToSavingThrows",
  "noArmorOrShieldForACBonus",
  "givesSpells",
] as const;

export function buildMagicItemRecord(
  source: ParsedMagicItem,
  translation: MagicItemTranslation,
  row: MagicItemManifestRow,
  existing: ExistingMagicItem | undefined
): MagicItemRecord {
  const itemType =
    SOURCE_ITEM_TYPE_OVERRIDES[translation.slug] ?? (source.itemType || existing?.itemType || "");
  const rarity = source.rarity || existing?.rarity || "";
  assertTranslatable(source, translation, row, itemType, rarity);

  return {
    magicItemId: row.magicItemId,
    name: translation.name,
    engName: existing?.engName ?? source.nameEng,
    itemType,
    rarity,
    requiresAttunement: source.requiresAttunement,
    description: translation.description,
    shortDescription: translation.shortDescription,
    ruleset: "RULES_2014",
    carriedOver: readCarriedOverColumns(existing),
    isNewToCatalog: row.isNewToCatalog,
  };
}

/// Сторінки-бандли підписані «rarity varies» або «rarity by figurine», тож рідкості з них не
/// витягти. Якщо така сторінка лягає на наявний запис каталогу, тип і рідкість беруться звідти —
/// так само, як механічні колонки. Якщо запису немає, слуг мусить стояти в
/// `COVERED_BY_EXISTING_ENTRIES`: тоді сід-рядка з нього не буде взагалі.
function assertTranslatable(
  source: ParsedMagicItem,
  translation: MagicItemTranslation,
  row: MagicItemManifestRow,
  itemType: string,
  rarity: string
): void {
  if (source.isSummaryOnly) {
    throw new Error(
      `«${source.nameEng}»: сторінка aidedd має лише резюме (не OGL). Такий предмет не збирається ` +
        "із джерела — його текст або лишається наявним, або береться з книги."
    );
  }
  if ((itemType === "" || rarity === "") && COVERED_BY_EXISTING_ENTRIES[translation.slug] === undefined) {
    throw new Error(
      `«${source.nameEng}»: рядок типу «${source.typeLineEng}» не дає тип або рідкість, ` +
        "а в каталозі такого запису немає. Якщо це сторінка-бандл, впишіть слуг у " +
        "COVERED_BY_EXISTING_ENTRIES."
    );
  }
  if (translation.slug !== row.slug) {
    throw new Error(`Слаг перекладу «${translation.slug}» не збігається з рядком маніфесту «${row.slug}»`);
  }
}

function readCarriedOverColumns(existing: ExistingMagicItem | undefined): Record<string, unknown> {
  if (!existing) return {};

  const source = existing as unknown as Record<string, unknown>;
  return Object.fromEntries(
    CARRIED_OVER_COLUMNS.filter((column) => source[column] !== undefined).map((column) => [
      column,
      source[column],
    ])
  );
}
