// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ClassSpellChoiceStep } from "@/components/spells/ClassSpellChoiceStep";
import { usePersFormStore } from "@/lib/stores/persFormStore";
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

afterEach(cleanup);

const spell = (spellId: number, name: string, level: number) => ({ spellId, name, engName: name, level, school: "EVOCATION", spellLists: ["Чарівник"] });

const wizardLevelTwo: ClassSpellOffer = {
  className: "WIZARD_2024",
  classLabel: "Чарівник",
  quota: { cantrips: 0, prepared: 1, spellbook: 2, maxSpellLevel: 1 },
  cantrips: [],
  spells: [spell(11, "Щит", 1), spell(12, "Сон", 1), spell(13, "Чарівна стріла", 1)],
  bookSpells: [spell(21, "Виявлення магії", 1)],
  bookOnlySpellIds: [],
  ruleset: "RULES_2024",
  catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
  swap: null,
  canSkipPrepared: true,
};

const sorcererLevelFour: ClassSpellOffer = {
  className: "SORCERER_2024",
  classLabel: "Чародій",
  quota: { cantrips: 0, prepared: 0, spellbook: 0, maxSpellLevel: 2 },
  cantrips: [spell(31, "Світло", 0), spell(32, "Вогняний снаряд", 0)],
  spells: [spell(41, "Сон", 1), spell(42, "Туманний крок", 2)],
  bookSpells: [],
  bookOnlySpellIds: [],
  ruleset: "RULES_2024",
  catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
  swap: { droppableCantrips: [spell(51, "Магічна рука", 0)], droppableSpells: [spell(61, "Щит", 1)] },
  canSkipPrepared: false,
};

const druidLevelThree: ClassSpellOffer = {
  className: "DRUID_2024",
  classLabel: "Друїд",
  quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 2 },
  cantrips: [],
  spells: [spell(41, "Сон", 1), spell(42, "Туманний крок", 2)],
  bookSpells: [],
  bookOnlySpellIds: [],
  ruleset: "RULES_2024",
  catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
  swap: null,
  canSkipPrepared: true,
};

const bardLevelSix2014: ClassSpellOffer = {
  className: "BARD_2014",
  classLabel: "Бард",
  ruleset: "RULES_2014",
  quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 3 },
  catchUp: { cantrips: 1, prepared: 2, spellbook: 0 },
  cantrips: [spell(71, "Магічна рука", 0), spell(72, "Світло", 0)],
  spells: [spell(81, "Сон", 1), spell(82, "Туманний крок", 2), spell(83, "Вогняна куля", 3), spell(84, "Щит", 1)],
  bookSpells: [],
  bookOnlySpellIds: [],
  swap: { droppableCantrips: [], droppableSpells: [spell(91, "Лікування ран", 1)] },
  canSkipPrepared: false,
};

const section = (name: string) => within(screen.getByRole("region", { name }));
const click = (name: string, spellName: string) => fireEvent.click(section(name).getByRole("button", { name: new RegExp(`^${spellName}`) }));

describe("KR31.5 — крок «Заклинання» на підвищенні рівня 2024 (L08-levelup-machine-11)", () => {
  it("чарівник може підготувати заклинання, що вже лежить у книзі, ще до нових записів", async () => {
    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<ClassSpellChoiceStep offer={wizardLevelTwo} onNextDisabledChange={onNextDisabledChange} />);

    expect(screen.queryByRole("region", { name: "Замовляння" })).toBeNull();
    expect(section("Підготовлені заклинання").getAllByRole("button", { pressed: false }).map((button) => button.getAttribute("aria-label"))).toEqual(["Виявлення магії"]);

    click("Підготовлені заклинання", "Виявлення магії");
    click("Книга заклинань", "Щит");
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);
    click("Книга заклинань", "Сон");

    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.classSpells).toEqual({ cantripIds: [], spellbookIds: [11, 12], preparedIds: [21] });
  });

  it("Р38: Щит, завжди підготований рисою, лягає в книгу, але в підготовлених не зʼявляється", async () => {
    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    render(<ClassSpellChoiceStep offer={{ ...wizardLevelTwo, bookOnlySpellIds: [11] }} />);

    click("Книга заклинань", "Щит");
    click("Книга заклинань", "Сон");

    await waitFor(() => expect(usePersFormStore.getState().formData.classSpells?.spellbookIds).toEqual([11, 12]));
    expect(section("Підготовлені заклинання").getAllByRole("button", { pressed: false }).map((button) => button.getAttribute("aria-label"))).toEqual(["Виявлення магії", "Сон"]);
  });

  it("заміна необовʼязкова: без неї «Далі» відкрите, почата — лише з обома половинами (L08-levelup-machine-11)", async () => {
    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<ClassSpellChoiceStep offer={sorcererLevelFour} onNextDisabledChange={onNextDisabledChange} />);
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(false);

    click("Замінити підготовлене заклинання", "Щит");
    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(true));
    click("Замінити підготовлене заклинання", "Туманний крок");

    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.classSpells).toEqual({ cantripIds: [], spellbookIds: [], preparedIds: [], preparedSwap: { dropId: 61, addId: 42 } });
    expect(section("Замінити замовляння").queryByRole("button", { name: /^Світло/ })).toBeNull();
  });

  it("друїд на підвищенні може не обирати нових підготовлених, а без цього дозволу крок не пускає далі", async () => {
    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    const skippable = vi.fn();
    render(<ClassSpellChoiceStep offer={druidLevelThree} onNextDisabledChange={skippable} />);

    expect(section("Підготовлені заклинання").getByText(/^Необовʼязково: друїд переставляє підготовлені/)).toBeTruthy();
    expect(skippable).toHaveBeenLastCalledWith(false);
    click("Підготовлені заклинання", "Сон");
    await waitFor(() => expect(usePersFormStore.getState().formData.classSpells?.preparedIds).toEqual([41]));
    expect(skippable).toHaveBeenLastCalledWith(false);
    cleanup();

    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    const required = vi.fn();
    render(<ClassSpellChoiceStep offer={{ ...druidLevelThree, canSkipPrepared: false }} onNextDisabledChange={required} />);

    expect(section("Підготовлені заклинання").queryByText(/^Необовʼязково/)).toBeNull();
    expect(required).toHaveBeenLastCalledWith(true);
  });
});

