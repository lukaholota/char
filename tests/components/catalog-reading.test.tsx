// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";

import { ClassDetailCard } from "@/components/classes/ClassDetailCard";
import { SubclassReader } from "@/components/classes/SubclassReader";
import { ReadingEntryList } from "@/components/catalogs/reading/ReadingEntryList";
import { useReadingNavigation } from "@/components/catalogs/reading/useReadingNavigation";
import type { ReadingActions, ReadingView } from "@/components/catalogs/reading/reading-view";
import { buildFeatureEntries } from "@/lib/catalogs/reading-entries";
import { isOnBranchEntry } from "@/lib/catalogs/reading-history";
import type { ClassData } from "@/lib/classesData";
import { buildClassTable } from "@/rules/class-table";

const LORE = {
  subclassId: 7,
  key: "LORE",
  slug: "college-of-lore",
  name: "Колегія знань",
  engName: "College of Lore",
  description: "Барди Колегії знань знають потроху про все.",
  source: "PHB",
  features: [
    { level: 6, name: "Додаткові магічні таємниці", engName: "Additional Magical Secrets", description: "Опис таємниць." },
    { level: 3, name: "Ріжучі слова", engName: "Cutting Words", description: "Опис ріжучих слів." },
    { level: 3, name: "Додаткові володіння", engName: "Bonus Proficiencies", description: "Опис володінь." },
  ],
};

const BARD: ClassData = {
  classId: 2,
  key: "BARD_2014",
  slug: "bard",
  name: "Бард",
  engName: "Bard",
  description: "Барди творять магію музикою.",
  hitDie: 8,
  savingThrows: [],
  armorProficiencies: [],
  toolProficiencies: [],
  skillChoices: { options: [], count: 0 },
  spellcasting: null,
  castingStat: null,
  subclassLevel: 3,
  abilityScoreUpLevels: [],
  features: [{ level: 1, name: "Натхнення барда", engName: "Bardic Inspiration", description: "Опис натхнення." }],
  subclasses: [LORE],
  imageSrc: null,
  source: "PHB",
  ruleset: "RULES_2014",
};

function buildView(section: "overview" | "table" | "features" | "subclasses", featureKey: string | null = null): ReadingView<typeof section> {
  return { section, featureKey, focusRequest: 0, missing: null };
}

function buildActions(): ReadingActions<"overview" | "table" | "features" | "subclasses"> {
  return { onSectionChange: vi.fn(), onOpenBranch: vi.fn(), onDismissMissing: vi.fn() };
}

