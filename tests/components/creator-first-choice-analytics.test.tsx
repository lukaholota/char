// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MultiStepForm } from "@/lib/components/characterCreator/MultiStepForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";

const analytics = vi.hoisted(() => ({ captureCreationFirstChoice: vi.fn() }));

vi.mock("@/lib/actions/character", () => ({ createCharacter: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "unauthenticated" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/char/create" }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/lib/components/characterCreator/RacesForm", () => ({ default: () => null }));
vi.mock("@/lib/monitoring/funnel-analytics", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/monitoring/funnel-analytics")>(),
  captureCreationFirstChoice: analytics.captureCreationFirstChoice,
}));
vi.mock("@/lib/stores/persFormStore", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/stores/persFormStore")>(),
  useCreatorDraftStorage: () => true,
}));

type Props = ComponentProps<typeof MultiStepForm>;
const content = findCharacterCreationOptions("RULES_2014");

function renderCreatorWithClass() {
  usePersFormStore.setState({ formData: { classId: content.classes[0].classId, ruleset: "RULES_2014" }, currentStep: 1, isHydrated: true });
  render(<MultiStepForm
    initialRuleset="RULES_2014"
    races={content.races as unknown as Props["races"]}
    classes={content.classes as unknown as Props["classes"]}
    backgrounds={content.backgrounds as unknown as Props["backgrounds"]}
    weapons={content.weapons}
    feats={content.feats as unknown as Props["feats"]}
  />);
}

beforeEach(() => {
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  usePersFormStore.getState().resetForm();
  sessionStorage.clear();
  analytics.captureCreationFirstChoice.mockClear();
});
afterEach(cleanup);

describe("character_creation_first_choice у майстрі", () => {
  it("не рахує автоперехід з гайда RPGbot, але рахує наступний крок гравця", () => {
    sessionStorage.setItem("rpgbot-creator-step", JSON.stringify({ ruleset: "RULES_2014", stepId: "asi" }));
    renderCreatorWithClass();

    expect(usePersFormStore.getState().currentStep).toBeGreaterThan(1);
    expect(sessionStorage.getItem("rpgbot-creator-step")).toBeNull();
    expect(analytics.captureCreationFirstChoice).not.toHaveBeenCalled();

    act(() => usePersFormStore.getState().nextStep());
    expect(analytics.captureCreationFirstChoice).toHaveBeenCalledTimes(1);
    expect(analytics.captureCreationFirstChoice).toHaveBeenCalledWith("2014");
  });

  it("рахує перший «Далі» без гайда", () => {
    renderCreatorWithClass();
    expect(analytics.captureCreationFirstChoice).not.toHaveBeenCalled();

    act(() => usePersFormStore.getState().nextStep());
    expect(analytics.captureCreationFirstChoice).toHaveBeenCalledTimes(1);
  });
});
