import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useStepForm", () => ({
  useStepForm: () => ({
    form: {
      setValue: vi.fn(),
      watch: () => ({ "Бойовий стиль": 1 }),
    },
    onSubmit: vi.fn(),
  }),
}));

vi.mock("@/lib/stores/persFormStore", () => ({
  usePersFormStore: () => ({
    formData: {},
    nextStep: vi.fn(),
    updateFormData: vi.fn(),
  }),
}));

import ClassChoiceOptionsForm from "./ClassChoiceOptionsForm";

const choiceOptions = [
  {
    choiceOptionId: 1,
    choiceOption: {
      optionName: "Захист",
      optionNameEng: "Defense",
      groupName: "Бойовий стиль",
      features: [],
    },
  },
  {
    choiceOptionId: 2,
    choiceOption: {
      optionName: "Дуель",
      optionNameEng: "Dueling",
      groupName: "Бойовий стиль",
      prerequisites: { level: 2 },
      features: [],
    },
  },
] as never;

describe("ClassChoiceOptionsForm", () => {
  it("не додає службовий ключ до назви інструмента", () => {
    const markup = renderToStaticMarkup(createElement(ClassChoiceOptionsForm, { formId: "tools", availableOptions: [{
      choiceOptionId: 3649, choiceOption: { groupName: "Класові інструменти", optionName: "Кухарське начиння",
        optionNameEng: "Class Tool 2024 (MONK_2024: COOKS_UTENSILS)", features: [{ feature: {
          name: "Кухарське начиння", engName: "Tool Proficiency: COOKS_UTENSILS (2024)", description: "Ви володієте інструментом.",
        } }],
      },
    }] as never }));
    expect(markup).toContain("Кухарське начиння");
    expect(markup).not.toContain("[COOKS_UTENSILS]");
    expect(markup).toContain("Це володіння інструментом");
  });
  it("renders selected and unavailable class choices with their group count", () => {
    const markup = renderToStaticMarkup(createElement(ClassChoiceOptionsForm, {
      availableOptions: choiceOptions,
      formId: "class-options",
    }));

    expect(markup).toContain("Бойовий стиль");
    expect(markup).toContain("Обрано: 1/1");
    expect(markup).toMatch(/glass-card[^\"]*glass-active/);
    expect(markup).toContain("Потрібен 2 рівень цього класу");
    expect(markup).toContain("Інформація про Дуель");
  });
});
