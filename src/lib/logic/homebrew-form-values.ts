import type { CreatureSpellChoice } from "@/rules/creature-spellcasting";
import { ABILITY_FIELDS, HOMEBREW_EDITIONS, SPELL_SCHOOLS, type HomebrewCreatureInput, type HomebrewEdition, type HomebrewSpellInput } from "./homebrew-input";

export type HomebrewSpellFormValues = Omit<HomebrewSpellInput, "level"> & { level: string };

export type HomebrewCreatureFormValues = Omit<HomebrewCreatureInput, (typeof ABILITY_FIELDS)[number] | "spells"> & Record<(typeof ABILITY_FIELDS)[number], string> & { spells: CreatureSpellChoice[] };

export function buildEmptySpellValues(ruleset: HomebrewEdition): HomebrewSpellFormValues {
  return { ruleset, name: "", engName: "", level: "1", school: SPELL_SCHOOLS[0], castingTime: "1 дія", range: "", components: "", duration: "", isRitual: false, isConcentration: false, classes: [], description: "" };
}

export function readSpellFormValues(raw: Record<string, unknown>): HomebrewSpellFormValues {
  const empty = buildEmptySpellValues(readEdition(raw.ruleset));
  return {
    ...empty,
    ...Object.fromEntries(Object.entries(raw).filter(([key]) => key in empty)),
    level: String(raw.level ?? empty.level),
    classes: Array.isArray(raw.classes) ? raw.classes.map(String) : [],
    isRitual: raw.isRitual === true,
    isConcentration: raw.isConcentration === true,
  } as HomebrewSpellFormValues;
}

export function buildEmptyCreatureValues(ruleset: HomebrewEdition): HomebrewCreatureFormValues {
  return {
    ruleset, name: "", engName: "", size: "Середній", type: "", alignment: "", ac: "", hp: "", speed: "30 фт.",
    strength: "10", dexterity: "10", constitution: "10", intelligence: "10", wisdom: "10", charisma: "10",
    savingThrows: "", skills: "", damageVulnerability: "", damageResistance: "", damageImmunity: "", conditionImmunity: "",
    senses: "", languages: "", challenge: "1", specialAbilities: "", actions: "", bonusActions: "", reactions: "", legendaryActions: "", description: "",
    spellAttackBonus: "", spellSaveDc: "", spellCasterLevel: "", spells: [],
  };
}

export function readCreatureFormValues(raw: Record<string, unknown>): HomebrewCreatureFormValues {
  const empty = buildEmptyCreatureValues(readEdition(raw.ruleset));
  const filled = Object.keys(empty).map((key) => [key, raw[key] === undefined || raw[key] === null ? empty[key as keyof HomebrewCreatureFormValues] : String(raw[key])]);
  return { ...Object.fromEntries(filled), spells: Array.isArray(raw.spells) ? raw.spells : [] } as HomebrewCreatureFormValues;
}

function readEdition(value: unknown): HomebrewEdition {
  return HOMEBREW_EDITIONS.find((edition) => edition === value) ?? "RULES_2014";
}
