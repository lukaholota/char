// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import { listOfferedSpells, pickSpell, removeSpell, section } from "../helpers/spell-picks-ui";

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

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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

describe("KR31.5 — крок «Заклинання» конструктора 2024 (P6-class-sweep-level1-07)", () => {
  it("чарівник готує лише з книги: до книги підготовлених не запропоновано", async () => {
    await renderForm();

    expect(section("Підготовлені заклинання").getByText(/Спершу оберіть заклинання до книги/)).toBeTruthy();

    pickSpell("Книга заклинань", "Щит");
    pickSpell("Книга заклинань", "Сон");

    expect(listOfferedSpells("Підготовлені заклинання")).toEqual(["Щит", "Сон"]);
  });

  it("«Далі» відкривається лише з повним вибором у кожній групі", async () => {
    const onNextDisabledChange = await renderForm();
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);

    pickSpell("Замовляння", "Вогняний снаряд");
    pickSpell("Книга заклинань", "Щит");
    pickSpell("Книга заклинань", "Сон");
    pickSpell("Книга заклинань", "Чарівна стріла");
    expect(section("Книга заклинань").queryByRole("button", { name: "Додати: Книга заклинань" })).toBeNull();
    pickSpell("Підготовлені заклинання", "Щит");
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);

    pickSpell("Підготовлені заклинання", "Сон");

    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.classSpells).toEqual({ cantripIds: [1], spellbookIds: [11, 12, 13], preparedIds: [11, 12] });
  });

  it("заклинання, прибране з книги, зникає й з підготовлених", async () => {
    await renderForm();

    pickSpell("Книга заклинань", "Щит");
    pickSpell("Книга заклинань", "Сон");
    pickSpell("Підготовлені заклинання", "Щит");
    removeSpell("Книга заклинань", "Щит");

    expect(usePersFormStore.getState().formData.classSpells?.preparedIds).toEqual([]);
  });
});

describe("крок «Заклинання» конструктора 2014 — підклас 1-го рівня", () => {
  it("шле підклас і його вибори: покровитель додає розширений список, рід Джина його звужує", async () => {
    usePersFormStore.setState({ formData: { classChoiceSelections: { invocation: 3 }, subclassId: 44, subclassChoiceSelections: { genieKind: 7 } } as never, isHydrated: true });
    render(<CreationSpellsForm selectedClass={{ classId: 120, name: "WARLOCK_2014" } as never} formId="spells-form" />);

    await waitFor(() => expect(vi.mocked(getCreationSpellOffer)).toHaveBeenLastCalledWith(120, [3, 7], 44, null));
  });
});

describe("крок «Заклинання» конструктора 2014 — підготовлені на 1-му рівні", () => {
  const clericOffer: ClassSpellOffer = {
    ...wizardOffer,
    className: "CLERIC_2014",
    classLabel: "Клірик",
    ruleset: "RULES_2014",
    quota: { cantrips: 1, prepared: 0, spellbook: 0, maxSpellLevel: 1 },
    spells: [spell(21, "Благословення", 1), spell(22, "Лікування ран", 1), spell(23, "Нанесення ран", 1)],
  };
  const wizard2014Offer: ClassSpellOffer = { ...wizardOffer, className: "WIZARD_2014", ruleset: "RULES_2014", quota: { cantrips: 1, prepared: 0, spellbook: 3, maxSpellLevel: 1 } };
  const scores = (wis: number, int = 10) => ({ STR: 10, DEX: 10, CON: 10, INT: int, WIS: wis, CHA: 10 });

  afterEach(() => vi.mocked(getCreationSpellOffer).mockResolvedValue(wizardOffer));

  async function renderCleric(wis: number) {
    vi.mocked(getCreationSpellOffer).mockResolvedValue(clericOffer);
    usePersFormStore.setState({ formData: { classChoiceSelections: {} } as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    const view = render(<CreationSpellsForm selectedClass={{ classId: 2, name: "CLERIC_2014" } as never} formId="spells-form" abilityScores={scores(wis)} onNextDisabledChange={onNextDisabledChange} />);
    await screen.findByRole("region", { name: "Підготовлені заклинання" });
    return { ...view, onNextDisabledChange };
  }

  it("клірик готує зі списку класу до модифікатора Мудрості + рівень, і це не обовʼязково", async () => {
    const { onNextDisabledChange } = await renderCleric(14);

    expect(section("Підготовлені заклинання").getByText("0 з 3")).toBeTruthy();
    pickSpell("Замовляння", "Вогняний снаряд");
    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));

    pickSpell("Підготовлені заклинання", "Благословення");
    pickSpell("Підготовлені заклинання", "Лікування ран");

    expect(usePersFormStore.getState().formData.initialPreparedSpellIds).toEqual([21, 22]);
    expect(usePersFormStore.getState().formData.classSpells?.preparedIds ?? []).toEqual([]);
  });

  it("нижча Мудрість після вибору обрізає зайві підготовлені", async () => {
    const { rerender } = await renderCleric(14);
    pickSpell("Підготовлені заклинання", "Благословення");
    pickSpell("Підготовлені заклинання", "Лікування ран");

    rerender(<CreationSpellsForm selectedClass={{ classId: 2, name: "CLERIC_2014" } as never} formId="spells-form" abilityScores={scores(10)} />);

    await waitFor(() => expect(usePersFormStore.getState().formData.initialPreparedSpellIds).toEqual([21]));
  });

  it("чарівник 2014 готує лише з книги й до модифікатора Інтелекту + рівень", async () => {
    vi.mocked(getCreationSpellOffer).mockResolvedValue(wizard2014Offer);
    usePersFormStore.setState({ formData: { classChoiceSelections: {} } as never, isHydrated: true });
    render(<CreationSpellsForm selectedClass={{ classId: 3, name: "WIZARD_2014" } as never} formId="spells-form" abilityScores={scores(10, 14)} />);
    await screen.findByRole("region", { name: "Підготовлені заклинання" });

    expect(section("Підготовлені заклинання").getByText(/Спершу оберіть заклинання до книги/)).toBeTruthy();
    pickSpell("Книга заклинань", "Щит");
    pickSpell("Книга заклинань", "Сон");
    expect(listOfferedSpells("Підготовлені заклинання")).toEqual(["Щит", "Сон"]);

    pickSpell("Підготовлені заклинання", "Сон");
    removeSpell("Книга заклинань", "Сон");

    await waitFor(() => expect(usePersFormStore.getState().formData.initialPreparedSpellIds).toEqual([]));
    expect(section("Підготовлені заклинання").getByText("0 з 3")).toBeTruthy();
  });

  it("класам без підготовки зі списку розділу не показує", async () => {
    vi.mocked(getCreationSpellOffer).mockResolvedValue({ ...clericOffer, className: "SORCERER_2014", quota: { ...clericOffer.quota, prepared: 2 } });
    usePersFormStore.setState({ formData: { classChoiceSelections: {} } as never, isHydrated: true });
    render(<CreationSpellsForm selectedClass={{ classId: 4, name: "SORCERER_2014" } as never} formId="spells-form" abilityScores={scores(18, 18)} />);
    await screen.findByRole("region", { name: "Нові заклинання" });

    expect(screen.queryByRole("region", { name: "Підготовлені заклинання" })).toBeNull();
  });
});
