// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MultiStepForm } from "@/lib/components/characterCreator/MultiStepForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import {
  findCharacterCreationOptions,
  findCharacterCreatorOptions,
} from "@/lib/content/creator-content";
import type { CreatorContent } from "@/server/db/creator-content-query";

vi.mock("@/lib/actions/character", () => ({ createCharacter: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "unauthenticated" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/char/create" }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/lib/components/characterCreator/RacesForm", () => ({ default: () => null }));
vi.mock("@/lib/stores/persFormStore", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/stores/persFormStore")>(),
  useCreatorDraftStorage: () => true,
}));

type Props = ComponentProps<typeof MultiStepForm>;
type Ruleset = "RULES_2014" | "RULES_2024";
type ClassPick = { classId: number; subclassId?: number };

function collectClassPicks(content: CreatorContent): ClassPick[] {
  return content.classes.flatMap((characterClass) => [
    { classId: characterClass.classId },
    ...characterClass.subclasses.map((subclass) => ({
      classId: characterClass.classId,
      subclassId: subclass.subclassId,
    })),
  ]);
}

function collectCreationStepIds(content: CreatorContent, ruleset: Ruleset, pick: ClassPick): string[] {
  usePersFormStore.setState({ formData: { ...pick, ruleset }, currentStep: 1, isHydrated: true });
  const { container, unmount } = render(<MultiStepForm
    initialRuleset={ruleset}
    races={content.races as unknown as Props["races"]}
    classes={content.classes as unknown as Props["classes"]}
    backgrounds={content.backgrounds as unknown as Props["backgrounds"]}
    weapons={content.weapons}
    feats={content.feats as unknown as Props["feats"]}
  />);
  const stepIds = [...container.querySelectorAll("[data-step-id]")].map((element) => element.getAttribute("data-step-id") ?? "");
  unmount();
  return stepIds;
}

beforeEach(() => {
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  usePersFormStore.getState().resetForm();
});
afterEach(cleanup);

describe("зріз графа першого рівня не змінює кроків майстра", () => {
  it.each(["RULES_2014", "RULES_2024"] as const)("%s: кожен клас і підклас", (ruleset) => {
    const full = findCharacterCreatorOptions(ruleset);
    const projected = findCharacterCreationOptions(ruleset);
    const picks = collectClassPicks(full);

    const mismatches = picks
      .map((pick) => ({
        pick,
        full: collectCreationStepIds(full, ruleset, pick),
        projected: collectCreationStepIds(projected, ruleset, pick),
      }))
      .filter((entry) => entry.full.join() !== entry.projected.join());

    expect(picks.length).toBeGreaterThan(40);
    expect(mismatches).toEqual([]);
  }, 60_000);
});
