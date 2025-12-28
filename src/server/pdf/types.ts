import type { PersWithRelations } from "@/lib/actions/pers";
import type { CharacterFeaturesGroupedResult } from "@/lib/actions/pers";

export type PrintSection = "CHARACTER" | "FEATURES" | "SPELLS";

export interface PrintConfig {
  sections: PrintSection[];
}

export type PersSpellWithSpell = PersWithRelations["persSpells"][number];

export interface CharacterPdfData {
  pers: PersWithRelations;
  features: CharacterFeaturesGroupedResult;
  spellsByLevel: Record<number, PersSpellWithSpell[]>;
}
