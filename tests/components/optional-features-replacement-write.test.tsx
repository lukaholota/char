// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.hoisted(() => {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, String(value)),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    } satisfies Storage,
  });
});

import OptionalFeaturesForm from "@/lib/components/levelUp/OptionalFeaturesForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

afterEach(cleanup);

const GROUP = "Маневри майстра бою";
const OPTIONAL_FEATURE_ID = 7;

const selectedClass = {
  name: "FIGHTER_2014",
  classChoiceOptions: {},
  classOptionalFeatures: [
    {
      optionalFeatureId: OPTIONAL_FEATURE_ID,
      title: "Замінити маневр?",
      grantedOnLevels: [4],
      replacesManeuver: true,
      replacesFeatures: [],
      feature: { description: "Можна замінити один відомий маневр." },
    },
  ],
} as never;

const effectiveSubclass = {
  subclassChoiceOptions: {
    "1": {
      choiceOptionId: 3,
      choiceOption: {
        choiceOptionId: 3,
        groupName: GROUP,
        optionName: "Наказ атакувати",
        optionNameEng: "Commander's Strike (Maneuver)",
        prerequisites: null,
        features: [],
      },
    },
  },
} as never;

const persChoiceOptions = [
  { choiceOptionId: 1, optionName: "Пастка й обмін", optionNameEng: "Bait and Switch (Maneuver)", groupName: GROUP },
];

describe("Крок заміни пише в чернетку лише свій ключ", () => {
  it("вибір заміни не переписує решту формдати знімком", () => {
    const realUpdateFormData = usePersFormStore.getState().updateFormData;
    const updateFormData = vi.fn(realUpdateFormData);
    usePersFormStore.setState({ updateFormData });

    render(
      <OptionalFeaturesForm
        selectedClass={selectedClass}
        effectiveSubclass={effectiveSubclass}
        persChoiceOptions={persChoiceOptions}
        classLevel={4}
        formId="replacements"
        mode="REPLACEMENT"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Прийняти заміну" }));
    fireEvent.click(screen.getByText("Пастка й обмін"));
    fireEvent.click(screen.getByText("Наказ атакувати"));

    const replacementWrites = updateFormData.mock.calls
      .map(([payload]) => Object.keys(payload as object))
      .filter((keys) => keys.includes("classOptionalFeatureReplacementSelections"));

    expect(replacementWrites.length).toBeGreaterThan(0);
    for (const keys of replacementWrites) {
      expect(keys).toEqual(["classOptionalFeatureReplacementSelections"]);
    }

    expect(
      usePersFormStore.getState().formData.classOptionalFeatureReplacementSelections,
    ).toEqual({ [OPTIONAL_FEATURE_ID]: { removeChoiceOptionId: 1, addChoiceOptionId: 3 } });

    usePersFormStore.setState({ updateFormData: realUpdateFormData });
  });
});
