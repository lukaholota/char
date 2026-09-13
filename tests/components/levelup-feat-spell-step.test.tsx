// @vitest-environment jsdom
//
// KR31.5 — крок «Заклинання риси»: Доторк феї дає обрати одне заклинання 1-го рівня з Ворожіння
// або Причарування. Кнопка «Далі» відкривається рівно тоді, коли обрано стільки, скільки просить риса.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import LevelUpFeatSpellStep from "@/lib/components/levelUp/LevelUpFeatSpellStep";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";

afterEach(cleanup);

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

const offer: FeatSpellChoiceOffer = {
  count: 1,
  spells: [
    { spellId: 11, name: "Виявлення магії", engName: "Detect Magic", level: 1, school: "DIVINATION" },
    { spellId: 12, name: "Зачарування особи", engName: "Charm Person", level: 1, school: "ENCHANTMENT" },
    { spellId: 13, name: "Благословення", engName: "Bless", level: 1, school: "ENCHANTMENT" },
  ],
};

function renderStep() {
  usePersFormStore.setState({ formData: {} as never, isHydrated: true });
  const onNextDisabledChange = vi.fn();
  render(<LevelUpFeatSpellStep featLabel="Доторк феї" offer={offer} onNextDisabledChange={onNextDisabledChange} />);
  return onNextDisabledChange;
}

describe("KR31.5 — крок вибору заклинання риси", () => {
  it("заклинання згруповані за школою", () => {
    renderStep();

    expect(within(screen.getByRole("region", { name: "Ворожіння" })).getByText("Виявлення магії")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Причарування" })).getAllByRole("button", { pressed: false })).toHaveLength(2);
  });

  it("без вибору «Далі» закрите, з вибором — відкрите, і обране лягає у форму", () => {
    const onNextDisabledChange = renderStep();
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: /^Зачарування особи/ }));

    expect(onNextDisabledChange).toHaveBeenLastCalledWith(false);
    expect(usePersFormStore.getState().formData.featSpellIds).toEqual([12]);
  });

  it("при виборі одного заклинання інше натискання замінює, а не додає друге", () => {
    renderStep();

    fireEvent.click(screen.getByRole("button", { name: /^Зачарування особи/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Благословення/ }));

    expect(usePersFormStore.getState().formData.featSpellIds).toEqual([13]);
  });
});
