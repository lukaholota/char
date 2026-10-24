// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ClassSpellChoiceStep } from "@/components/spells/ClassSpellChoiceStep";
import { SpellModalRatings } from "@/components/spells/SpellModalRatings";
import { SpellRatingBadge } from "@/components/spells/SpellRatingBadge";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { useSpellRatingContextStore } from "@/lib/stores/spellRatingContextStore";
import type { ClassSpellOffer } from "@/rules/class-spell-choices-2024";
import { closeSheet, openAddSheet, sheet } from "../helpers/spell-picks-ui";

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

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  useSpellRatingContextStore.setState({ casters: [], isRatingFocusRequested: false });
  usePersFormStore.setState({ formData: {} as never });
});

const spell = (spellId: number, engName: string, level: number) => ({ spellId, name: `${engName} UA`, engName, level, school: "ENCHANTMENT", spellLists: ["Бард"] });

const bard2014: ClassSpellOffer = {
  className: "BARD_2014",
  classLabel: "Бард",
  ruleset: "RULES_2014",
  quota: { cantrips: 0, prepared: 2, spellbook: 0, maxSpellLevel: 2 },
  catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
  cantrips: [],
  spells: [spell(1, "Speak with Animals", 1), spell(2, "Misty Step", 2), spell(3, "Cure Wounds", 1), spell(4, "Sleep", 1)],
  bookSpells: [],
  bookOnlySpellIds: [],
  swap: null,
  canSkipPrepared: false,
};

const barbarian2014: ClassSpellOffer = { ...bard2014, className: "BARBARIAN_2014", classLabel: "Варвар" };
const bard2024: ClassSpellOffer = { ...bard2014, className: "BARD_2024", ruleset: "RULES_2024" };


const listSpellOrder = () => sheet().getAllByRole("button", { pressed: false }).map((button) => button.getAttribute("aria-label"));
const openNewSpells = () => openAddSheet("Нові заклинання");
const findRatingChips = () => [...document.querySelectorAll("[data-rating-tone]")].map((chip) => chip.lastElementChild?.textContent?.trim());

const findRecommendationSwitch = () => screen.getByRole("switch", { name: /рекомендації RPGbot/i });

describe("рекомендації RPGbot на кроці заклинань класу", () => {
  it("не показує перемикач класу без розбору RPGbot і заклинань редакції 2024", () => {
    render(<ClassSpellChoiceStep offer={barbarian2014} />);
    expect(screen.queryByRole("switch")).toBeNull();
    cleanup();

    render(<ClassSpellChoiceStep offer={bard2024} />);
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("за замовчуванням уже показує оцінки чипами й ставить найкращі заклинання рівня першими", async () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    expect(findRecommendationSwitch()).toHaveProperty("ariaChecked", "true");
    openNewSpells();

    await waitFor(() => expect(findRatingChips()).toEqual(["4/4 Чудово", "3/4 Добре", "2/4 Прийнятно"]));
    expect(listSpellOrder()).toEqual(["Sleep UA", "Cure Wounds UA", "Speak with Animals UA", "Misty Step UA"]);
  });

  it("після вимкнення повертає початковий список без бейджів", async () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    openNewSpells();
    await waitFor(() => expect(findRatingChips().length).toBeGreaterThan(0));
    closeSheet();

    fireEvent.click(findRecommendationSwitch());
    openNewSpells();

    await waitFor(() => expect(findRatingChips()).toEqual([]));
    expect(listSpellOrder()).toEqual(["Speak with Animals UA", "Cure Wounds UA", "Sleep UA", "Misty Step UA"]);
  });

  it("пам'ятає, що гравець вимкнув рекомендації", () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    fireEvent.click(findRecommendationSwitch());
    cleanup();

    render(<ClassSpellChoiceStep offer={bard2014} />);

    expect(findRecommendationSwitch()).toHaveProperty("ariaChecked", "false");
    openNewSpells();
    expect(listSpellOrder()).toHaveLength(4);
    expect(findRatingChips()).toEqual([]);
  });

  it("не вибирає заклинання саме від появи чипів оцінки", async () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    openNewSpells();
    await waitFor(() => expect(findRatingChips().length).toBeGreaterThan(0));

    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("показує пояснення рівня оцінки в підказці при наведенні", async () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    openNewSpells();
    await waitFor(() => expect(findRatingChips().length).toBeGreaterThan(0));

    fireEvent.mouseEnter(document.querySelector("[data-rating-tone]")!.parentElement!);

    expect((await screen.findByRole("tooltip")).textContent).toBe("Чудові варіанти, нерідко необхідні для роботи персонажа. Дуже часто корисні.");
  });

  it("обране заклинання лишається карткою каталогу: опис і оцінка відкриваються без заміни", async () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    openNewSpells();
    fireEvent.click(await screen.findByRole("button", { name: "Sleep UA" }));
    closeSheet();

    const chosen = within(screen.getByRole("region", { name: "Нові заклинання" }));
    expect(chosen.getByRole("button", { name: "Опис: Sleep UA" })).toBeTruthy();
    expect(chosen.getByRole("button", { name: "Оцінка RPGbot для «Sleep UA»: відкрити аналіз" })).toBeTruthy();
    expect(chosen.getByRole("button", { name: "Sleep UA: замінити або прибрати" })).toBeTruthy();
  });

  it("передає клас у контекст модалки заклинання, поки рекомендації ввімкнені", () => {
    render(<ClassSpellChoiceStep offer={bard2014} />);
    expect(useSpellRatingContextStore.getState().casters).toMatchObject([{ className: "BARD_2014" }]);

    fireEvent.click(findRecommendationSwitch());
    expect(useSpellRatingContextStore.getState().casters).toEqual([]);
  });

  it("чип оцінки відкриває модалку заклинання й просить прокрутити до аналізу", async () => {
    const openedSpells: unknown[] = [];
    window.addEventListener("spell:open", (event) => openedSpells.push((event as CustomEvent).detail), { once: true });
    render(<ClassSpellChoiceStep offer={bard2014} />);
    openNewSpells();

    fireEvent.click(await screen.findByRole("button", { name: "Оцінка RPGbot для «Sleep UA»: відкрити аналіз" }));

    await waitFor(() => expect(openedSpells).toHaveLength(1));
    expect(useSpellRatingContextStore.getState().isRatingFocusRequested).toBe(true);
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });
});

