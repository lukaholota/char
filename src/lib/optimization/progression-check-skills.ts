import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { SkillsEnum } from "@/lib/types/enums";
import { findExpertiseSelectionProblem } from "@/rules/expertise-selections";
import { findMulticlassSkillChoice, findMulticlassSkillProblem } from "@/rules/multiclass-skill-choice";
import type { AssemblyFeature } from "./assembly-catalog";
import type { StepContext } from "./progression-walk-types";

export function checkExpertiseAndSkills(ctx: StepContext): void {
  const features = listLevelFeatures(ctx);
  checkSkillChoice(ctx, features);
  checkExpertise(ctx, features);
}

export function checkMulticlassEntrySkill(ctx: StepContext): void {
  const picked = ctx.step.decisions?.multiclassSkills ?? [];
  const characterClass = ctx.env.content.classes.find((entry) => entry.name === ctx.step.classKey);
  const choice = ctx.isClassEntry && characterClass ? findMulticlassSkillChoice(ctx.step.classKey, characterClass.skillProficiencies, SkillsEnum) : null;
  if (!choice) {
    if (picked.length) ctx.fail(`multiclassSkills: ${translateValue(ctx.step.classKey)} не дає навички при вході в клас, або клас уже взято`);
    return;
  }
  const problem = findMulticlassSkillProblem(choice, picked, [...ctx.state.proficientSkills]);
  if (problem) ctx.fail(`multiclassSkills: ${problem}`);
  picked.forEach((skill) => ctx.state.proficientSkills.add(skill));
}

function listLevelFeatures({ env, step, progress }: StepContext): AssemblyFeature[] {
  const characterClass = env.catalog.classes.find((entry) => entry.key === step.classKey);
  const subclass = characterClass?.subclasses.find((entry) => entry.key === progress.subclassKey);
  return [...(characterClass?.features ?? []), ...(subclass?.features ?? [])].filter((feature) => feature.levelGranted === step.classLevel);
}

function checkSkillChoice(ctx: StepContext, features: readonly AssemblyFeature[]): void {
  const choices = features.flatMap((feature) => (feature.skillChoice ? [feature.skillChoice] : []));
  const picked = ctx.step.decisions?.skillProficiencies ?? [];
  if (!choices.length) {
    if (picked.length) ctx.fail(`skillProficiencies: на цьому рівні класу ${translateValue(ctx.step.classKey)} немає здібності з вибором навичок`);
    return;
  }
  const [choice] = choices;
  const outside = picked.filter((skill) => !choice.options.includes(skill));
  if (choices.length > 1) ctx.fail("на цьому рівні кілька здібностей з вибором навичок, а формат підтримує одну");
  else if (picked.length !== choice.count) ctx.fail(`потрібно обрати рівно ${choice.count} навичок (skillProficiencies), а в плані ${picked.length}`);
  else if (new Set(picked).size !== picked.length) ctx.fail("skillProficiencies містить повтор");
  else if (outside.length) ctx.fail(`skillProficiencies: ${outside.join(", ")} не з дозволених навичок здібності`);
  picked.forEach((skill) => ctx.state.proficientSkills.add(skill));
}

function checkExpertise(ctx: StepContext, features: readonly AssemblyFeature[]): void {
  const { state, step } = ctx;
  const grants = features.flatMap((feature) => (feature.expertiseGrant ? [feature.expertiseGrant] : []));
  const selected = step.decisions?.expertise ?? [];
  if (!grants.length && !selected.length) return;
  const problem = findExpertiseSelectionProblem({ grants, selected, proficientSkills: [...state.proficientSkills], existingExpertises: [...state.expertiseSkills] });
  if (problem) ctx.fail(`expertise: ${problem}`);
  selected.forEach((skill) => state.expertiseSkills.add(skill));
}
