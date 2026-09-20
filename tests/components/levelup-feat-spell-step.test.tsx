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
  picks: [
    {
      count: 1,
      spellLevel: 1,
      spells: [
        { spellId: 11, name: "Виявлення магії", engName: "Detect Magic", level: 1, school: "DIVINATION" },
        { spellId: 12, name: "Зачарування особи", engName: "Charm Person", level: 1, school: "ENCHANTMENT" },
        { spellId: 13, name: "Благословення", engName: "Bless", level: 1, school: "ENCHANTMENT" },
      ],
    },
  ],
};

const magicInitiateOffer: FeatSpellChoiceOffer = {
  picks: [
    {
      count: 2,
      spellLevel: 0,
      spells: [
        { spellId: 21, name: "Вогняний снаряд", engName: "Fire Bolt", level: 0, school: "EVOCATION" },
        { spellId: 22, name: "Магічна рука", engName: "Mage Hand", level: 0, school: "CONJURATION" },
        { spellId: 23, name: "Світло", engName: "Light", level: 0, school: "EVOCATION" },
      ],
    },
    {
      count: 1,
      spellLevel: 1,
      spells: [
        { spellId: 31, name: "Щит", engName: "Shield", level: 1, school: "ABJURATION" },
        { spellId: 32, name: "Сон", engName: "Sleep", level: 1, school: "ENCHANTMENT" },
      ],
    },
  ],
};

function renderStep(stepOffer: FeatSpellChoiceOffer = offer, featLabel = "Доторк феї") {
  usePersFormStore.setState({ formData: {} as never, isHydrated: true });
  const onNextDisabledChange = vi.fn();
  render(<LevelUpFeatSpellStep featLabel={featLabel} offer={stepOffer} onNextDisabledChange={onNextDisabledChange} />);
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

  it("«Посвячений у магію»: дві порції окремо, і «Далі» відкривається лише з обома (L07-spellcasting-04)", () => {
    const onNextDisabledChange = renderStep(magicInitiateOffer, "Посвячений у магію");
    const cantrips = within(screen.getByRole("region", { name: "Замовляння" }));
    const levelOne = within(screen.getByRole("region", { name: "Заклинання 1-го рівня" }));

    fireEvent.click(cantrips.getByRole("button", { name: /^Вогняний снаряд/ }));
    fireEvent.click(cantrips.getByRole("button", { name: /^Світло/ }));
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);
    expect(cantrips.getByRole("button", { name: /^Магічна рука/ }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(levelOne.getByRole("button", { name: /^Сон/ }));

    expect(onNextDisabledChange).toHaveBeenLastCalledWith(false);
    expect(usePersFormStore.getState().formData.featSpellIds).toEqual([21, 23, 32]);
  });

  it("Ritual Caster на рівні росту бонусу: вибір лягає окремим полем, а обране новою рисою не пропонується (L03-feats-11)", () => {
    usePersFormStore.setState({ formData: { featSpellIds: [11] } as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<LevelUpFeatSpellStep featLabel="Ритуальний заклинатель" offer={offer} field="featGrowthSpellIds" onNextDisabledChange={onNextDisabledChange} />);

    expect(screen.queryByRole("button", { name: /^Виявлення магії/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Благословення/ }));

    expect(onNextDisabledChange).toHaveBeenLastCalledWith(false);
    expect(usePersFormStore.getState().formData).toMatchObject({ featSpellIds: [11], featGrowthSpellIds: [13] });
  });
});
