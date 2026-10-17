// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { findCharacterCreationOptions } from "@/lib/content/creator-content";
import { MultiStepForm } from "@/lib/components/characterCreator/MultiStepForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { encodeDraftLink } from "@/lib/utils/draft-link";

const offer = vi.hoisted(() => ({ continueWithLinkedDraft: null as null | (() => void) }));

// The draft store binds to localStorage on import, so the stub has to be in place before it loads.
vi.hoisted(() => {
  for (const name of ["localStorage", "sessionStorage"]) {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
      key: (index: number) => [...entries.keys()][index] ?? null,
      get length() {
        return entries.size;
      },
    };
    Object.defineProperty(globalThis, name, { value: storage, configurable: true });
  }
});

vi.mock("@/lib/actions/character", () => ({ createCharacter: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "unauthenticated" }), signIn: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/char/create" }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: vi.fn(), isPostHogEnabled: () => false, configurePostHogBootstrap: vi.fn(), registerPostHogSuperProperties: vi.fn(), findPostHogIds: () => ({ distinctId: null, sessionId: null }), flushPostHogOnExit: vi.fn() }));
vi.mock("@/lib/components/characterCreator/RacesForm", () => ({ default: () => <p>races step</p> }));
vi.mock("@/lib/components/characterCreator/offer-linked-draft", () => ({ offerLinkedDraft: (accept: () => void) => void (offer.continueWithLinkedDraft = accept) }));

type MultiStepFormProps = ComponentProps<typeof MultiStepForm>;

const content = findCharacterCreationOptions("RULES_2014");
const [localClass, linkedClass] = content.classes;

async function openCreatorWithLink(linked: { formData: Record<string, unknown>; currentStep: number }) {
  localStorage.setItem("dnd-pers-form", JSON.stringify({ state: { formData: { classId: localClass.classId, ruleset: "RULES_2014" }, currentStep: 1, totalSteps: 9 }, version: 1 }));
  await usePersFormStore.persist.rehydrate();
  const encoded = await encodeDraftLink({ scope: "CREATOR_2014", totalSteps: 9, ...linked });
  window.history.replaceState({}, "", `/char/create#draft=${encoded}`);
  render(<MultiStepForm
    initialRuleset="RULES_2014"
    races={content.races as unknown as MultiStepFormProps["races"]}
    classes={content.classes as unknown as MultiStepFormProps["classes"]}
    backgrounds={content.backgrounds as unknown as MultiStepFormProps["backgrounds"]}
    weapons={content.weapons}
    feats={content.feats as unknown as MultiStepFormProps["feats"]}
  />);
  await screen.findByText("Оберіть клас");
  await waitFor(() => expect(offer.continueWithLinkedDraft).toBeTypeOf("function"));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  offer.continueWithLinkedDraft = null;
});

afterEach(cleanup);

describe("«Продовжити» в конструкторі замінює чернетку повністю", () => {
  it("крок на екрані не дописує свої значення в чернетку з посилання", async () => {
    const linkedFormData = { classId: linkedClass.classId, raceId: content.races[0].raceId, ruleset: "RULES_2014" };
    await openCreatorWithLink({ formData: linkedFormData, currentStep: 2 });

    act(() => offer.continueWithLinkedDraft!());

    await screen.findByText("races step");
    expect(usePersFormStore.getState().formData).toMatchObject(linkedFormData);
  });

  it("крок, що лишається на екрані, бере значення з посилання, а не свої", async () => {
    await openCreatorWithLink({ formData: { raceId: content.races[0].raceId, ruleset: "RULES_2014" }, currentStep: 1 });

    act(() => offer.continueWithLinkedDraft!());
    fireEvent.submit(document.getElementById("character-step-form-1")!);

    await waitFor(() => expect(usePersFormStore.getState().formData.classId).toBeUndefined());
    expect(usePersFormStore.getState().currentStep).toBe(1);
  });
});
