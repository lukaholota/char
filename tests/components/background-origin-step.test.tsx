// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MultiStepForm } from "@/lib/components/characterCreator/MultiStepForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

vi.mock("@/lib/actions/character", () => ({ createCharacter: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "unauthenticated" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/2024/char" }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/lib/components/characterCreator/RacesForm", () => ({ default: () => null }));
vi.mock("@/lib/stores/persFormStore", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/stores/persFormStore")>(),
  useCreatorDraftStorage: () => true,
}));

type Props = ComponentProps<typeof MultiStepForm>;

function renderCreator(ruleset: Props["initialRuleset"], selectedFeatId?: number, hasChoices = true) {
  usePersFormStore.setState({
    formData: { backgroundId: 1, backgroundFeatId: selectedFeatId, ruleset },
    currentStep: 1,
    isHydrated: true,
  });
  render(<MultiStepForm
    initialRuleset={ruleset}
    races={[]}
    classes={[]}
    weapons={[]}
    backgrounds={[{ backgroundId: 1, originFeatId: 10, gainsFeats: [] }] as Props["backgrounds"]}
    feats={[{ featId: 10, featChoiceOptions: hasChoices ? [{ choiceOptionId: 100 }] : [] }] as Props["feats"]}
  />);
}

beforeEach(() => {
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  usePersFormStore.getState().resetForm();
});
afterEach(cleanup);

describe("KR31.2 — опції фіксованої риси походження в майстрі", () => {
  it("показує опції риси 2024 без окремого вибору самої риси", () => {
    renderCreator("RULES_2024");
    expect(screen.getByTestId("creation-step-backgroundFeatChoices")).toBeTruthy();
    expect(screen.queryByTestId("creation-step-backgroundFeat")).toBeNull();
  });

  it("не додає порожнього кроку, якщо фіксована риса не має опцій", () => {
    renderCreator("RULES_2024", undefined, false);
    expect(screen.queryByTestId("creation-step-backgroundFeatChoices")).toBeNull();
  });

  it("у 2014 не бере originFeatId замість вибору гравця", () => {
    renderCreator("RULES_2014");
    expect(screen.queryByTestId("creation-step-backgroundFeatChoices")).toBeNull();
  });

  it("зберігає опції явно обраної риси походження 2014", () => {
    renderCreator("RULES_2014", 10);
    expect(screen.getByTestId("creation-step-backgroundFeatChoices")).toBeTruthy();
  });
});
