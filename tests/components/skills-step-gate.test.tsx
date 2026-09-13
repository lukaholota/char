// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import SkillsForm from "@/lib/components/characterCreator/SkillsForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

/// KR31.12 / P4-regression-2014-07. Крок пускав далі з невитраченими класовими виборами, і
/// чарівник виходив без двох володінь навичками — на листі це вже не лагодиться. Рішення
/// власника 2026-09-06: «Далі» неактивна, доки вибори не витрачені.

afterEach(cleanup);

// Radix-примітиви міряють вузол через ResizeObserver, якого в jsdom немає.
vi.hoisted(() => {
  class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: NoopResizeObserver,
  });

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

const WIZARD = {
  classId: 15,
  name: "WIZARD_2014",
  ruleset: "RULES_2014",
  skillProficiencies: { options: ["ARCANA", "HISTORY", "INSIGHT", "INVESTIGATION"], choiceCount: 2 },
} as unknown as ClassI;

const HUMAN = {
  raceId: 4,
  name: "HUMAN_2014",
  ruleset: "RULES_2014",
  skillProficiencies: null,
  raceChoiceOptions: [],
} as unknown as RaceI;

const SAGE = {
  backgroundId: 1,
  name: "SAGE",
  ruleset: "RULES_2014",
  skillProficiencies: ["ARCANA", "HISTORY"],
} as unknown as BackgroundI;

function renderSkillsStep(selectedClassSkills: string[]) {
  const onNextDisabledChange = vi.fn();

  usePersFormStore.setState({
    formData: {
      classId: WIZARD.classId,
      raceId: HUMAN.raceId,
      backgroundId: SAGE.backgroundId,
      basicChoices: { selectedClass: selectedClassSkills, race: [], background: [] },
    } as never,
    isHydrated: true,
  });

  render(
    <SkillsForm
      race={HUMAN}
      selectedClass={WIZARD}
      background={SAGE}
      formId="skills-form"
      onNextDisabledChange={onNextDisabledChange}
    />,
  );

  return onNextDisabledChange;
}

function lastDisabledState(onNextDisabledChange: ReturnType<typeof vi.fn>): boolean {
  const calls = onNextDisabledChange.mock.calls;
  return calls[calls.length - 1]?.[0] as boolean;
}

describe("крок «Навички» конструктора", () => {
  it("не пускає далі, поки жодної класової навички не обрано", () => {
    expect(lastDisabledState(renderSkillsStep([]))).toBe(true);
  });

  it("не пускає далі з частково витраченим вибором", () => {
    expect(lastDisabledState(renderSkillsStep(["ARCANA"]))).toBe(true);
  });

  it("пускає далі, коли обрано рівно стільки, скільки дає клас", () => {
    expect(lastDisabledState(renderSkillsStep(["ARCANA", "HISTORY"]))).toBe(false);
  });
});
