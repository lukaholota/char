import { findSubclassFeatureSpellChoice, type ClassOptionSpellChoice } from "@/rules/class-option-spell-choices-2024";
import { findFeatSpellSelectionProblem } from "@/rules/feat-spell-choices";
import type { SpellPoolEntry, StepContext } from "./progression-walk-types";

export function checkSubclassFeatureSpells(ctx: StepContext): void {
  const { step, state, env } = ctx;
  const keys = step.decisions?.classOptionSpellKeys ?? [];
  const unknownKeys = keys.filter((key) => !env.catalog.spellIdsByKey.has(key));
  if (unknownKeys.length) {
    ctx.fail(`classOptionSpellKeys: немає заклинання ${unknownKeys.join(", ")}`);
    return;
  }
  const choice = findFeatureSpellChoice(ctx);
  if (!choice) {
    if (keys.length) ctx.fail("classOptionSpellKeys: на цьому рівні жодна здатність класу чи підкласу не дає обрати заклинання");
    return;
  }
  const spellIds = keys.map((key) => env.catalog.spellIdsByKey.get(key)!);
  const problem = findFeatureSpellProblem(ctx, choice, spellIds);
  if (problem) ctx.fail(`classOptionSpellKeys: ${problem}`);
  spellIds.forEach((spellId) => state.takenSpellIds.add(spellId));
}

function findFeatureSpellProblem({ env, state }: StepContext, choice: ClassOptionSpellChoice, spellIds: readonly number[]): string | null {
  const selectionProblem = findFeatSpellSelectionProblem(choice.rule, spellIds, listFeatureSpellCandidates(env.spellPool, choice), choice.label);
  if (selectionProblem) return selectionProblem;
  return spellIds.some((spellId) => state.takenSpellIds.has(spellId)) ? `Це заклинання у вас уже є — оберіть інше: ${choice.label}` : null;
}

function findFeatureSpellChoice({ step, progress }: StepContext): ClassOptionSpellChoice | null {
  if (!progress.subclassKey) return null;
  return findSubclassFeatureSpellChoice({ ruleset: "RULES_2014", subclassName: progress.subclassKey, classLevel: step.classLevel });
}

function listFeatureSpellCandidates(pool: readonly SpellPoolEntry[], choice: ClassOptionSpellChoice): SpellPoolEntry[] {
  const extraLists = choice.rule.picks.flatMap((pick) => (pick.extraList ? [pick.extraList] : []));
  return pool.map((spell) => {
    const joinedLists = extraLists.filter((list) => list.spellEngNames.includes(spell.engName)).map((list) => list.name);
    return joinedLists.length ? { ...spell, spellLists: [...(spell.spellLists ?? []), ...joinedLists] } : spell;
  });
}
