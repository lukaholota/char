import type { CharacterPdfData } from "../types";

export type SpellTableRow = {
  level: number;
  name: string;
  castingTime: string;
  range: string;
  isConcentration: boolean;
  isRitual: boolean;
  needsMaterial: boolean;
  notes: string;
};

export type SpellDetails = {
  level: number;
  name: string;
  castingTime: string;
  range: string;
  components: string | null;
  duration: string;
  isRitual: boolean;
  isConcentration: boolean;
  isPrepared: boolean;
};

type SpellSources = Pick<CharacterPdfData["pers"], "persSpells" | "homebrewSpells">;

export function collectSpellTableRows(pers: SpellSources): SpellTableRow[] {
  return [...collectCatalogSpells(pers), ...collectHomebrewSpells(pers)].sort(compareSpells).map(buildSpellTableRow);
}

export function buildSpellTableRow(spell: SpellDetails): SpellTableRow {
  return {
    level: spell.level,
    name: spell.name,
    castingTime: shortenCastingTime(spell.castingTime),
    range: shortenRange(spell.range),
    isConcentration: spell.isConcentration,
    isRitual: spell.isRitual,
    needsMaterial: hasMaterialComponent(spell.components),
    notes: [spell.level > 0 && spell.isPrepared ? "підг." : "", shortenDuration(spell.duration)].filter(Boolean).join(" · "),
  };
}

export function buildNameCandidates(name: string): string[] {
  const withoutOriginal = name.replace(/\s*\[[^\]]*\]\s*$/u, "");
  return withoutOriginal && withoutOriginal !== name ? [name, withoutOriginal] : [name];
}

export function shortenCastingTime(castingTime: string): string {
  const [action] = castingTime.split(",");
  return shortenTimeUnits(action.trim()).replace("бонусна дія", "бон. дія");
}

export function shortenRange(range: string): string {
  const trimmed = range.trim();
  if (/^на себе/iu.test(trimmed)) return "На себе";
  return trimmed.replace(/(\d+)\s*футів/gu, "$1 фт");
}

export function shortenDuration(duration: string): string {
  const withoutConcentration = duration.trim().replace(/^концентрація,\s*/iu, "");
  return shortenTimeUnits(withoutConcentration).replace(/^\p{Lu}/u, (letter) => letter.toLocaleLowerCase("uk"));
}

function shortenTimeUnits(value: string): string {
  return value.replace(/(\d+)\s*хвилин[аи]?/gu, "$1 хв").replace(/(\d+)\s*годин[аи]?/gu, "$1 год");
}

function hasMaterialComponent(components: string | null): boolean {
  return (components ?? "").split(",").some((component) => component.trim().startsWith("М"));
}

function compareSpells(a: SpellDetails, b: SpellDetails): number {
  return a.level - b.level || a.name.localeCompare(b.name, "uk");
}

function collectCatalogSpells(pers: SpellSources): SpellDetails[] {
  return pers.persSpells.map(({ isPrepared, spell }) => ({
    level: spell.level,
    name: spell.name,
    castingTime: spell.castingTime,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    isRitual: isYes(spell.hasRitual),
    isConcentration: isYes(spell.hasConcentration),
    isPrepared,
  }));
}

function collectHomebrewSpells(pers: SpellSources): SpellDetails[] {
  return pers.homebrewSpells.flatMap(({ isPrepared, entry }) =>
    entry.spell
      ? [
          {
            level: entry.spell.level,
            name: entry.name,
            castingTime: entry.spell.castingTime,
            range: entry.spell.range,
            components: entry.spell.components,
            duration: entry.spell.duration,
            isRitual: entry.spell.isRitual,
            isConcentration: entry.spell.isConcentration,
            isPrepared,
          },
        ]
      : [],
  );
}

function isYes(value: string | null): boolean {
  return value?.trim().toLocaleLowerCase("uk") === "так";
}
