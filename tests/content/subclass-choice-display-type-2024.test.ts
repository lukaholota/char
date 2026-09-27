import { describe, expect, it } from "vitest";
import { FeatureDisplayType } from "@prisma/client";
import { findDisplayTypeInRulesText } from "../../prisma/seed/helpers/featureDisplayType";

describe("тип дії опції підкласу 2024 з тексту книги", () => {
  it("«As a Bonus Action» — бонусна дія (Feinting Attack)", () => {
    expect(findDisplayTypeInRulesText("As a Bonus Action, you can expend one Superiority Die to feint")).toBe(FeatureDisplayType.BONUSACTION);
  });

  it("власна реакція — реакція (Riposte)", () => {
    expect(findDisplayTypeInRulesText("When a creature misses you with a melee attack roll, you can take a Reaction and expend one Superiority Die")).toBe(
      FeatureDisplayType.REACTION,
    );
  });

  it("реакція союзника не робить опцію реакцією власника (Maneuvering Attack)", () => {
    expect(
      findDisplayTypeInRulesText("When you hit a creature with an attack roll, you can expend one Superiority Die to maneuver one of your comrades. That creature can use its Reaction to move"),
    ).toBe(FeatureDisplayType.PASSIVE);
  });

  it("решта лишається пасивною (Trip Attack)", () => {
    expect(findDisplayTypeInRulesText("When you hit a creature with an attack roll using a weapon")).toBe(FeatureDisplayType.PASSIVE);
  });
});
