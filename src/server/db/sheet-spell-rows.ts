import { prisma } from "@/lib/prisma";
import { isHomebrewCatalogId } from "@/lib/logic/homebrew-view";

type SheetSpellRowChanges = {
  isPrepared?: boolean;
  badgeText?: string | null;
  badgeColor?: string | null;
  excludeFromPreparedCount?: boolean;
  excludeFromKnownCount?: boolean;
};

const SHEET_SPELL_ROW_SELECT = {
  isPrepared: true,
  badgeText: true,
  badgeColor: true,
  excludeFromPreparedCount: true,
  excludeFromKnownCount: true,
} as const;

export async function updateSheetSpellRow(persId: number, spellId: number, changes: SheetSpellRowChanges) {
  if (isHomebrewCatalogId(spellId)) {
    return prisma.persHomebrewSpell.update({
      where: { persId_homebrewEntryId: { persId, homebrewEntryId: -spellId } },
      data: changes,
      select: SHEET_SPELL_ROW_SELECT,
    });
  }
  return prisma.persSpell.update({ where: { persId_spellId: { persId, spellId } }, data: changes, select: SHEET_SPELL_ROW_SELECT });
}

export async function deleteSheetSpellRow(persId: number, spellId: number): Promise<void> {
  if (isHomebrewCatalogId(spellId)) await prisma.persHomebrewSpell.deleteMany({ where: { persId, homebrewEntryId: -spellId } });
  else await prisma.persSpell.deleteMany({ where: { persId, spellId } });
}
