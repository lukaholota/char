import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { describeMulticlassEntryProblem, findMulticlassEntryProblem, type MulticlassEntryClass } from "@/rules/multiclass-entry";
import type { ClassProgress, StepContext } from "./progression-walk-types";

function toEntryClass(characterClass: { name: string; multiclassReqs: unknown }): MulticlassEntryClass {
  return { name: characterClass.name, multiclassReqs: characterClass.multiclassReqs as MulticlassEntryClass["multiclassReqs"] };
}

export function createClassProgress(): ClassProgress {
  return { classLevel: 0, subclassKey: null, ownedCantrips: 0, ownedCantripIds: [], ownedLeveledSpells: 0, ownedLeveledSpellIds: [], spellbookSpellIds: [] };
}

export function warnAboutMulticlassEntry({ state, step, env, warn }: StepContext): void {
  const findClass = (name: string) => env.content.classes.filter((entry) => entry.name === name).map(toEntryClass);
  const [newClass] = findClass(step.classKey);
  if (!newClass) return;
  const problem = findMulticlassEntryProblem({
    ruleset: "RULES_2014",
    abilityScores: state.scores,
    currentClasses: [...state.classes.keys()].flatMap(findClass),
    newClass,
  });
  if (problem) warn(`мультиклас: ${describeMulticlassEntryProblem(problem, translateValue)} Це лише попередження (правила підказують, не забороняють), але автор статті, імовірно, мав вищу характеристику.`);
}

export function checkSubclass(ctx: StepContext): void {
  const { step, progress, env } = ctx;
  const characterClass = env.content.classes.find((entry) => entry.name === step.classKey);
  if (!characterClass) return;
  if (step.subclassKey && !progress.subclassKey) {
    if (step.classLevel !== characterClass.subclassLevel) {
      ctx.fail(`підклас ${step.subclassKey} обирається на ${characterClass.subclassLevel}-му рівні класу ${translateValue(step.classKey)}, а тут ${step.classLevel}-й рівень цього класу`);
    }
    progress.subclassKey = step.subclassKey;
  }
  if (!progress.subclassKey && step.classLevel === characterClass.subclassLevel) {
    ctx.fail(`${translateValue(step.classKey)} ${step.classLevel}-го рівня мусить мати підклас, а в плані його немає: додайте subclassKey на цьому рівні`);
  }
}