let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("KR44.3 — здібності читаються окремо", () => {
  it("назви видно одразу, опис розгортається за натисканням", () => {
    render(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey={null} focusRequest={0} is2024={false} />);

    expect(screen.getByRole("button", { name: /Ріжучі слова/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Опис ріжучих слів.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ріжучі слова/ }));

    expect(screen.getByText("Опис ріжучих слів.")).toBeTruthy();
  });

  it("короткі переліки (риси раси, здібності підкласу) відкриті одразу й без англійських підписів", () => {
    render(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey={null} focusRequest={0} is2024={false} isExpandedByDefault />);

    expect(screen.getByText("Опис ріжучих слів.")).toBeTruthy();
    expect(screen.getByText("Опис таємниць.")).toBeTruthy();
    expect(screen.queryByText(/Cutting Words/)).toBeNull();
  });

  it("здібності згруповані за рівнями у порядку зростання", () => {
    render(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey={null} focusRequest={0} is2024={false} />);

    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual(["3 рівень", "6 рівень"]);
  });

  it("«Розгорнути всі» відкриває кожен опис, «Згорнути всі» — ховає", () => {
    render(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey={null} focusRequest={0} is2024={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Розгорнути всі" }));
    expect(screen.getByText("Опис таємниць.")).toBeTruthy();
    expect(screen.getByText("Опис володінь.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Згорнути всі" }));
    expect(screen.queryByText("Опис таємниць.")).toBeNull();
  });

  it("ціль із адреси розгорнута, прокручена й позначена контуром", () => {
    render(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey="cutting-words-3" focusRequest={0} is2024={false} />);

    const target = document.querySelector('[data-reading-entry="cutting-words-3"]')!;
    expect(within(target as HTMLElement).getByText("Опис ріжучих слів.")).toBeTruthy();
    expect(target.className).toContain("outline");
    expect(scrollIntoView.mock.contexts).toEqual([target]);
  });

  it("повторний запит тієї самої цілі прокручує ще раз", () => {
    const view = render(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey="cutting-words-3" focusRequest={0} is2024={false} />);

    view.rerender(<ReadingEntryList entries={buildFeatureEntries(LORE.features)} targetKey="cutting-words-3" focusRequest={1} is2024={false} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});

describe("KR44.3 — розділи картки класу", () => {
  it("клас без здібностей і підкласів не має порожніх розділів", () => {
    render(<ClassDetailCard characterClass={{ ...BARD, features: [], subclasses: [] }} view={buildView("overview")} actions={buildActions()} />);

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Огляд"]);
  });

  it("таблиця класу — окремий розділ із рядком на кожен рівень", () => {
    const table = buildClassTable(
      { name: "BARD_2014", ruleset: "RULES_2014", spellcastingType: "FULL", features: [] },
      [],
    );
    render(<ClassDetailCard characterClass={BARD} table={table} view={buildView("table")} actions={buildActions()} />);

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Огляд", "Таблиця", "Здібності (1)", "Підкласи (1)"]);
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getByRole("columnheader", { name: "Кістка натхнення" })).toBeTruthy();
  });

  it("назва в таблиці веде до опису здібності, «Фіча підкласу» — до підкласів", () => {
    const table = buildClassTable(
      {
        name: "BARD_2014",
        ruleset: "RULES_2014",
        spellcastingType: "FULL",
        features: [{ levelGranted: 1, feature: { name: "Натхнення барда", engName: "Bardic Inspiration" } }],
      },
      [{ features: [{ levelGranted: 3 }] }],
    );
    const actions = { ...buildActions(), onOpenFeature: vi.fn() };
    render(<ClassDetailCard characterClass={BARD} table={table} view={buildView("table")} actions={actions} />);

    fireEvent.click(screen.getByRole("button", { name: "Натхнення барда" }));
    fireEvent.click(screen.getByRole("button", { name: "Фіча підкласу" }));

    expect(actions.onOpenFeature).toHaveBeenCalledWith("bardic-inspiration-1");
    expect(actions.onSectionChange).toHaveBeenCalledWith("subclasses");
  });

  it("картка підкласу відкриває його читання", () => {
    const actions = buildActions();
    render(<ClassDetailCard characterClass={BARD} view={buildView("subclasses")} actions={actions} />);

    const card = screen.getByRole("button", { name: /Колегія знань/ });
    expect(card.textContent).toContain("3 здібності");
    fireEvent.click(card);

    expect(actions.onOpenBranch).toHaveBeenCalledWith("college-of-lore", card);
  });

  it("невідома ціль показує, чого немає, і веде до класу", () => {
    const actions = buildActions();
    render(<ClassDetailCard characterClass={BARD} view={{ ...buildView("subclasses"), missing: "branch" }} actions={actions} />);

    expect(screen.getByRole("status").textContent).toContain("Такого підкласу в цьому класі немає.");
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "До класу" }));

    expect(actions.onDismissMissing).toHaveBeenCalledTimes(1);
  });
});

