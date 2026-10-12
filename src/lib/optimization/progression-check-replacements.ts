import { findRequiredClassLevel, isChoiceOptionLevelMet } from "@/rules/choice-option-level";
import { resolveOptionReplacements, type OptionReplacement } from "./assembly-replacements";
import type { StepContext } from "./progression-walk-types";

export function checkOptionReplacements(ctx: StepContext): void {
  const { step, env } = ctx;
  const characterClass = env.catalog.classes.find((entry) => entry.key === step.classKey);
  const { replacements, problems } = resolveOptionReplacements(characterClass, step.classLevel, step.decisions?.replaceOptions);
  problems.forEach((problem) => ctx.fail(problem));
  const ownedBefore = new Set(ctx.state.chosenOptionIds);
  replacements.forEach((replacement) => applyReplacement(ctx, replacement, ownedBefore));
}

function applyReplacement(ctx: StepContext, { remove, add }: OptionReplacement, ownedBefore: ReadonlySet<number>): void {
  const { chosenOptionIds } = ctx.state;
  if (!ownedBefore.has(remove.id)) ctx.fail(`replaceOptions: «${remove.nameEng}» персонаж ще не обирав, замінювати нічого`);
  if (ownedBefore.has(add.id)) ctx.fail(`replaceOptions: «${add.nameEng}» персонаж уже має`);
  if (!isChoiceOptionLevelMet(add.prerequisites, ctx.step.classLevel)) ctx.fail(`replaceOptions: «${add.nameEng}» доступне з ${findRequiredClassLevel(add.prerequisites)}-го рівня класу`);
  chosenOptionIds.delete(remove.id);
  chosenOptionIds.add(add.id);
}
