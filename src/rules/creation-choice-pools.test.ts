import { describe, expect, it } from "vitest";
import { findCreationChoicePoolProblem } from "./creation-choice-pools";

const available = [1, 2, 3, 4].map((choiceOptionId) => ({
  choiceOptionId,
  groupName: "Класові інструменти",
}));

describe("KR31.2 — перевірка class choices під час створення", () => {
  it("вимагає точну кількість різних опцій у 2024", () => {
    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: "BARD_2024",
      selections: { "Класові інструменти": [1] },
      available,
    })).toBe("Оберіть 3 опц.");

    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: "BARD_2024",
      selections: { "Класові інструменти": [1, 2, 3] },
      available,
    })).toBeNull();

    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: "BARD_2024",
      selections: { "Класові інструменти": [1, 1, 2] },
      available,
    })).toBe("Опції в групі мають бути різними");
  });

  it("відхиляє опцію, якої клас не має", () => {
    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: "MONK_2024",
      selections: { "Класові інструменти": 99 },
      available,
    })).toBe("Обрана опція недоступна на цьому рівні");
  });

  it("не дозволяє винести додатковий валідний ID у вигадану групу", () => {
    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: "BARD_2024",
      selections: {
        "Класові інструменти": [1, 2, 3],
        "Ще один інструмент": 4,
      },
      available,
    })).toBe("Обрана опція не з тієї групи");
  });

  it("не змінює приймання пакетів 2014", () => {
    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2014",
      className: "BARD_2014",
      selections: {},
      available,
    })).toBeNull();
  });

  it("ігнорує порожні масиви від форми", () => {
    expect(findCreationChoicePoolProblem({
      ruleset: "RULES_2024",
      className: "ROGUE_2024",
      selections: { "Класові інструменти": [] },
      available: [],
    })).toBeNull();
  });
});
