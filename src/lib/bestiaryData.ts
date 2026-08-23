/**
 * Static bestiary / creature data helpers for SSG pages and client catalogs.
 *
 * Reads from generated creatures JSON for both 2014 and 2024 editions.
 */

import { Ruleset } from "@prisma/client";
import creatures2014Json from "@/lib/generated/creatures.json";
import creatures2024Json from "@/lib/generated/creatures2024.json";
import { toEntitySlug } from "./slug-utils";

export type CreatureData = {
  creatureId: number;
  name: string;
  nameEng: string;
  size: string;
  type: string;
  alignment: string;
  source: string;
  ac: string;
  hp: string;
  speed: string;
  strength: string;
  dexterity: string;
  constitution: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  skills: string;
  senses: string;
  languages: string;
  challenge: string;
  damageImmunity: string;
  damageResistance: string;
  conditionImmunity: string;
  savingThrows: string;
  specialAbilities: string;
  actions: string;
  reactions: string;
  legendaryActions: string;
  proficiencyBonus: string;
  description: string;
  lairActions: string;
  lairInfo: string;
  regionEffects: string;
  xp: string;
  ruleset: Ruleset;
  /// 2024 statblock fields (KR12.1). Optional because the inherited 2014 catalog predates them.
  initiative?: string;
  gear?: string;
  bonusActions?: string;
  damageVulnerability?: string;
  xpInLair?: string;
  imageUrl?: string;
};

// 2014 creatures
const creatures2014: CreatureData[] = (creatures2014Json as CreatureData[]).map((c, index) => ({
  ...c,
  creatureId: c.creatureId || index + 1,
  ruleset: "RULES_2014" as Ruleset,
}));

// 2024 creatures
const creatures2024: CreatureData[] = (creatures2024Json as CreatureData[]).map((c, index) => ({
  ...c,
  creatureId: c.creatureId || 20001 + index,
  ruleset: "RULES_2024" as Ruleset,
}));

/**
 * Edition marker for catalogue and search rows. The same monster exists in both editions as two
 * separate records (docs/DECISIONS.md Р12), so the row has to say which one it is.
 */
export function findEditionLabel(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "2024" : "2014";
}

/**
 * Get all creatures for a given ruleset (defaults to RULES_2014)
 */
export function getAllCreatures(ruleset: Ruleset = "RULES_2014"): CreatureData[] {
  return ruleset === "RULES_2024" ? creatures2024 : creatures2014;
}

/**
 * Get creature by ID for a specific ruleset
 */
export function getCreatureById(id: number, ruleset: Ruleset = "RULES_2014"): CreatureData | undefined {
  const list = getAllCreatures(ruleset);
  return list.find((c) => c.creatureId === id);
}

/**
 * Get creature by ID or slug/name for a specific ruleset
 */
export function getCreatureByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): CreatureData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getCreatureById(Math.trunc(asNumber), ruleset);
  }

  const slug = toEntitySlug(trimmed);
  const list = getAllCreatures(ruleset);
  return list.find(
    (c) =>
      toEntitySlug(c.nameEng) === slug ||
      toEntitySlug(c.name) === slug ||
      c.nameEng.toLowerCase() === trimmed.toLowerCase() ||
      c.name.toLowerCase() === trimmed.toLowerCase()
  );
}

/**
 * Get all unique creature types for a ruleset
 */
export function getAllCreatureTypes(ruleset: Ruleset = "RULES_2014"): string[] {
  const list = getAllCreatures(ruleset);
  const set = new Set<string>();
  for (const c of list) {
    if (c.type) {
      // If type has subtype in parens like "Монстр (перевертень)", extract base type or full
      const base = c.type.split("(")[0].trim();
      if (base) set.add(base);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "uk"));
}

/**
 * Get all unique creature sizes for a ruleset
 */
export function getAllCreatureSizes(ruleset: Ruleset = "RULES_2014"): string[] {
  const list = getAllCreatures(ruleset);
  const set = new Set<string>();
  for (const c of list) {
    if (c.size) {
      set.add(c.size.trim());
    }
  }
  return Array.from(set);
}

/**
 * Get all unique creature CRs for a ruleset
 */
export function getAllCreatureCRs(ruleset: Ruleset = "RULES_2014"): string[] {
  const list = getAllCreatures(ruleset);
  const set = new Set<string>();
  for (const c of list) {
    if (c.challenge) {
      set.add(c.challenge.trim());
    }
  }
  return Array.from(set);
}
