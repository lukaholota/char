import type { PersWithRelations } from "@/lib/actions/pers";
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

export type PersSpellWithSpell = PersWithRelations["persSpells"][number];

export interface CharacterPdfData {
  pers: PersWithRelations;
  features: CharacterFeaturesGroupedResult;
  spellsByLevel: Record<number, PersSpellWithSpell[]>;
  wildshapeForms: CreatureData[];
}
