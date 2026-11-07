export type HeroLifeState = { kind: "up" } | { kind: "dying"; successes: number; failures: number } | { kind: "dead" };

type HeroHealth = { currentHp: number; deathSaveSuccesses: number; deathSaveFailures: number; isDead: boolean };

export function findHeroLifeState(hero: HeroHealth | null): HeroLifeState {
  if (!hero) return { kind: "up" };
  if (hero.isDead) return { kind: "dead" };
  if (hero.currentHp > 0) return { kind: "up" };
  return { kind: "dying", successes: hero.deathSaveSuccesses, failures: hero.deathSaveFailures };
}

export function describeHeroLifeState(state: HeroLifeState): string | null {
  if (state.kind === "dead") return "загинув";
  if (state.kind === "dying") return `без тями, кидки смерті: успіхів ${state.successes} з 3, провалів ${state.failures} з 3`;
  return null;
}
