import { Ability } from "@prisma/client";

export class AbilityScores {
  private readonly scores: Record<Ability, number>;

  constructor(scores: Record<Ability, number>) {
    for (const [ability, value] of Object.entries(scores)) {
      if (value < 1) {
        throw new Error(`Ability ${ability} must be >= 1`);
      }
    }
    this.scores = { ...scores };
  }

  get(ability: Ability): number {
    return this.scores[ability];
  }

  toPrimitives() {
    return { ...this.scores };
  }
}
