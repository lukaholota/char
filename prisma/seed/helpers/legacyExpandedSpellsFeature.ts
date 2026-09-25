import patronSpellLists from "../../../data/2014/warlock-expanded-spell-lists.json";
import dictionary from "../../../src/lib/refs/dictionary.json";
import { subclassTranslations, subclassTranslationsEng } from "../../../src/lib/refs/translation";
import { buildSpellSlug } from "../../../src/lib/spell-link";
import { findSpellEngName2024, type LegacySubclass2024 } from "../../../src/rules/legacy-subclasses-2024";

export type LegacyExpandedSpellsFeature = { engName: string; name: string; shortDescription: string; description: string };

type PatronSpell = { engName: string; level: number; genieKind: string | null };

const CLOSING_LINE = "Ці заклинання додаються для вас до списку заклинань чорнокнижника.";
const GENIE_KIND_ORDER = ["Dao", "Djinni", "Efreeti", "Marid"] as const;
const CREATURE_NAMES: Readonly<Record<string, string>> = dictionary.DND_DICTIONARY.creatureTypeTags;

export function buildLegacyExpandedSpellsFeature(entry: LegacySubclass2024, spellNames2024: ReadonlyMap<string, string>): LegacyExpandedSpellsFeature {
  const spells = readPatronSpells(entry.subclass);
  const patronName = findTranslation(subclassTranslations, entry.subclass);
  const hasGenieKinds = spells.some((spell) => spell.genieKind !== null);

  return {
    engName: `${findTranslation(subclassTranslationsEng, entry.subclass)}: Expanded Spell List (legacy 2024)`,
    name: `Заклинання патрона (${patronName})`,
    shortDescription: "Дає розширений список заклинань патрона.",
    description: hasGenieKinds ? describeGenieSpells(spells, spellNames2024) : describeSpellsByLevel(spells, spellNames2024),
  };
}

function describeSpellsByLevel(spells: readonly PatronSpell[], spellNames2024: ReadonlyMap<string, string>): string {
  return `${formatLevelLines(spells, spellNames2024)}\n\n${CLOSING_LINE}`;
}

function describeGenieSpells(spells: readonly PatronSpell[], spellNames2024: ReadonlyMap<string, string>): string {
  const shared = spells.filter((spell) => spell.genieKind === null);
  const kindLines = GENIE_KIND_ORDER.map((kind) => {
    const kindSpells = spells.filter((spell) => spell.genieKind === kind);
    const levels = kindSpells.map((spell) => `${spell.level}р. ${formatSpellLink(spell, spellNames2024)}`).join(", ");
    return `- ${CREATURE_NAMES[kind.toLowerCase()]}: ${levels}.`;
  });

  return [`Для будь-якого роду:\n${formatLevelLines(shared, spellNames2024)}`, `Залежно від роду джина:\n${kindLines.join("\n")}`, CLOSING_LINE].join("\n\n");
}

function formatLevelLines(spells: readonly PatronSpell[], spellNames2024: ReadonlyMap<string, string>): string {
  const levels = [...new Set(spells.map((spell) => spell.level))].sort((a, b) => a - b);
  const lines = levels.map((level) => {
    const links = spells.filter((spell) => spell.level === level).map((spell) => formatSpellLink(spell, spellNames2024));
    return `${level}р. ${links.join(", ")}`;
  });
  return `${lines.join(";\n")}.`;
}

function formatSpellLink(spell: PatronSpell, spellNames2024: ReadonlyMap<string, string>): string {
  const engName = findSpellEngName2024(spell.engName);
  const name = spellNames2024.get(engName);
  if (!name) throw new Error(`${engName}: немає заклинання 2024 для риси розширеного списку`);
  return `<a href="/2024/spells/${buildSpellSlug(engName)}">${name}</a>`;
}

function readPatronSpells(subclass: string): PatronSpell[] {
  const list = patronSpellLists.lists.find((entry) => entry.subclass === subclass);
  if (!list) throw new Error(`${subclass}: немає розширеного списку в data/2014/warlock-expanded-spell-lists.json`);
  return list.spells;
}

function findTranslation(table: Readonly<Record<string, string>>, key: string): string {
  const value = table[key];
  if (!value) throw new Error(`${key}: немає перекладу підкласу`);
  return value;
}
