import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { findCustomAsiPackageProblem } from "@/rules/abilities";
import { findAbilityScoreCeiling, raiseAbilityScore } from "@/rules/ability-score-ceiling";
import { applyAbilityIncreases, collectFeatGrants } from "@/rules/feat-grants";
import type { AbilityKey } from "@/rules/types";
import type { StepContext } from "./progression-walk-types";

export function checkAbilityIncrease(ctx: StepContext): void {
  const { step, env } = ctx;
  const decisions = step.decisions ?? {};
  const characterClass = env.content.classes.find((entry) => entry.name === step.classKey);
  if (!characterClass) return;
  const takesIncrease = Boolean(decisions.abilityScoreIncrease || decisions.featKey);
  const isIncreaseLevel = characterClass.abilityScoreUpLevels.includes(step.classLevel);
  if (takesIncrease && !isIncreaseLevel) {
    const what = decisions.featKey ? `риса ${decisions.featKey}` : "підвищення характеристик";
    ctx.fail(`${what} недоступне: ${translateValue(step.classKey)} отримує його на рівнях класу ${characterClass.abilityScoreUpLevels.join(", ")}, а це ${step.classLevel}-й рівень класу`);
  }
  if (!takesIncrease && isIncreaseLevel) {
    ctx.warn(`${step.classLevel}-й рівень класу ${translateValue(step.classKey)} дає підвищення характеристик або рису, але план нічого не обирає (так і задумано, якщо автор його пропускає)`);
  }
  if (decisions.abilityScoreIncrease) applyAbilityScoreIncrease(ctx);
  if (decisions.featKey) applyFeat(ctx);
}

function applyAbilityScoreIncrease(ctx: StepContext): void {
  const increases = ctx.step.decisions?.abilityScoreIncrease ?? [];
  const packageProblem = findCustomAsiPackageProblem(increases.map((entry) => ({ ability: entry.ability, value: entry.amount })));
  if (packageProblem) ctx.fail(packageProblem);
  const ceiling = findAbilityScoreCeiling({ ruleset: "RULES_2014", source: "STANDARD" });
  for (const { ability, amount } of increases) {
    const before = ctx.state.scores[ability];
    const after = raiseAbilityScore(before, amount, ceiling);
    if (after - before < amount) ctx.fail(`${translateValue(ability)} ${before} + ${amount} перевищує ${ceiling}: частину підвищення буде втрачено`);
    ctx.state.scores[ability] = after;
  }
}

function applyFeat(ctx: StepContext): void {
  const { step, env, state } = ctx;
  const decisions = step.decisions ?? {};
  const feat = env.content.feats.find((entry) => entry.name === decisions.featKey);
  if (!feat) return;
  if (state.featKeys.includes(feat.name) && !feat.isRepeatable) ctx.fail(`риса ${feat.name} вже взята і не повторюється`);
  state.featKeys.push(feat.name);
  const chosenOptionIds = (decisions.featOptions ?? []).flatMap((ref) => feat.featChoiceOptions.filter((option) => option.choiceOption.optionNameEng === ref.optionNameEng).map((option) => option.choiceOptionId));
  const grants = collectFeatGrants(feat, chosenOptionIds);
  const ceiling = findAbilityScoreCeiling({ ruleset: "RULES_2014", source: "STANDARD" });
  const raised = applyAbilityIncreases(state.scores, grants.abilityIncreases, ceiling);
  for (const { ability, amount } of grants.abilityIncreases) {
    if (raised[ability] - state.scores[ability] < amount) ctx.warn(`риса ${feat.name}: ${translateValue(ability)} ${state.scores[ability]} + ${amount} перевищує ${ceiling}: частину підвищення буде втрачено`);
  }
  Object.assign(state.scores, raised as Record<AbilityKey, number>);
  grants.proficientSkills.forEach((skill) => state.proficientSkills.add(skill));
  grants.expertiseSkills.forEach((skill) => state.expertiseSkills.add(skill));
}
