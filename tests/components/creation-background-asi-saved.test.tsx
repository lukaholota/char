// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ASIForm } from "@/lib/components/characterCreator/ASIForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

/// Бонуси походження 2024 мають лишатися в чернетці, навіть коли гравець іде з кроку степером, а не «Далі»:
/// інакше «Створити» падає з «Оберіть бонуси характеристик від походження», а повернення на крок показує порожньо.

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

beforeEach(() => {
  usePersFormStore.setState({ formData: { asiSystem: "POINT_BUY" }, isHydrated: true });
});

function renderAsiStep() {
  return render(
    <ASIForm
      race={{ raceId: 1, ASI: {}, subraces: [] } as never}
      selectedClass={{ classId: 1, primaryCastingStat: null } as never}
      background={{ name: "SOLDIER_2024" as never, abilityOptions: ["STR", "DEX", "CON"] }}
      ruleset="RULES_2024"
      prevRaceId={1}
      setPrevRaceId={vi.fn()}
      formId="asi-form"
    />,
  );
}

describe("крок ASI 2024 зберігає бонуси походження без кнопки «Далі»", () => {
  it("вибір лишається в чернетці після виходу з кроку степером", () => {
    const step = renderAsiStep();

    fireEvent.click(screen.getByRole("button", { name: "+1 до всіх трьох" }));
    step.unmount();

    expect(usePersFormStore.getState().formData.backgroundAsiChoice).toEqual({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] });
  });

  it("повернення на крок показує збережений вибір", () => {
    renderAsiStep().unmount();
    usePersFormStore.setState({ formData: { asiSystem: "POINT_BUY", backgroundAsiChoice: { mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] } } });

    renderAsiStep();

    expect(screen.getByText("По +1 кожній із трьох")).toBeTruthy();
  });
});