describe("оцінка RPGbot у модалці заклинання", () => {
  afterEach(() => useSpellRatingContextStore.setState({ casters: [], isRatingFocusRequested: false }));

  it("показує оцінку лише коли крок заклинань передав клас", async () => {
    const { container } = render(<SpellModalRatings spell={{ engName: "Sleep", ruleset: "RULES_2014" }} />);
    expect(container.textContent).toBe("");

    useSpellRatingContextStore.setState({ casters: [{ className: "BARD_2014", subclassName: null }] });

    expect(await screen.findByRole("region", { name: "Оцінка RPGbot" })).toBeTruthy();
    expect(screen.getByText("Бард")).toBeTruthy();
  });

  it("мовчить для заклинання без оцінки в списку класу й для 2024", async () => {
    useSpellRatingContextStore.setState({ casters: [{ className: "BARD_2014", subclassName: null }] });
    const { container, rerender } = render(<SpellModalRatings spell={{ engName: "Misty Step", ruleset: "RULES_2014" }} />);
    await waitFor(() => expect(container.textContent).toBe(""));

    rerender(<SpellModalRatings spell={{ engName: "Sleep", ruleset: "RULES_2024" }} />);
    expect(container.textContent).toBe("");
  });
});

describe("діалог оцінки RPGbot у каталозі", () => {
  it("відкриває коментар із посиланнями на наш переклад і на оригінал", async () => {
    render(<SpellRatingBadge matches={[{ listKey: "bard", score: 4 }]} spellName="Sleep UA" spellEngName="Sleep" />);

    fireEvent.click(screen.getByRole("button", { name: "Оцінка RPGbot для «Sleep UA»: Чудово" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Оцінка RPGbot: Sleep UA")).toBeTruthy();
    expect(within(dialog).getByText("Бард")).toBeTruthy();
    const articleLink = within(dialog).getByRole("link", { name: "Читати розбір українською" });
    await waitFor(() => expect(articleLink.getAttribute("href")).toBe("/rules/optimization/bard-spells-2014#section-spells-1"));
    await waitFor(() => expect(dialog.querySelector("section p")?.textContent?.length ?? 0).toBeGreaterThan(40));
    expect(within(dialog).queryByRole("link", { name: "Оригінал на RPGbot" })).toBeNull();
  });
});
