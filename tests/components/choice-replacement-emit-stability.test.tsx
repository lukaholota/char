// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import ChoiceReplacementForm from "@/lib/components/levelUp/ChoiceReplacementForm";

afterEach(cleanup);

const GROUP = "Маневри майстра бою";

const currentChoices = [
  { choiceOptionId: 1, optionName: "Пастка й обмін", groupName: GROUP },
  { choiceOptionId: 2, optionName: "Готовність", groupName: GROUP },
];

const availableOptions = [3, 4].map((choiceOptionId) => ({
  choiceOptionId,
  choiceOption: {
    choiceOptionId,
    groupName: GROUP,
    optionName: choiceOptionId === 3 ? "Наказ атакувати" : "Відволікальний удар",
    optionNameEng: "Maneuver",
    prerequisites: null,
    features: [],
  },
}));

function renderInParent(onSelectionChange: (replacement: { oldId: number; newId: number } | null) => void) {
  function Parent() {
    const [tick, setTick] = useState(0);
    return (
      <div>
        <button type="button" onClick={() => setTick(tick + 1)}>
          Перемалювати {tick}
        </button>
        <ChoiceReplacementForm
          title="Замінити маневр?"
          groupName={GROUP}
          currentChoices={currentChoices}
          availableOptions={availableOptions}
          classLevel={4}
          formId="replacements"
          onSelectionChange={(replacement) => onSelectionChange(replacement)}
        />
      </div>
    );
  }
  render(<Parent />);
}

describe("ChoiceReplacementForm не штовхає батька на кожному рендері", () => {
  it("перемальовування батька не викликає onSelectionChange повторно", () => {
    const onSelectionChange = vi.fn();
    renderInParent(onSelectionChange);

    fireEvent.click(screen.getByText("Пастка й обмін"));
    fireEvent.click(screen.getByText("Наказ атакувати"));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ oldId: 1, newId: 3 });

    const callsAfterSelection = onSelectionChange.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Перемалювати/ }));
    fireEvent.click(screen.getByRole("button", { name: /Перемалювати/ }));

    expect(onSelectionChange.mock.calls.length).toBe(callsAfterSelection);
  });
});
