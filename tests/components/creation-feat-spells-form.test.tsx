// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";

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

const spell = (spellId: number, name: string, level: number) => ({ spellId, name, engName: name, level, school: "EVOCATION" });

const initiateOffer: FeatSpellChoiceOffer = {
  picks: [
    { count: 2, spellLevel: 0, spells: [spell(1, "Світло", 0), spell(2, "Вогняний снаряд", 0), spell(3, "Магічна рука", 0), spell(4, "Чудотворство", 0), spell(5, "Напрям", 0)] },
    { count: 1, spellLevel: 1, spells: [spell(11, "Щит", 1), spell(12, "Сон", 1)] },
  ],
};

vi.mock("@/lib/actions/feat-spell-actions", () => ({ getCreationFeatSpellOffer: vi.fn(async () => initiateOffer) }));

import CreationFeatSpellsForm from "@/lib/components/characterCreator/CreationFeatSpellsForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

afterEach(cleanup);

const feats = [
  { source: "BACKGROUND_ORIGIN" as const, featId: 7, featName: "MAGIC_INITIATE", selections: { "Список заклинань": 70 } },
  { source: "SPECIES_VERSATILITY" as const, featId: 7, featName: "MAGIC_INITIATE", selections: { "Список заклинань": 71 } },
];

function findFeatCard(sourceLabel: string) {
  return screen.getByText(new RegExp(sourceLabel)).closest("div.glass-card") as HTMLElement;
}

const click = (card: HTMLElement, region: string, spellName: string) =>
  fireEvent.click(within(within(card).getByRole("region", { name: region })).getByRole("button", { name: new RegExp(`^${spellName}`) }));

describe("KR31.5 — крок «Заклинання риси» конструктора 2024 (L07-spellcasting-04)", () => {
  it("дві риси «Посвячений у магію»: обране класом і першою рисою другій не пропонується, «Далі» — лише з обома", async () => {
    usePersFormStore.setState({ formData: { classSpells: { cantripIds: [3], preparedIds: [], spellbookIds: [] } } as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<CreationFeatSpellsForm feats={feats} formId="feat-spells" onNextDisabledChange={onNextDisabledChange} />);

    await waitFor(() => expect(screen.getAllByRole("region", { name: "Замовляння" })).toHaveLength(2));
    const background = findFeatCard("від передісторії");
    const species = findFeatCard("від виду");
    expect(within(background).queryByRole("button", { name: /^Магічна рука/ })).toBeNull();

    click(background, "Замовляння", "Світло");
    click(background, "Замовляння", "Вогняний снаряд");
    click(background, "Заклинання 1-го рівня", "Щит");
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);
    expect(within(species).queryByRole("button", { name: /^Світло/ })).toBeNull();

    click(species, "Замовляння", "Чудотворство");
    click(species, "Замовляння", "Напрям");
    click(species, "Заклинання 1-го рівня", "Сон");
    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.featSpellSelections).toEqual({ BACKGROUND_ORIGIN: [1, 2, 11], SPECIES_VERSATILITY: [4, 5, 12] });
  });

  it("Р38: заклинання лише в книзі чарівника риса взяти може, а підготовлене класом — ні", async () => {
    usePersFormStore.setState({ formData: { classSpells: { cantripIds: [], preparedIds: [12], spellbookIds: [11, 12] } } as never, isHydrated: true });
    render(<CreationFeatSpellsForm feats={[feats[0]]} formId="feat-spells" />);

    await waitFor(() => expect(screen.getAllByRole("region", { name: "Заклинання 1-го рівня" })).toHaveLength(1));
    const background = findFeatCard("від передісторії");
    expect(within(background).getByRole("button", { name: /^Щит/ })).toBeTruthy();
    expect(within(background).queryByRole("button", { name: /^Сон/ })).toBeNull();
  });
});
