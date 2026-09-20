import type { CreatureData } from "@/lib/bestiaryData";
import type { SpellData } from "@/lib/spellsData";
import { classTranslations } from "@/lib/refs/translation";
import type { VoteValue } from "./content-discussion";
import type { HomebrewEdition, HomebrewKind, HomebrewRuleset } from "./homebrew-input";

export type HomebrewEntrySummary = {
  entryId: number;
  kind: HomebrewKind;
  edition: HomebrewEdition;
  name: string;
  authorName: string;
  score: number;
  myVote: VoteValue;
  commentCount: number;
  canEdit: boolean;
  createdAt: string;
};

export type HomebrewSpellEntry = HomebrewEntrySummary & { kind: "SPELL"; spell: SpellData };
export type HomebrewCreatureEntry = HomebrewEntrySummary & { kind: "CREATURE"; creature: CreatureData };
export type HomebrewCatalogEntry = HomebrewSpellEntry | HomebrewCreatureEntry;

export type StoredHomebrewSpell = {
  engName: string | null;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  isRitual: boolean;
  isConcentration: boolean;
  classes: readonly string[];
  description: string;
};

export function toHomebrewCatalogId(entryId: number): number {
  return -entryId;
}

export function isHomebrewCatalogId(catalogId: number): boolean {
  return catalogId < 0;
}

export function buildHomebrewSpellKey(entryId: number): string {
  return `homebrew:${entryId}`;
}

export function buildHomebrewSpellData(entry: { entryId: number; name: string; ruleset: HomebrewRuleset }, spell: StoredHomebrewSpell): SpellData {
  return {
    spellId: toHomebrewCatalogId(entry.entryId),
    name: entry.name,
    engName: spell.engName ?? "",
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    duration: spell.duration,
    range: spell.range,
    components: spell.components,
    description: spell.description,
    source: "HOMEBREW",
    hasRitual: spell.isRitual ? "так" : "ні",
    hasConcentration: spell.isConcentration ? "так" : "ні",
    spellClasses: listUniqueClassNames(spell.classes).map((className) => ({ className, source: null })),
    spellRaces: [],
    ruleset: entry.ruleset,
  };
}

export type StoredPersHomebrewSpell = {
  homebrewEntryId: number;
  isPrepared: boolean;
  badgeText: string | null;
  badgeColor: string | null;
  excludeFromPreparedCount: boolean;
  excludeFromKnownCount: boolean;
  entry: { name: string; ruleset: HomebrewRuleset | null; spell: StoredHomebrewSpell | null };
};

export function buildHomebrewSheetSpellRows(rows: readonly StoredPersHomebrewSpell[], persRuleset: HomebrewRuleset) {
  return rows.flatMap(({ homebrewEntryId, entry, ...state }) => {
    if (!entry.spell) return [];
    const spell = buildHomebrewSpellData({ entryId: homebrewEntryId, name: entry.name, ruleset: entry.ruleset ?? persRuleset }, entry.spell);
    return [{ ...state, persSpellId: `homebrew-${homebrewEntryId}`, spellId: spell.spellId, isHomebrew: true, spell }];
  });
}

export function buildHomebrewCreatureData(entry: { entryId: number; ruleset: HomebrewRuleset }, statBlock: Record<string, unknown>, imageUrl: string | null): CreatureData {
  return {
    ...(statBlock as unknown as CreatureData),
    creatureId: toHomebrewCatalogId(entry.entryId),
    ruleset: entry.ruleset,
    source: "HOMEBREW",
    ...(imageUrl ? { imageUrl, imageWidth: 512, imageHeight: 512 } : {}),
  };
}

function listUniqueClassNames(classes: readonly string[]): string[] {
  return [...new Set(classes.map((className) => classTranslations[className as keyof typeof classTranslations] ?? className))];
}