describe("крок «Заклинання» на підвищенні рівня 2014 — прибавка обовʼязкова, решта до таблиці за бажанням", () => {
  it("бард 5 → 6: «Далі» відкривається з одним новим заклинанням, до таблиці можна додати ще два й замовляння", async () => {
    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<ClassSpellChoiceStep offer={bardLevelSix2014} onNextDisabledChange={onNextDisabledChange} />);

    expect(screen.queryByRole("region", { name: "Підготовлені заклинання" })).toBeNull();
    expect(section("Нові заклинання").getByText("Обовʼязково: 1. До таблиці бракує ще 2 — можна додати зараз.")).toBeTruthy();
    expect(section("Замовляння").getByText("До таблиці бракує ще 1 — можна додати зараз.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Замінити відоме заклинання" })).toBeTruthy();
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(true);

    click("Нові заклинання", "Сон");
    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));

    click("Нові заклинання", "Туманний крок");
    click("Нові заклинання", "Вогняна куля");
    expect(section("Нові заклинання").getByRole("button", { name: /^Щит/ })).toHaveProperty("disabled", true);
    click("Замовляння", "Світло");

    await waitFor(() => expect(usePersFormStore.getState().formData.classSpells).toEqual({ cantripIds: [72], spellbookIds: [], preparedIds: [81, 82, 83] }));
    expect(onNextDisabledChange).toHaveBeenLastCalledWith(false);
  });
});

describe("крок «Заклинання» третинного підкласу 2014 — школи підкласу й один «будь-якої школи»", () => {
  const schooled = (spellId: number, name: string, school: string) => ({ ...spell(spellId, name, 1), school });
  const eldritchKnightLevelThree: ClassSpellOffer = {
    className: "FIGHTER_2014",
    classLabel: "Воїн",
    ruleset: "RULES_2014",
    quota: { cantrips: 0, prepared: 3, spellbook: 0, maxSpellLevel: 1 },
    catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
    cantrips: [],
    spells: [schooled(11, "Щит", "ABJURATION"), schooled(12, "Сон", "ENCHANTMENT"), schooled(13, "Чарівна стріла", "EVOCATION"), schooled(14, "Маскування", "ILLUSION")],
    bookSpells: [],
    bookOnlySpellIds: [],
    swap: null,
    canSkipPrepared: false,
    schoolLimit: { schools: ["ABJURATION", "EVOCATION"], outsideAllowed: 1 },
    spellListNote: "зі списку чарівника (Потойбічний лицар)",
  };

  it("після одного заклинання поза школами решта поза школами вимикається, свої школи лишаються", async () => {
    usePersFormStore.setState({ formData: {} as never, isHydrated: true });
    const onNextDisabledChange = vi.fn();
    render(<ClassSpellChoiceStep offer={eldritchKnightLevelThree} onNextDisabledChange={onNextDisabledChange} />);

    expect(screen.getByText(/^Воїн обирає зі списку чарівника \(Потойбічний лицар\) — нових заклинань: 3/)).toBeTruthy();
    expect(section("Нові заклинання").getByText("Школи підкласу — «Захист» і «Втілення»; поза ними можна взяти ще 1.")).toBeTruthy();

    click("Нові заклинання", "Сон");
    await waitFor(() => expect(section("Нові заклинання").getByRole("button", { name: /^Маскування/ })).toHaveProperty("disabled", true));
    expect(section("Нові заклинання").getByRole("button", { name: /^Щит/ })).toHaveProperty("disabled", false);

    click("Нові заклинання", "Щит");
    click("Нові заклинання", "Чарівна стріла");
    await waitFor(() => expect(onNextDisabledChange).toHaveBeenLastCalledWith(false));
    expect(usePersFormStore.getState().formData.classSpells).toEqual({ cantripIds: [], spellbookIds: [], preparedIds: [12, 11, 13] });
  });
});
