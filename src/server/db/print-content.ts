import type { Ruleset } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sourceTranslations } from "@/lib/refs/translation";
import { toHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import { buildSpellSlug } from "@/lib/spell-link";

export type PrintableSpell = {
  spellId: number;
  name: string;
  level: number;
  school: string | null;
  castingTime: string;
  range: string;
  duration: string;
  components: string | null;
  description: string;
  source: string;
  isHomebrew: boolean;
};

export type PrintableMagicItem = {
  name: string;
  description: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "VERY_RARE" | "LEGENDARY" | "ARTIFACT";
  itemType: "ARMOR" | "POTION" | "RING" | "ROD" | "SCROLL" | "STAFF" | "WAND" | "WEAPON" | "WONDROUS_ITEM";
  requiresAttunement: boolean;
};

export class PrintableSpellNotFoundError extends Error {}

/**
 * Ключ каталогу — слаг англійської назви або номер рядка бази. Позиційний номер каталогу 2024
 * не є ні тим, ні тим, і має впасти тут, а не перетворитися на порожній PDF.
 */
export async function findCatalogSpellIdsForKeys(keys: readonly string[], ruleset: Ruleset): Promise<number[]> {
  if (keys.length === 0) return [];

  const spells = await prisma.spell.findMany({ where: { ruleset }, select: { spellId: true, engName: true } });
  const idsBySlug = new Map(spells.map((spell) => [buildSpellSlug(spell.engName ?? ""), spell.spellId]));
  const knownIds = new Set(spells.map((spell) => spell.spellId));

  return keys.map((key) => {
    const spellId = /^\d+$/.test(key) ? findKnownId(knownIds, Number(key)) : idsBySlug.get(key);
    if (spellId === undefined) throw new PrintableSpellNotFoundError(`Заклинання не знайдено: ${key}`);
    return spellId;
  });
}

function findKnownId(knownIds: ReadonlySet<number>, spellId: number): number | undefined {
  return knownIds.has(spellId) ? spellId : undefined;
}

export async function loadPrintableSpells(spellIds: number[]): Promise<PrintableSpell[]> {
  const [catalogSpells, homebrewSpells] = await Promise.all([
    loadPrintableCatalogSpells(spellIds.filter((id) => id > 0)),
    loadPrintableHomebrewSpells(spellIds.filter((id) => id < 0).map((id) => -id)),
  ]);
  return [...catalogSpells, ...homebrewSpells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "uk"));
}

async function loadPrintableCatalogSpells(spellIds: number[]): Promise<PrintableSpell[]> {
  if (spellIds.length === 0) return [];
  const spells = await prisma.spell.findMany({
    where: { spellId: { in: spellIds } },
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: {
      spellId: true,
      name: true,
      level: true,
      school: true,
      castingTime: true,
      range: true,
      duration: true,
      components: true,
      description: true,
      source: true,
    },
  });

  return spells.map((spell) => ({ ...spell, source: translateSourceName(spell.source), isHomebrew: false }));
}

async function loadPrintableHomebrewSpells(entryIds: number[]): Promise<PrintableSpell[]> {
  if (entryIds.length === 0) return [];
  const spells = await prisma.homebrewSpell.findMany({
    where: { homebrewEntryId: { in: entryIds }, entry: { deletedAt: null } },
    include: { entry: { select: { name: true } } },
  });
  return spells.map((spell) => ({
    spellId: toHomebrewCatalogId(spell.homebrewEntryId),
    name: spell.entry.name,
    level: spell.level,
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    duration: spell.duration,
    components: spell.components,
    description: spell.description,
    source: translateSourceName("HOMEBREW"),
    isHomebrew: true,
  }));
}

function translateSourceName(source: string): string {
  return (sourceTranslations as Record<string, string>)[source] ?? source;
}

export async function loadPrintableMagicItems(magicItemIds: number[]): Promise<PrintableMagicItem[]> {
  return prisma.magicItem.findMany({
    where: { magicItemId: { in: magicItemIds } },
    orderBy: { name: "asc" },
    select: {
      name: true,
      description: true,
      rarity: true,
      itemType: true,
      requiresAttunement: true,
    },
  });
}
