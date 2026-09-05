/**
 * Static spell data helpers for SSG pages.
 *
 * Reads from generated JSON file or normalized 2024 JSON.
 */

import spellsJson from '@/lib/generated/spells.json';
import spells2024Json from '../../data/2024/normalized/spells.json';
import { Ruleset } from '@prisma/client';
import { buildSpellSlug } from '@/lib/spell-link';

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
  spellClasses: { className: string; source?: string | null }[];
  spellRaces: { raceName: string | null }[];
  ruleset?: Ruleset;
  differsFrom2014?: boolean;
  kind?: string;
  note?: string | null;
};

// Cast imported JSON to typed array
const spells2014: SpellData[] = (spellsJson as SpellData[]).map((s) => ({
  ...s,
  ruleset: "RULES_2014" as Ruleset,
  differsFrom2014: false,
  kind: "2014",
  note: null,
}));

export type Raw2024Spell = {
  engName: string;
  name: string;
  level: number;
  school?: string | null;
  castingTime?: string;
  range?: string;
  components?: string | null;
  duration?: string;
  hasRitual?: string | null;
  hasConcentration?: string | null;
  classes?: string[];
  description?: string;
  ruleset?: string;
  source?: string;
  differsFrom2014?: boolean;
  kind?: string;
  note?: string | null;
};

/**
 * Номер заклинання 2024 — позиція в масиві, і він лишається робочим лише заради адрес, що вже
 * проіндексовані й збережені. Ключ для нових посилань — `buildSpellKey` (KR25.2).
 */
export function buildSpells2024(raw: Raw2024Spell[]): SpellData[] {
  return raw.map((s, index) => ({
    spellId: 20000 + index + 1,
    name: s.name,
    engName: s.engName,
    level: s.level,
    school: s.school ?? null,
    castingTime: s.castingTime ?? "",
    duration: s.duration ?? "",
    range: s.range ?? "",
    components: s.components ?? null,
    description: s.description ?? "",
    source: s.source ?? "PHB_2024",
    hasRitual: s.hasRitual ?? "ні",
    hasConcentration: s.hasConcentration ?? "ні",
    spellClasses: (s.classes ?? []).map((c) => ({ className: c })),
    spellRaces: [],
    ruleset: "RULES_2024" as Ruleset,
    differsFrom2014: Boolean(s.differsFrom2014),
    kind: s.kind ?? "unchanged",
    note: s.note ?? null,
  }));
}

const spells2024: SpellData[] = buildSpells2024(spells2024Json as Raw2024Spell[]);

/** Стабільний ключ заклинання в адресі: не залежить ні від порядку рядків у файлі, ні від бази. */
export function buildSpellKey(spell: Pick<SpellData, "engName">): string {
  return buildSpellSlug(spell.engName);
}

/**
 * Get all spells for a given ruleset (defaults to RULES_2014)
 */
export function getAllSpells(ruleset: Ruleset = "RULES_2014"): SpellData[] {
  return ruleset === "RULES_2024" ? spells2024 : spells2014;
}

/**
 * Get spell by ID for a specific ruleset
 */
export function getSpellById(id: number, ruleset: Ruleset = "RULES_2014"): SpellData | undefined {
  const list = getAllSpells(ruleset);
  return list.find((s) => s.spellId === id);
}

/** Маршрути приймають і номер, і слаг; англійська або українська назва теж знаходяться. */
export function getSpellByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): SpellData | undefined {
  const key = idOrSlug.trim();
  if (/^\d+$/.test(key)) return getSpellById(Number(key), ruleset);

  const slug = buildSpellSlug(key);
  const lowerKey = key.toLowerCase();
  return getAllSpells(ruleset).find(
    (s) => buildSpellSlug(s.engName) === slug || s.name.toLowerCase() === lowerKey
  );
}
