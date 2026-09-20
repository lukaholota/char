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

const spell = (spellId: number, name: string, level: number) => ({ spellId, name, engName: name, level, school: "EVOCATION", spellLists: ["Чарівник"] });

const wizardOffer: ClassSpellOffer = {
  className: "WIZARD_2024",
  classLabel: "Чарівник",
  quota: { cantrips: 1, prepared: 2, spellbook: 3, maxSpellLevel: 1 },
  cantrips: [spell(1, "Вогняний снаряд", 0), spell(2, "Магічна рука", 0)],
  spells: [spell(11, "Щит", 1), spell(12, "Сон", 1), spell(13, "Чарівна стріла", 1), spell(14, "Обладунок мага", 1)],
  bookSpells: [],
  bookOnlySpellIds: [],
  ruleset: "RULES_2024",
  catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
  swap: null,
  canSkipPrepared: false,
};

vi.mock("@/lib/actions/class-actions", () => ({ getCreationSpellOffer: vi.fn(async () => wizardOffer), getCreationClassOptionSpellOffer: vi.fn(async () => null) }));

import { getCreationSpellOffer } from "@/lib/actions/class-actions";
import CreationSpellsForm from "@/lib/components/characterCreator/CreationSpellsForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";

afterEach(cleanup);

async function renderForm() {
  usePersFormStore.setState({ formData: { classChoiceSelections: {} } as never, isHydrated: true });
  const onNextDisabledChange = vi.fn();
  render(<CreationSpellsForm selectedClass={{ classId: 350, name: "WIZARD_2024" } as never} formId="spells-form" onNextDisabledChange={onNextDisabledChange} />);
  await screen.findByRole("region", { name: "Книга заклинань" });
  return onNextDisabledChange;
}

const section = (name: string) => within(screen.getByRole("region", { name }));
const click = (name: string, spellName: string) => fireEvent.click(section(name).getByRole("button", { name: new RegExp(`^${spellName}`) }));

describe("KR31.5 — крок «Заклинання» конструктора 2024 (P6-class-sweep-level1-07)", () => {
  it("чарівник готує лише з книги: до книги підготовлених не запропоновано", async () => {
    await renderForm();

    expect(section("Підготовлені заклинання").getByText(/Спершу оберіть заклинання до книги/)).toBeTruthy();

    click("Книга заклинань", "Щит");
    click("Книга заклинань", "Сон");

    expect(section("Підготовлені заклинання").getAllByRole("button", { pressed: false }).map((button) => button.getAttribute("aria-label"))).toEqual(["Щит", "Сон"]);
  });

  it("«Далі» відкривається лише з повним вибором у кожній групі", async () => {
    const onNextDisabledChange = await renderForm();
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);

    click("Замовляння", "Вогняний снаряд");
    click("Книга заклинань", "Щит");
    click("Книга заклинань", "Сон");
    click("Книга заклинань", "Чарівна стріла");
    expect(section("Книга заклинань").getByRole("button", { name: /^Обладунок мага/ })).toHaveProperty("disabled", true);
    click("Підготовлені заклинання", "Щит");
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);

    click("Підготовлені заклинання", "Сон");

    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.classSpells).toEqual({ cantripIds: [1], spellbookIds: [11, 12, 13], preparedIds: [11, 12] });
  });

  it("заклинання, прибране з книги, зникає й з підготовлених", async () => {
    await renderForm();

    click("Книга заклинань", "Щит");
    click("Книга заклинань", "Сон");
    click("Підготовлені заклинання", "Щит");
    click("Книга заклинань", "Щит");

    expect(usePersFormStore.getState().formData.classSpells?.preparedIds).toEqual([]);
  });
});

describe("крок «Заклинання» конструктора 2014 — підклас 1-го рівня", () => {
  it("шле підклас і його вибори: покровитель додає розширений список, рід Джина його звужує", async () => {
    usePersFormStore.setState({ formData: { classChoiceSelections: { invocation: 3 }, subclassId: 44, subclassChoiceSelections: { genieKind: 7 } } as never, isHydrated: true });
    render(<CreationSpellsForm selectedClass={{ classId: 120, name: "WARLOCK_2014" } as never} formId="spells-form" />);

    await waitFor(() => expect(vi.mocked(getCreationSpellOffer)).toHaveBeenLastCalledWith(120, [3, 7], 44));
  });
});
