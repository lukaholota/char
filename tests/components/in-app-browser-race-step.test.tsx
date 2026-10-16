// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RacesForm from "@/lib/components/characterCreator/RacesForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { RaceI } from "@/lib/types/model-types";

vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: vi.fn(), isPostHogEnabled: () => false, configurePostHogBootstrap: vi.fn(), registerPostHogSuperProperties: vi.fn(), findPostHogIds: () => ({ distinctId: null, sessionId: null }), flushPostHogOnExit: vi.fn() }));
vi.mock("@/lib/components/characterCreator/modals/RaceInfoModal", () => ({ RaceInfoModal: () => null }));

const THREADS_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 337.0.0.22.95 (iPhone15,3; iOS 17_5; uk_UA; uk; scale=3.00; 1290x2796; 615203047)";
const RACES = [{ raceId: 1, name: "HUMAN_2014", ruleset: "RULES_2014", sortOrder: 0 }] as RaceI[];

function submitRaceStep(path: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: THREADS_IOS, configurable: true });
  window.history.replaceState({}, "", path);
  const nextStep = vi.fn();
  usePersFormStore.setState({ formData: { raceId: 1 }, currentStep: 1, isHydrated: true, nextStep });
  const { container } = render(<RacesForm races={RACES} formId="race-form" />);
  fireEvent.submit(container.querySelector("form#race-form")!);
  return nextStep;
}

beforeEach(() => {
  window.sessionStorage.clear();
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
});
afterEach(cleanup);

describe("крок «Раса» у вбудованому браузері", () => {
  it("за замовчуванням не зупиняє гравця модальним вікном", async () => {
    const nextStep = submitRaceStep("/char/create");
    await waitFor(() => expect(nextStep).toHaveBeenCalled());
    expect(screen.queryByText("Краще відкрити у браузері зараз")).toBeNull();
  });

  it("контрольний варіант показує давнє вікно з посиланням на поточну сторінку", async () => {
    const nextStep = submitRaceStep("/2024/char?from=abc&inapp_variant=control");
    await screen.findByText("Краще відкрити у браузері зараз");
    expect(nextStep).not.toHaveBeenCalled();
    expect(screen.getByText("http://localhost:3000/2024/char?from=abc")).toBeTruthy();
  });
});
