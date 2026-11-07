import type { PersWithRelations } from "@/lib/actions/pers";
import { buildSpellRollContext, type RollStateView } from "@/lib/components/dice/roll-contexts";
import { calculateFinalModifier } from "@/lib/logic/bonus-calculator";
import { isHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import type { SpellcastingStatRow } from "@/lib/logic/spellcasting-stats";
import type { DiceRollContext } from "@/lib/stores/diceUIStore";
import { findSpellDice, planSpellRolls } from "@/rules/spell-dice";
import { getPersSpellId } from "./sheet-spell-links";

type SheetSpellRow = {
  spellId?: unknown;
  badgeText?: unknown;
  spell?: { spellId?: unknown; name?: unknown; engName?: unknown; level?: unknown; ruleset?: unknown } | null;
};

export type CastSlot = { slotLevel: number; slotLabel: string };

/// Домашні заклинання не мають кубиків, навіть якщо їхня англійська назва збігається з книжною.
export function buildSheetSpellRoll(input: {
  pers: PersWithRelations;
  persSpell: SheetSpellRow;
  statRows: readonly SpellcastingStatRow[];
  slot: CastSlot | null;
  attackState?: RollStateView;
}): DiceRollContext | null {
  const { pers, persSpell, slot } = input;
  const spellId = getPersSpellId(persSpell);
  const spell = persSpell.spell;
  if (!spell || spellId === null || isHomebrewCatalogId(spellId)) return null;
  const spellLevel = Number(spell.level ?? 0);
  const ruleset = spell.ruleset === "RULES_2024" || (!spell.ruleset && pers.ruleset === "RULES_2024") ? "RULES_2024" : "RULES_2014";
  const engName = String(spell.engName ?? "");
  const dice = findSpellDice({ engName, level: spellLevel, ruleset });
  if (!dice) return null;
  const row = findStatRow(input.statRows, persSpell.badgeText);
  const plan = planSpellRolls(dice, {
    spellLevel,
    slotLevel: slot?.slotLevel ?? spellLevel,
    characterLevel: pers.level,
    spellcastingModifier: row?.ability ? calculateFinalModifier(pers, row.ability) : 0,
  });
  return buildSpellRollContext({
    spellName: String(spell.name ?? ""),
    plan,
    slotLabel: slot?.slotLabel,
    attackBonus: row?.attackBonus ?? 0,
    saveDC: row?.saveDC ?? 0,
    attackState: input.attackState,
    spell: { engName, level: spellLevel, ruleset },
  });
}

/// Заклинання з бейджем класу бере СК цього класу; інакше — перше джерело.
function findStatRow(rows: readonly SpellcastingStatRow[], badgeText: unknown): SpellcastingStatRow | undefined {
  const badge = String(badgeText ?? "").trim().toLocaleLowerCase("uk");
  return (badge ? rows.find((row) => row.label.toLocaleLowerCase("uk") === badge) : undefined) ?? rows[0];
}