describe("KR44.3 — читання підкласу", () => {
  it("видно батька, повернення й закриття", () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(<SubclassReader characterClass={BARD} subclass={LORE} featureKey={null} focusRequest={0} is2024={false} onBack={onBack} onClose={onClose} />);

    expect(screen.getByText("Бард › Колегія знань")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /До класу/ }));
    fireEvent.click(screen.getByRole("button", { name: "Закрити" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("без цілі фокус стає на заголовок підкласу", () => {
    render(<SubclassReader characterClass={BARD} subclass={LORE} featureKey={null} focusRequest={0} is2024={false} onBack={vi.fn()} onClose={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Колегія знань" }));
  });
});

/// jsdom скасовує перехід назад, якщо до його виконання встиг pushState; Chromium — ні.
function traverseBackLikeChromium() {
  const go = History.prototype.go;
  vi.spyOn(window.history, "go").mockImplementation((delta?: number) => {
    setTimeout(() => go.call(window.history, delta), 0);
  });
}

function waitForHistoryTraversal() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

describe("KR44.3 — гілка має один власний запис історії", () => {
  beforeEach(() => {
    traverseBackLikeChromium();
    window.history.replaceState({ __NA: true }, "", "/classes?class=bard&view=subclasses");
  });

  function renderNavigation() {
    const onUrlChanged = vi.fn();
    const hook = renderHook(({ isBranchOpen }) => useReadingNavigation({ isBranchOpen, onUrlChanged }), {
      initialProps: { isBranchOpen: false },
    });
    return { ...hook, onUrlChanged };
  }

  function openLore(result: ReturnType<typeof renderNavigation>["result"]) {
    const opener = document.createElement("button");
    act(() => result.current.openBranch((params) => params.set("subclass", "college-of-lore"), "college-of-lore", opener));
  }

  it("відкриття гілки додає запис зі станом Next і адресою гілки", () => {
    const { result, onUrlChanged } = renderNavigation();
    const lengthBefore = window.history.length;

    openLore(result);

    expect(window.history.length).toBe(lengthBefore + 1);
    expect(window.location.search).toBe("?class=bard&view=subclasses&subclass=college-of-lore");
    expect((window.history.state as Record<string, unknown>).__NA).toBe(true);
    expect(onUrlChanged).toHaveBeenCalledTimes(1);
  });

  it("«До класу» знімає запис гілки, а не додає новий", async () => {
    const { result } = renderNavigation();
    openLore(result);

    act(() => result.current.leaveBranchTo((params) => params.delete("subclass")));
    await act(waitForHistoryTraversal);

    expect(window.location.search).toBe("?class=bard&view=subclasses");
    expect(isOnBranchEntry()).toBe(false);
  });

  it("гілка з адреси, без свого запису, закривається заміною адреси", () => {
    window.history.replaceState({ __NA: true }, "", "/classes?class=bard&subclass=college-of-lore");
    const { result, onUrlChanged } = renderNavigation();
    const lengthBefore = window.history.length;

    act(() => result.current.leaveBranchTo((params) => params.delete("subclass")));

    expect(window.history.length).toBe(lengthBefore);
    expect(window.location.search).toBe("?class=bard");
    expect((window.history.state as Record<string, unknown>).__NA).toBe(true);
    expect(onUrlChanged).toHaveBeenCalledTimes(1);
  });

  it("закриття модалки з гілкою чекає, доки знято запис гілки", async () => {
    const { result } = renderNavigation();
    openLore(result);
    const closeModal = vi.fn();

    act(() => result.current.closeModalWithBranch(closeModal, (params) => params.delete("view")));
    expect(closeModal).not.toHaveBeenCalled();
    await act(waitForHistoryTraversal);

    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?class=bard");
  });

  it("після повернення фокус стає на картку гілки, з якої відкрили", async () => {
    const card = document.createElement("button");
    card.dataset.branchCard = "college-of-lore";
    document.body.append(card);
    Object.defineProperty(card, "offsetParent", { get: () => document.body });
    const { result, rerender } = renderNavigation();

    act(() => result.current.openBranch((params) => params.set("subclass", "college-of-lore"), "college-of-lore", card));
    rerender({ isBranchOpen: true });
    rerender({ isBranchOpen: false });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    expect(document.activeElement).toBe(card);
    card.remove();
  });
});
