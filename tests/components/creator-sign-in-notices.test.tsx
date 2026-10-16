// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MultiStepForm } from "@/lib/components/characterCreator/MultiStepForm";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import { CreationFooter } from "@/lib/components/characterCreator/CreationFooter";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";

vi.mock("@/lib/actions/character", () => ({ createCharacter: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "unauthenticated" }), signIn: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/char/create" }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/lib/components/characterCreator/RacesForm", () => ({ default: () => null }));
vi.mock("@/lib/stores/persFormStore", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/stores/persFormStore")>(),
  useCreatorDraftStorage: () => true,
}));

type Props = ComponentProps<typeof MultiStepForm>;
const SIGN_IN_AT_END = /наприкінці знадобиться вхід через Google/;
const DRAFT_KEPT = /Ваші вибори збережені\. Після входу ви повернетеся сюди/;

function renderCreator(ruleset: "RULES_2014" | "RULES_2024", currentStep: number) {
  const content = findCharacterCreationOptions(ruleset);
  const fighter = content.classes[0];
  usePersFormStore.setState({ formData: { classId: fighter.classId, ruleset }, currentStep, isHydrated: true });
  render(<MultiStepForm
    initialRuleset={ruleset}
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
});
afterEach(cleanup);

describe("creator tells a signed-out player about sign-in up front", () => {
  it("shows the sign-in-at-the-end line on the first step of the 2014 builder", () => {
    renderCreator("RULES_2014", 1);

    expect(screen.getByText(SIGN_IN_AT_END)).toBeTruthy();
  });

  it("drops the line after the first step", () => {
    renderCreator("RULES_2014", 2);

    expect(screen.queryByText(SIGN_IN_AT_END)).toBeNull();
  });

  it("does not show the line in the 2024 builder", () => {
    renderCreator("RULES_2024", 1);

    expect(screen.queryByText(SIGN_IN_AT_END)).toBeNull();
  });
});

describe("sign-in dialog opened from the builder", () => {
  it("says the choices are saved and the player returns here", () => {
    render(<GoogleAuthDialog open onOpenChange={() => {}} isFromCreatorDraft />);

    expect(screen.getByText(DRAFT_KEPT)).toBeTruthy();
  });

  it("keeps the generic text elsewhere", () => {
    render(<GoogleAuthDialog open onOpenChange={() => {}} />);

    expect(screen.queryByText(DRAFT_KEPT)).toBeNull();
  });
});

describe("creator step bar", () => {
  it("is opaque so card text does not show through it", () => {
    const { container } = render(
      <CreationFooter stepNumber={2} stepCount={8} stepTitle="Раса" activeFormId="form" isNextBlocked={false} nextStepHint={null} isSubmitting={false} onPrev={() => {}} />,
    );

    const panel = container.querySelector(".border-gradient-rpg");
    expect(panel?.classList.contains("bg-slate-950")).toBe(true);
    expect(panel?.className).not.toMatch(/glass-panel|backdrop-blur|bg-\S+\/\d+/);
  });
});
