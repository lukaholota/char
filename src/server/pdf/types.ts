import type { PersForPrint } from "@/lib/actions/pers";
import type { CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import type { CreatureData } from "@/lib/bestiaryData";

export type PrintSection =
  | "CHARACTER"
  | "FEATURES"
  | "SPELLS"
  | "SPELL_SHEET"
  | "MAGIC_ITEMS"
  | "WILDSHAPES"
  | "DETAILS";

export interface PrintConfig {
  sections: PrintSection[];
  flattenCharacterSheet?: boolean;
}

export type PersSpellWithSpell = { spellId: number; isPrepared: boolean; spell: { level: number; name: string } };

export interface CharacterPdfData {
  pers: PersForPrint;
  features: CharacterFeaturesGroupedResult;
  wildshapeForms: CreatureData[];
}
