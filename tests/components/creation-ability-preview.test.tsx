// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import FeatChoiceOptionsForm from "@/lib/components/characterCreator/FeatChoiceOptionsForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatPrisma } from "@/lib/types/model-types";

/// KR31.12 / BUG-012. Превʼю на кроці «Опції риси» рахувало base 10 + ASI й не бачило раси:
/// раса з +2 СПР і риса Skill Expert показували «14 → 15» замість «16 → 17». Конструктор тепер
/// передає бали, пораховані канонічним `buildCreationAbilityScores`.

afterEach(cleanup);

// Той самий шим, що й у levelup-ability-ceiling: раннер не дає jsdom робочого localStorage,
// а zustand-persist забирає сховище в мить імпорту.
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

const SKILL_EXPERT = {
  featId: 3001,
  name: "SKILL_EXPERT",
  category: "GENERAL",
  grantsFeature: [],
  featChoiceOptions: [
    {
      choiceOption: {
        choiceOptionId: 9001,
        groupName: "Характеристика",
        optionName: "Спритність",
        optionNameEng: "Skill Expert Ability (Dexterity)",
        description: "",
      },
    },
  ],
} as unknown as FeatPrisma;

/// Спритність 14 у формі — це бал до раси; раса з +2 робить із нього 16.
const FORM_ASI = [
  { ability: "STR", value: 10 },
  { ability: "DEX", value: 14 },
  { ability: "CON", value: 12 },
  { ability: "INT", value: 10 },
  { ability: "WIS", value: 10 },
  { ability: "CHA", value: 10 },
];

function renderFeatChoices(baseAbilityScores?: Record<string, number>) {
  usePersFormStore.setState({
    formData: { featId: SKILL_EXPERT.featId, asiSystem: "POINT_BUY", asi: FORM_ASI } as never,
    isHydrated: true,
  });

  return render(
    <FeatChoiceOptionsForm
      selectedFeat={SKILL_EXPERT}
      formId="feat-choices-form"
      baseAbilityScores={baseAbilityScores as never}
    />,
  );
}

describe("превʼю характеристики на кроці «Опції риси»", () => {
  it("показує бали з расовим бонусом, коли конструктор їх передав", () => {
    renderFeatChoices({ STR: 10, DEX: 16, CON: 12, INT: 10, WIS: 10, CHA: 10 });

    expect(screen.getByText(/16 → 17/)).toBeTruthy();
    expect(screen.queryByText(/14 → 15/)).toBeNull();
  });

  it("без переданих балів лишається старе наближення з форми", () => {
    renderFeatChoices(undefined);

    expect(screen.getByText(/14 → 15/)).toBeTruthy();
  });
});
