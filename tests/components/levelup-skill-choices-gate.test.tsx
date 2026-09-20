// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { LevelUpSkillProficienciesForm } from "@/lib/components/levelUp/LevelUpSkillProficienciesForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

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

afterEach(cleanup);

const DEFT_EXPLORER = {
  featureId: 77,
  name: "Вправний дослідник",
  skillProficiencies: { choiceCount: 2, options: ["ATHLETICS", "NATURE", "PERCEPTION", "STEALTH", "SURVIVAL"] },
};

/// Левелап пускав далі з невитраченими виборами, і риса лишалася без навички — на листі це
/// вже не лагодиться. Те саме рішення, що й у конструкторі (2026-09-06), з однією поправкою:
/// коли всі запропоновані навички персонаж уже знає, вимагати нема чого.
function renderStep(extraExistingSkills: string[] = []) {
  const onNextDisabledChange = vi.fn();

  usePersFormStore.setState({
    formData: { levelUpSkillSelections: {} } as never,
    isHydrated: true,
  });

  render(
    <LevelUpSkillProficienciesForm
      activeFeatures={[DEFT_EXPLORER]}
      formId="levelup-skills"
      extraExistingSkills={extraExistingSkills}
      onNextDisabledChange={onNextDisabledChange}
    />
  );

  return () => onNextDisabledChange.mock.calls.at(-1)?.[0];
}

function clickSkill(label: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
}

describe("крок навичок у майстрі підвищення", () => {
  it("не пускає далі, поки вибори риси не витрачені", () => {
    const gate = renderStep();

    expect(gate()).toBe(true);

    clickSkill("Природа");
    expect(gate()).toBe(true);

    clickSkill("Уважність");
    expect(gate()).toBe(false);
  });

  it("не замикає крок, коли всі запропоновані навички персонаж уже знає", () => {
    const gate = renderStep(["ATHLETICS", "NATURE", "PERCEPTION", "STEALTH", "SURVIVAL"]);

    expect(gate()).toBe(false);
  });

  it("коли вільна лише одна навичка, чекає саме на неї", () => {
    const gate = renderStep(["ATHLETICS", "NATURE", "PERCEPTION", "STEALTH"]);

    expect(gate()).toBe(true);

    clickSkill("Виживання");
    expect(gate()).toBe(false);
  });
});
