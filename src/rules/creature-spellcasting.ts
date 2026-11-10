import { calculateAbilityModifier } from "./abilities";
import { findSpellDice, planSpellRolls, type SpellRoll, type SpellRollPlan } from "./spell-dice";
import type { AbilityKey } from "./types";

export type CreatureSpellChoice = { spellId: number; name: string; level: number };
export type CreatureSpellOption = CreatureSpellChoice & { searchName: string };
export type CreatureSpell = CreatureSpellChoice & { engName: string; plan: SpellRollPlan | null };
export type CreatureSpellcasting = { attackBonus: number; saveDc: number; ruleset: "RULES_2014" | "RULES_2024"; spells: CreatureSpell[] };

type CatalogSpell = { spellId: number; name: string; engName: string; level: number; description?: string | null };
type CasterInput = {
  mentalScores: readonly number[];
  proficiencyBonus: number;
  attackBonus: number | null;
  saveDc: number | null;
  casterLevel: number | null;
};

const MAX_TEXT_ROLLS = 3;
const DICE_IN_TEXT = /(\d+)к(\d+)(?:\s*\+\s*(\d+|модифікатор))?/giu;
const SPELL_ATTACK = /атак\p{L}*\s+заклинанням/iu;
const SAVE_ABILITY_NAME = /(?:рятівн\p{L}*\s+кидок|ряткидок|ряткидка|ряткидку)\s+(сил|спр|ста|інт|муд|хар)/iu;
const ABILITY_BY_STEM: Readonly<Record<string, AbilityKey>> = { сил: "STR", спр: "DEX", ста: "CON", інт: "INT", муд: "WIS", хар: "CHA" };
const HIGHER_SLOT_SENTENCE = /вищ(?:ого|ому|их|е)(?!\p{L})/iu;
const DAMAGE_WORD = /шкод/iu;
const HEALING_WORDS = /(?:відновл|лікує)\p{L}*[^.]*(?:хіт|ХП)/iu;

export function describeCreatureSpellLevel(level: number): string {
  return level === 0 ? "Замовляння" : `${level}-й рівень`;
}

export function findDefaultSpellStats(mentalScores: readonly number[], proficiencyBonus: number) {
  const modifier = Math.max(...mentalScores.map(calculateAbilityModifier));
  return { attackBonus: proficiencyBonus + modifier, saveDc: 8 + proficiencyBonus + modifier };
}

export function buildCreatureSpellcasting(spells: readonly CatalogSpell[], ruleset: "RULES_2014" | "RULES_2024", caster: CasterInput): CreatureSpellcasting {
  const defaults = findDefaultSpellStats(caster.mentalScores, caster.proficiencyBonus);
  const saveDc = caster.saveDc ?? defaults.saveDc;
  const modifier = saveDc - 8 - caster.proficiencyBonus;
  const characterLevel = caster.casterLevel ?? 1;
  return {
    attackBonus: caster.attackBonus ?? defaults.attackBonus,
    saveDc,
    ruleset,
    spells: spells.map((spell) => ({
      spellId: spell.spellId,
      name: spell.name,
      engName: spell.engName,
      level: spell.level,
      plan: planCreatureSpell(spell, ruleset, characterLevel, modifier),
    })),
  };
}

function planCreatureSpell(spell: CatalogSpell, ruleset: "RULES_2014" | "RULES_2024", characterLevel: number, spellcastingModifier: number): SpellRollPlan | null {
  const dice = findSpellDice({ engName: spell.engName, level: spell.level, ruleset });
  if (dice) return planSpellRolls(dice, { spellLevel: spell.level, slotLevel: spell.level, characterLevel, spellcastingModifier });
  return planSpellFromDescription(spell.description ?? "", spellcastingModifier);
}

/// Таблиця кубиків закінчується 3-м рівнем, а монстри чаклують і вище: решту читаємо з опису.
export function planSpellFromDescription(html: string, spellcastingModifier = 0): SpellRollPlan | null {
  const text = html.replace(/<[^>]+>/g, " ");
  const rolls = findSentenceRolls(text, spellcastingModifier);
  const attack = SPELL_ATTACK.test(text);
  const saveStem = text.match(SAVE_ABILITY_NAME)?.[1].toLocaleLowerCase("uk");
  const save = saveStem ? ABILITY_BY_STEM[saveStem] : null;
  if (!attack && !save && !rolls.length) return null;
  return { attack, save, rollsLater: false, pieces: null, rolls };
}

function findSentenceRolls(text: string, spellcastingModifier: number): SpellRoll[] {
  const rolls: SpellRoll[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/u)) {
    const label = findSentenceRollLabel(sentence);
    if (!label) continue;
    for (const [, count, sides, bonus] of sentence.matchAll(DICE_IN_TEXT)) {
      const roll = { key: `text-${rolls.length}`, label, count: Number(count), sides: Number(sides), bonus: bonus === "модифікатор" ? spellcastingModifier : Number(bonus ?? 0) };
      if (!rolls.some((known) => known.count === roll.count && known.sides === roll.sides)) rolls.push(roll);
    }
  }
  return rolls.slice(0, MAX_TEXT_ROLLS);
}

function findSentenceRollLabel(sentence: string): string | null {
  if (HIGHER_SLOT_SENTENCE.test(sentence)) return null;
  if (DAMAGE_WORD.test(sentence)) return "Шкода";
  return HEALING_WORDS.test(sentence) ? "Лікування" : null;
}
