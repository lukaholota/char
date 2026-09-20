// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";

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

const spell = (spellId: number, name: string, level: number) => ({ spellId, name, engName: name, level, school: "EVOCATION", spellLists: ["Чорнокнижник"] });

const warlockOffer: ClassSpellOffer = {
  className: "WARLOCK_2024",
  classLabel: "Чорнокнижник",
  quota: { cantrips: 1, prepared: 1, spellbook: 0, maxSpellLevel: 1 },
  cantrips: [spell(1, "Моторошний заряд", 0), spell(2, "Світло", 0)],
  spells: [spell(11, "Прокляття", 1)],
  bookSpells: [],
  bookOnlySpellIds: [],
  ruleset: "RULES_2024",
  catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
  swap: null,
  canSkipPrepared: false,
};

const tomeOffer = {
  sourceName: "Pact of the Tome (2024)",
  label: "Книга тіней",
  offer: {
    picks: [
      { count: 1, spellLevel: 0, spells: [spell(2, "Світло", 0), spell(3, "Лагодження", 0)] },
      { count: 1, spellLevel: 1, spells: [spell(21, "Виявлення магії", 1)] },
    ],
  },
};

vi.mock("@/lib/actions/class-actions", () => ({
  getCreationSpellOffer: vi.fn(async () => warlockOffer),
  getCreationClassOptionSpellOffer: vi.fn(async () => tomeOffer),
}));

import CreationSpellsForm from "@/lib/components/characterCreator/CreationSpellsForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

afterEach(cleanup);

const click = (region: string, spellName: string) =>
  fireEvent.click(within(screen.getAllByRole("region", { name: region })[0]).getByRole("button", { name: new RegExp(`^${spellName}`) }));

describe("Pact of the Tome 2024 — Книга тіней у кроці «Заклинання» конструктора", () => {
  it("«Далі» відкривається лише з повною Книгою тіней, а обране класом до книги не пропонується", async () => {
    usePersFormStore.setState({ formData: { classChoiceSelections: { "Потойбічні виклики": 7 } } as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<CreationSpellsForm selectedClass={{ classId: 349, name: "WARLOCK_2024" } as never} formId="spells-form" onNextDisabledChange={onNextDisabledChange} />);
    const book = await screen.findByRole("region", { name: "Книга тіней" });

    click("Замовляння", "Світло");
    click("Підготовлені заклинання", "Прокляття");
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);
    expect(within(book).queryByRole("button", { name: /^Світло/ })).toBeNull();

    fireEvent.click(within(book).getByRole("button", { name: /^Лагодження/ }));
    fireEvent.click(within(book).getByRole("button", { name: /^Виявлення магії/ }));

    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.classOptionSpellIds).toEqual([3, 21]);
  });
});
