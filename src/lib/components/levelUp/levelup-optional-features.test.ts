import { describe, expect, it } from "vitest";
import { findVisibleOptionalFeatures } from "@/lib/components/levelUp/levelup-optional-features";

const invocation = { optionalFeatureId: 1, grantedOnLevels: [2], replacesInvocation: true };
const plainChoice = { optionalFeatureId: 2, grantedOnLevels: [2] };
const otherLevel = { optionalFeatureId: 3, grantedOnLevels: [5] };
const gated = { optionalFeatureId: 4, grantedOnLevels: [2], appearsOnlyIfChoicesTaken: [{ choiceOptionId: 77 }] };
const autoGranted = {
  optionalFeatureId: 5,
  featureId: 900,
  grantedOnLevels: [2],
  appearsOnlyIfChoicesTaken: [{ choiceOptionId: 77 }],
};

const findAtSecondLevel = (input: { persChoiceOptionIds?: number[]; selections?: Array<Record<string, unknown>> }) =>
  findVisibleOptionalFeatures({
    persChoiceOptionIds: input.persChoiceOptionIds ?? [],
    selections: input.selections ?? [],
    classOptionalFeatures: [invocation, plainChoice, otherLevel, gated, autoGranted],
    classLevelAfter: 2,
  });

describe("опціональні фічі підвищення рівня", () => {
  it("розводить заміни й власне вибір, ігноруючи чужі рівні", () => {
    const visible = findAtSecondLevel({});

    expect(visible.selectable.map((option) => option.optionalFeatureId)).toEqual([2]);
    expect(visible.replacements.map((option) => option.optionalFeatureId)).toEqual([1]);
  });

  it("умовну опцію відкриває вибір, який персонаж уже має", () => {
    const visible = findAtSecondLevel({ persChoiceOptionIds: [77] });

    expect(visible.selectable.map((option) => option.optionalFeatureId)).toEqual([2, 4]);
  });

  it("умовну опцію відкриває і вибір, зроблений щойно в майстрі", () => {
    const visible = findAtSecondLevel({ selections: [{ "Пакт": 77 }] });

    expect(visible.selectable.map((option) => option.optionalFeatureId)).toEqual([2, 4]);
  });

  it("фіча, яку умова видає сама, кроку не займає", () => {
    const visible = findAtSecondLevel({ persChoiceOptionIds: [77] });

    expect(visible.selectable.map((option) => option.optionalFeatureId)).not.toContain(5);
  });
});
