// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ExpertiseForm } from "@/lib/components/characterCreator/ExpertiseForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, ClassI, RaceI } from "@/lib/types/model-types";

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

const EXPERTISE_FROM_PROFICIENCIES = [
  {
    featureId: 1,
    name: "Експертиза",
    skillExpertises: { count: 2, chooseFromCurrentProficiencies: true },
  },
];

/// Навички на крок експертизи приходять із кроку навичок, а той видає їх із чотирьох джерел.
/// Поки запасний шлях знав лише расу й клас, вибір за передісторію та за опцію раси зникав —
/// і розбійник із такими навичками бачив «Немає доступних навичок для експертизи».
describe("крок експертизи бачить навички з усіх джерел кроку навичок", () => {
  function renderWithSkillsSchema(skillsSchema: Record<string, unknown>) {
    usePersFormStore.setState({
      formData: { skillsSchema } as never,
      isHydrated: true,
    });

    render(
      <ExpertiseForm
        selectedClass={{ classId: 1, name: "ROGUE_2014" } as unknown as ClassI}
        race={{ raceId: 1, name: "HUMAN_2014" } as unknown as RaceI}
        background={{ backgroundId: 1, name: "SAGE" } as unknown as BackgroundI}
        activeFeatures={EXPERTISE_FROM_PROFICIENCIES}
        formId="expertise-sources"
      />
    );
  }

  it("навичка, обрана за передісторію, доступна для експертизи", () => {
    renderWithSkillsSchema({
      isTasha: false,
      basicChoices: { race: [], selectedClass: [], background: ["HISTORY"] },
      choiceOptions: {},
    });

    expect(screen.queryByRole("button", { name: /Історія/ })).not.toBeNull();
  });

  it("навичка, обрана в опції раси, доступна для експертизи", () => {
    renderWithSkillsSchema({
      isTasha: false,
      basicChoices: { race: [], selectedClass: [], background: [] },
      choiceOptions: { "42": ["STEALTH"] },
    });

    expect(screen.queryByRole("button", { name: /Непомітність/ })).not.toBeNull();
  });
});
