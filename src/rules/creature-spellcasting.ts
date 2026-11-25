import { calculateAbilityModifier } from "./abilities";
import { readSignedNumber } from "./creature-rolls";
import { findSpellDice, planSpellRolls, type SpellRoll, type SpellRollPlan } from "./spell-dice";
import type { AbilityKey } from "./types";

export type CreatureSpellChoice = { spellId: number; name: string; level: number };
export type CreatureSpellOption = CreatureSpellChoice & { searchName: string };
export type CreatureSpell = CreatureSpellChoice & { engName: string; plan: SpellRollPlan | null };
export type CreatureSpellcasting = { attackBonus: number; saveDc: number; ruleset: "RULES_2014" | "RULES_2024"; spells: CreatureSpell[] };

type CatalogSpell = { spellId: number; name: string; engName: string; level: number; description?: string | null; slotLevel?: number | null };
type StatblockCaster = {
  ruleset: "RULES_2014" | "RULES_2024";
  specialAbilities: string;
  actions: string;
  bonusActions?: string;
  intelligence: string;
  wisdom: string;
  charisma: string;
  proficiencyBonus: string;
};
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
const SPELLCASTING_PARAGRAPH = /<p>(?:(?!<\/p>)[\s\S])*?\{\{[^}]*Spellcasting[^}]*\}\}(?:(?!<\/p>)[\s\S])*<\/p>/gu;
const SPELL_LINK = /href="(?:\/2024)?\/spells\/([^"#?]+)"[^>]*>(?:(?!<\/a>)[\s\S])*<\/a>\s*»?\s*(?:\((?:версія|як заклинання|накладене на)\s+(\d+))?/gu;
const STATBLOCK_SAVE_DC = /СК\D{0,40}?(\d+)/u;
const STATBLOCK_ATTACK = /\+(\d+)\s+(?:на|до)\s+(?:влучання|кидк\p{L}*\s+атаки)/u;
const STATBLOCK_CASTER_LEVEL = /(?:заклинач|чаротворець)\p{L}*\s+(\d+)/u;

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

/// Бестіарій перелічує заклинання посиланнями в абзаці «Чаротворення»; звідти ж беремо СК, бонус атаки й рівень заклинача.
export function buildStatblockSpellcasting(statblock: StatblockCaster, findSpell: (key: string) => CatalogSpell | undefined): CreatureSpellcasting | null {
  const html = [statblock.specialAbilities, statblock.actions, statblock.bonusActions ?? ""].join("").match(SPELLCASTING_PARAGRAPH)?.join(" ") ?? "";
  const spells = findLinkedSpells(html, findSpell);
  if (!spells.length) return null;
  const text = html.replace(/<[^>]+>/g, "");
  const saveDc = readFirstNumber(text, STATBLOCK_SAVE_DC);
  return buildCreatureSpellcasting(spells, statblock.ruleset, {
    mentalScores: [statblock.intelligence, statblock.wisdom, statblock.charisma].map((score) => Number.parseInt(score, 10) || 10),
    proficiencyBonus: readSignedNumber(statblock.proficiencyBonus) ?? 2,
    attackBonus: readFirstNumber(text, STATBLOCK_ATTACK) ?? (saveDc === null ? null : saveDc - 8),
    saveDc,
    casterLevel: readFirstNumber(text, STATBLOCK_CASTER_LEVEL),
  });
}

function findLinkedSpells(html: string, findSpell: (key: string) => CatalogSpell | undefined): CatalogSpell[] {
  const spells = new Map<number, CatalogSpell>();
  for (const [, key, slotLevel] of html.matchAll(SPELL_LINK)) {
    const spell = findSpell(key);
    if (spell && !spells.has(spell.spellId)) spells.set(spell.spellId, { ...spell, slotLevel: slotLevel ? Number(slotLevel) : null });
  }
  return [...spells.values()];
}

function readFirstNumber(text: string, pattern: RegExp): number | null {
  const found = text.match(pattern)?.[1];
  return found ? Number(found) : null;
}

function planCreatureSpell(spell: CatalogSpell, ruleset: "RULES_2014" | "RULES_2024", characterLevel: number, spellcastingModifier: number): SpellRollPlan | null {
  const dice = findSpellDice({ engName: spell.engName, level: spell.level, ruleset });
  if (dice) return planSpellRolls(dice, { spellLevel: spell.level, slotLevel: Math.max(spell.level, spell.slotLevel ?? spell.level), characterLevel, spellcastingModifier });
  return planSpellFromDescription(spell.description ?? "", spellcastingModifier);
}

/// Заклинання, якого немає в таблиці кубиків, читаємо з опису.
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
