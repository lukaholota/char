/**
 * Static spell data helpers for SSG pages.
 * 
 * Reads from generated JSON file (no Prisma at runtime).
 * Run `npm run generate:spells` before build to update data.
 */

import spellsJson from '@/lib/generated/spells.json';

export type SpellData = {
  spellId: number;
  name: string;
  engName: string;
  level: number;
  school: string | null;
  castingTime: string;
  duration: string;
  range: string;
  components: string | null;
  description: string;
  source: string;
  hasRitual: string | null;
  hasConcentration: string | null;
  spellClasses: { className: string }[];
  spellRaces: { raceName: string | null }[];
};

// Cast imported JSON to typed array
const spells: SpellData[] = spellsJson as SpellData[];

/**
 * Get all spells (synchronous, from static JSON)
 */
export function getAllSpells(): SpellData[] {
  return spells;
}

/**
 * Get spell by ID (synchronous lookup)
 */
export function getSpellById(id: number): SpellData | undefined {
  return spells.find((s) => s.spellId === id);
}

/**
 * Get spell by ID or slug (name/engName)
 */
export function getSpellByIdOrSlug(idOrSlug: string): SpellData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);
  
  if (Number.isFinite(asNumber)) {
    return getSpellById(Math.trunc(asNumber));
  }
  
  return spells.find(
    (s) => s.engName === trimmed || s.name === trimmed
  );
}
