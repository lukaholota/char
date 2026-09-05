// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import LevelUpASIForm from "@/lib/components/levelUp/LevelUpASIForm";
import LevelUpHPStep from "@/lib/components/levelUp/LevelUpHPStep";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatPrisma } from "@/lib/types/model-types";

/// KR27.9. Крок хітів рахує модифікатор Статури з підвищення, яке гравець щойно обрав, — тобто
/// сам застосовує стелю. Епічний дар підіймає її до 30, звичайна риса лишає 20.

afterEach(cleanup);

// Той самий шим, що й у equipment-step-2024: раннер не дає jsdom робочого localStorage, а
// zustand-persist забирає сховище в мить імпорту.
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

const feat = (fields: Record<string, unknown>) =>
  ({ featChoiceOptions: [], grantsFeature: [], ...fields }) as unknown as FeatPrisma;

const BOON_OF_FORTITUDE = feat({
  featId: 2997,
  name: "BOON_OF_FORTITUDE",
  category: "EPIC_BOON",
  grantedASI: { CON: 1 },
});

const DURABLE = feat({
  featId: 101,
  name: "DURABLE",
  category: "GENERAL",
  grantedASI: { CON: 1 },
});

/// Статура 21 — стан персонажа, який уже взяв епічний дар: наступне підвищення не має її знизити.
const baseStats = { str: 8, dex: 13, con: 21, int: 10, wis: 12, cha: 20 };

function renderHitPointStep(selectedFeat: FeatPrisma, ruleset: string) {
  usePersFormStore.setState({
    formData: { featId: selectedFeat.featId, levelUpHpMode: "AVERAGE", levelUpHpIncrease: 4 } as never,
    isHydrated: true,
  });

  render(
    <LevelUpHPStep
      hitDie={6}
      baseStats={baseStats}
      feats={[selectedFeat]}
      persFeats={[]}
      nextLevel={20}
      ruleset={ruleset}
      formId="hp-form"
    />,
  );
}

beforeEach(() => {
  usePersFormStore.setState({ formData: {}, isHydrated: true });
});

describe("KR27.9 — стеля характеристики на кроці хітів", () => {
  it("епічний дар 2024 доводить Статуру до 22 і показує модифікатор +6", () => {
    renderHitPointStep(BOON_OF_FORTITUDE, "RULES_2024");

    expect(screen.getByText("Мод. Статури: +6")).toBeTruthy();
  });

  it("звичайна риса стелі не підіймає: Статура лишається 21, модифікатор +5", () => {
    renderHitPointStep(DURABLE, "RULES_2024");

    expect(screen.getByText("Мод. Статури: +5")).toBeTruthy();
  });

  it("персонаж 2014 не переступає 20 навіть рисою категорії епічного дару", () => {
    renderHitPointStep(BOON_OF_FORTITUDE, "RULES_2014");

    expect(screen.getByText("Мод. Статури: +5")).toBeTruthy();
  });
});

describe("KR27.9 — крок епічного дару пропонує рису, а не підвищення", () => {
  const sorcerer19 = { persId: 1, ruleset: "RULES_2024", str: 8, dex: 13, con: 18, int: 10, wis: 12, cha: 20 };

  it("на 19-му рівні класу перемикача «Збільшити характеристики» немає", () => {
    render(
      <LevelUpASIForm
        feats={[BOON_OF_FORTITUDE]}
        race={undefined}
        subrace={undefined}
        formId="asi-form"
        levelAfter={19}
        pers={sorcerer19 as never}
        allowAbilityScoreIncrease={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Збільшити характеристики" })).toBeNull();
    expect(screen.queryByText("Розподіл (+2 або +1/+1)")).toBeNull();
  });

  it("на звичайному рівні ASI перемикач лишається", () => {
    render(
      <LevelUpASIForm
        feats={[BOON_OF_FORTITUDE]}
        race={undefined}
        subrace={undefined}
        formId="asi-form"
        levelAfter={16}
        pers={sorcerer19 as never}
      />,
    );

    expect(screen.getByRole("button", { name: "Збільшити характеристики" })).toBeTruthy();
  });
});
