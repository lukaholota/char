import type { BuildPageData } from "./build-pages.server";

export function resolveBuildLevelPlans(build: BuildPageData["builds"][number], raceId?: number) {
  const choice = build.alternatives.find((alternative) => alternative.raceId === raceId);
  const source = build.recipe.choices.flatMap((group) => group.alternatives).find((alternative) => alternative.alternativeId === choice?.alternativeId);
  return build.recipe.details!.levelPlans.map((plan) => {
    const override = source?.levelOverrides?.find((entry) => entry.characterLevel === plan.level);
    return override ? { ...plan, text: override.text, abilityChanges: override.abilityChanges, sourceRefs: source!.sourceRefs } : plan;
  });
}
