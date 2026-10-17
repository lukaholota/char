// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const posthog = vi.hoisted(() => {
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
  return { capturePostHogEvent: vi.fn() };
});
vi.mock("@/lib/monitoring/posthog-client", () => posthog);

import ClassChoiceOptionsForm from "@/lib/components/characterCreator/ClassChoiceOptionsForm";
import content2014 from "@/lib/generated/creator-content-2014.json";
import content2024 from "@/lib/generated/creator-content-2024.json";
import type { ClassI } from "@/lib/types/model-types";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const findClass = (classes: unknown[], name: string) => (classes as ClassI[]).find((entry) => entry.name === name)!;
const hunter2014 = findClass(content2014.classes, "BLOOD_HUNTER_2014");
const hunter2024 = findClass(content2024.classes, "BLOOD_HUNTER_2024");

const renderChoices = (selectedClass: ClassI) => render(<ClassChoiceOptionsForm selectedClass={selectedClass} formId="class-choice-form" />);
const waitForRatingCatalog = () => act(async () => {
  await import("@/lib/optimization/choice-option-rating-catalog");
});

describe("оцінки RPGbot у виборі кривавих проклять", () => {
  it("мисливець 2014 бачить оцінку й коментар на картці, а найкраще прокляття стоїть першим", async () => {
    renderChoices(hunter2014);

    expect(await screen.findByRole("switch", { name: /Показати рекомендації RPGbot/ })).toBeTruthy();
    expect(screen.getByText("Оцінка варіантів за класовим гайдом RPGbot; найкращі — зверху.")).toBeTruthy();
    const curseInfoButtons = screen.getAllByRole("button", { name: /Інформація про Криваве прокляття/ });
    const firstCurse = curseInfoButtons[0].closest(".glass-card") as HTMLElement;
    await waitFor(() => expect(firstCurse.textContent).toContain("4/4"));
    expect(firstCurse.textContent).toContain("Blood Curse of Binding");
    expect(firstCurse.textContent).toContain("знерухомлених їх набагато легше вбити");
    expect(document.body.textContent).toContain("1/4");
  });

  it("у вікні інформації — оцінка, повний коментар і посилання на розділ розбору", async () => {
    renderChoices(hunter2014);
    await waitFor(() => expect(document.body.textContent).toContain("4/4"));
    const firstCurseInfo = screen.getAllByRole("button", { name: /Інформація про Криваве прокляття/ })[0];

    fireEvent.click(firstCurseInfo);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Оцінка RPGbot" })).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "Читати розбір українською" }).getAttribute("href")).toBe("/rules/optimization/blood-hunter-2014#section-blood-curses");
    expect(within(dialog).getByRole("link", { name: "Оригінал на RPGbot" }).getAttribute("href")).toMatch(/^https:\/\/rpgbot\.net\//);
  });

  it("вимкнені рекомендації ховають оцінки й памʼятаються", async () => {
    window.localStorage.setItem("rpgbot-spell-recommendations", "0");
    renderChoices(hunter2014);

    await waitFor(() => expect(screen.getByRole("switch", { name: /Показати рекомендації RPGbot/ }).getAttribute("aria-checked")).toBe("false"));
    expect(document.body.textContent).not.toMatch(/\d\/4/);

    fireEvent.click(screen.getByRole("switch", { name: /Показати рекомендації RPGbot/ }));
    await waitFor(() => expect(document.body.textContent).toContain("4/4"));
    expect(window.localStorage.getItem("rpgbot-spell-recommendations")).toBeNull();
  });

  it("мисливець 2024 не бачить ні перемикача, ні оцінок", async () => {
    renderChoices(hunter2024);
    await waitForRatingCatalog();

    expect(screen.getAllByRole("button", { name: /Інформація про/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("switch", { name: /Показати рекомендації RPGbot/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d\/4/);
  });
});
