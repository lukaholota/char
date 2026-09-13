// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getAllCreatures } from "@/lib/bestiaryData";
import { WildshapeCard } from "@/lib/components/characterSheet/WildshapeCard";
import type { WildshapeState } from "@/lib/components/characterSheet/useWildshapeState";
import { enterWildshapeForm } from "@/server/db/wildshape-actions";
import { toast } from "sonner";

/// KR24.5. Перевтілення й лічильник стали однією дією, тож картка мусить показувати залишок там,
/// де стоїть кнопка, а попередження про порожній пул — доходити до гравця, а не лишатися числом
/// на іншому слайді.

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));
vi.mock("@/server/db/wildshape-actions", () => ({
  enterWildshapeForm: vi.fn(),
  detachWildshapeForm: vi.fn(),
  loadWildshapeForms: vi.fn(),
}));
/// Пікер — це `/bestiary` в iframe; тут перевіряється лічильник, а не він.
vi.mock("@/lib/components/characterSheet/AddWildshapeFormDialog", () => ({
  AddWildshapeFormDialog: () => null,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const bear = () => getAllCreatures("RULES_2014").find((creature) => creature.nameEng === "Brown Bear")!;

function buildState(overrides: Partial<WildshapeState> = {}): WildshapeState {
  return {
    forms: [
      {
        wildshapeId: 1,
        key: "brown-bear",
        ruleset: "RULES_2014",
        sortOrder: 0,
        notes: "",
        creature: bear(),
        eligibility: { eligible: true, reasons: [] },
      },
    ],
    standing: {
      druidLevel: 6,
      isMoonCircle: true,
      ruleset: "RULES_2014",
      limits: { maxChallengeRating: 2, allowsFlySpeed: false, allowsSwimSpeed: true },
      limitNotes: ["КР до 2"],
      knownFormsLimit: null,
    },
    active: null,
    uses: { featureId: 17928, price: 1, remaining: 1, max: 2, isUnlimited: false },
    isLoaded: true,
    isPending: false,
    reload: vi.fn(),
    ...overrides,
  };
}

describe("лічильник використань на картці Дикої форми", () => {
  it("залишок стоїть там само, де кнопка перевтілення", () => {
    const { container } = render(
      <WildshapeCard persId={1} persName="Друїд" wildshape={buildState()} />
    );

    expect(container.textContent).toContain("Використань 1 / 2");
    expect(screen.getByText("Перетворитися")).toBeDefined();
  });

  /// KR31.12 / L13-wildshape-08. Архідруїд 20 рівня 2014 має Дику форму без обмежень, а картка
  /// показувала «2 / 2» — інтерфейс обіцяв межу, якої немає.
  it("Архідруїд замість лічильника показує «без обмежень»", () => {
    render(
      <WildshapeCard
        persId={1}
        persName="Друїд"
        wildshape={buildState({
          uses: { featureId: 17928, price: 1, remaining: 2, max: 2, isUnlimited: true },
        })}
      />
    );

    expect(screen.getByText("Використань без обмежень")).toBeDefined();
    expect(screen.queryByText("Використань 2 / 2")).toBeNull();
  });

  it("персонаж без пулу лічильника не отримує — порожнього не малюємо", () => {
    const { container } = render(
      <WildshapeCard persId={1} persName="Друїд" wildshape={buildState({ uses: null })} />
    );

    expect(container.textContent).not.toContain("Використань");
  });
});

describe("попередження про порожній пул доходить до гравця", () => {
  it("вхід без залишку показує попередження сервера й не скасовує перевтілення", async () => {
    const warning =
      "Використань Дикої форми бракує: потрібно 1, лишилося 0. Перевтілення записане — вирішує майстер за столом.";
    vi.mocked(enterWildshapeForm).mockResolvedValue({
      ok: true,
      active: {
        wildshapeId: 1,
        key: "brown-bear",
        ruleset: "RULES_2014",
        creature: bear(),
        beastCurrentHp: 34,
        beastMaxHp: 34,
      },
      warnings: [warning],
    });
    const state = buildState({ uses: { featureId: 17928, price: 1, remaining: 0, max: 2, isUnlimited: false } });

    render(<WildshapeCard persId={1} persName="Друїд" wildshape={state} />);
    fireEvent.click(screen.getByText("Перетворитися"));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(warning));
    expect(toast.error).not.toHaveBeenCalled();
    expect(state.reload).toHaveBeenCalled();
  });

  it("вхід із залишком гравця не турбує", async () => {
    vi.mocked(enterWildshapeForm).mockResolvedValue({
      ok: true,
      active: {
        wildshapeId: 1,
        key: "brown-bear",
        ruleset: "RULES_2014",
        creature: bear(),
        beastCurrentHp: 34,
        beastMaxHp: 34,
      },
      warnings: [],
    });
    const state = buildState();

    render(<WildshapeCard persId={1} persName="Друїд" wildshape={state} />);
    fireEvent.click(screen.getByText("Перетворитися"));

    await waitFor(() => expect(state.reload).toHaveBeenCalled());
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
