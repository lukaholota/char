import { toHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import type { CharacterPdfData, PersSpellWithSpell } from "./types";

export function collectSheetPdfSpells(pers: Pick<CharacterPdfData["pers"], "persSpells" | "homebrewSpells">): PersSpellWithSpell[] {
  const homebrewSpells = pers.homebrewSpells.flatMap(({ homebrewEntryId, isPrepared, entry }) =>
    entry.spell ? [{ spellId: toHomebrewCatalogId(homebrewEntryId), isPrepared, spell: { level: entry.spell.level, name: entry.name } }] : [],
  );
  return [...pers.persSpells, ...homebrewSpells];
}
