// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReadyPresetCatalogEntry } from "@/lib/optimization/ready-preset-catalog";

vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/no-ai/ContentImage", () => ({ useIsArtHidden: () => false }));
vi.mock("@/lib/monitoring/rpgbot-analytics", () => ({ captureRpgbotEvent: vi.fn() }));
vi.mock("@/lib/monitoring/use-rpgbot-surface-view", () => ({ useRpgbotSurfaceView: vi.fn() }));
vi.mock("@/components/optimization/AnalystAvatar", () => ({ AnalystAvatar: () => null }));

function buildEntry(slug: string, className: string, title: string): ReadyPresetCatalogEntry {
  return { slug, buildId: `build-${slug}`, title, description: `Опис ${title}`, className, classLabel: className, raceName: "Скельний гном", baseRaceName: "Гном", subclassName: "Майбутній підклас", startingClassKey: "CLASS_2014", startingSubclassKey: null, raceKey: "GNOME_2014", maxLevel: 20, sourceTitle: "Приклад", portraitSrc: null, subclassImageSrc: null, classImageSrc: null };
}

const presets = [
  buildEntry("barbarian-a", "Варвар", "Варвар — атакер"),
  buildEntry("barbarian-b", "Варвар", "Варвар — танк"),
  buildEntry("wizard-a", "Чарівник", "Чарівник — вогонь"),
  { ...buildEntry("bard-a", "Бард", "Бард — дипломат"), raceName: "Високий ельф", baseRaceName: "Ельф" },
];

async function renderGallery(search = "") {
  window.history.replaceState(null, "", `/char/presets${search}`);
  const { ReadyPresetGallery } = await import("@/components/optimization/ReadyPresetGallery");
  render(<ReadyPresetGallery presets={presets} />);
  await act(async () => undefined);
}

beforeEach(() => { vi.resetModules(); });
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("ready preset gallery race filter", () => {
  it("keeps only presets of the base race from the address and offers that race with its count", async () => {
    await renderGallery("?race=%D0%95%D0%BB%D1%8C%D1%84");
    expect(screen.getByRole("status").textContent).toBe("Показано 1 з 4");
    expect(screen.getByRole("combobox", { name: "Раса" }).textContent).toBe("Ельф · 1");
  });
});

describe("ready preset gallery landmarks and chips", () => {
  it("shows a short build title with class and race while retaining the full accessible name and search", async () => {
    const preset = { ...buildEntry("cleric-life-lifeberry-2014", "Клірик", "Клірик / Друїд — Домен життя, Гірський дворф (Лайфберрі, паровозик-танк)"), raceName: "Гірський дворф", classLabel: "Клірик / Друїд", subclassName: "Домен життя" };
    window.history.replaceState(null, "", "/char/presets");
    const { ReadyPresetGallery } = await import("@/components/optimization/ReadyPresetGallery");
    render(<ReadyPresetGallery presets={[preset]} />);
    await act(async () => undefined);
    expect(screen.getByRole("heading", { name: "Лайфберрі" }).classList.contains("truncate")).toBe(true);
    expect(screen.getByText("Клірик / Друїд · Гірський дворф")).toBeTruthy();
    expect(screen.getByRole("button", { name: preset.title }).getAttribute("title")).toBe(preset.title);
    fireEvent.change(screen.getByPlaceholderText("Назва, клас, стиль гри…"), { target: { value: "Гірський дворф" } });
    expect(screen.getByRole("heading", { name: "Лайфберрі" })).toBeTruthy();
  });

  it("leaves the main landmark to the app shell", async () => {
    window.history.replaceState(null, "", "/char/presets");
    const { ReadyPresetGallery } = await import("@/components/optimization/ReadyPresetGallery");
    const { container } = render(<ReadyPresetGallery presets={presets} />);
    expect(container.querySelector("main")).toBeNull();
  });

  it("marks only the pressed class chip with a check besides the colour", async () => {
    await renderGallery();
    const group = screen.getByRole("group", { name: "Клас" });
    const marked = () => within(group).getAllByRole("button").filter((button) => button.querySelector("svg")).map((button) => button.textContent);
    expect(marked()).toEqual(["Усі · 4"]);
    fireEvent.click(screen.getByRole("button", { name: "Бард · 1" }));
    expect(marked()).toEqual(["Бард · 1"]);
    expect(within(group).getByRole("button", { name: "Бард · 1" }).querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("ready preset gallery class filter", () => {
  it("lists classes with counts by complexity and marks the active chip", async () => {
    await renderGallery();
    const group = screen.getByRole("group", { name: "Клас" });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual(["Усі · 4", "Варвар · 2", "Бард · 1", "Чарівник · 1"]);
    expect(within(group).getByRole("button", { name: "Усі · 4" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Показано 4 з 4");
  });

  it("orders all fourteen class filters and cards by the owner's complexity ranking without mutating input", async () => {
    const classes = ["Воїн", "Варвар", "Пройдисвіт", "Паладин", "Слідопит", "Клірик", "Чародій", "Бард", "Монах", "Кривавий мисливець", "Чарівник", "Винахідник", "Чорнокнижник", "Друїд"];
    const entries = [...classes].reverse().map((name, index) => buildEntry(`class-${index}`, name, name));
    const original = [...entries];
    window.history.replaceState(null, "", "/char/presets");
    const { ReadyPresetGallery } = await import("@/components/optimization/ReadyPresetGallery");
    render(<ReadyPresetGallery presets={entries} />);
    await act(async () => undefined);
    const group = screen.getByRole("group", { name: "Клас" });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual(["Усі · 14", ...classes.map((name) => `${name} · 1`)]);
    expect(screen.getAllByRole("button").filter((button) => button.hasAttribute("title")).map((button) => button.getAttribute("title"))).toEqual(classes);
    expect(entries).toEqual(original);
  });

  it("filters by class, writes it to the URL and links cards back with the filter", async () => {
    await renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Варвар · 2" }));
    expect(screen.getByRole("status").textContent).toBe("Показано 2 з 4");
    expect(new URLSearchParams(window.location.search).get("class")).toBe("Варвар");
    expect(screen.getByRole("button", { name: "Варвар · 2" }).getAttribute("aria-pressed")).toBe("true");
    const links = screen.getAllByRole("link", { name: /Переглянути персонажа/ });
    expect(links).toHaveLength(2);
    for (const link of links) expect(new URL(link.getAttribute("href")!, "http://localhost").searchParams.get("class")).toBe("Варвар");
    fireEvent.click(screen.getByRole("button", { name: "Усі · 4" }));
    expect(screen.getByRole("status").textContent).toBe("Показано 4 з 4");
    expect(new URLSearchParams(window.location.search).has("class")).toBe(false);
  });

  it("restores the class filter from the address and combines it with the search text", async () => {
    await renderGallery("?class=%D0%92%D0%B0%D1%80%D0%B2%D0%B0%D1%80&q=%D1%82%D0%B0%D0%BD%D0%BA");
    expect(screen.getByRole("status").textContent).toBe("Показано 1 з 4");
    expect(screen.getByRole("button", { name: "Варвар · 2" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("hides the chip row when there is only one class", async () => {
    window.history.replaceState(null, "", "/char/presets");
    const { ReadyPresetGallery } = await import("@/components/optimization/ReadyPresetGallery");
    render(<ReadyPresetGallery presets={presets.slice(0, 2)} />);
    await act(async () => undefined);
    expect(screen.queryByRole("group", { name: "Клас" })).toBeNull();
  });
});

describe("ready preset gallery progressive list", () => {
  const manyPresets = Array.from({ length: 60 }, (_, index) => buildEntry(`wizard-${index}`, index < 40 ? "Чарівник" : "Бард", `Персонаж ${index}`));

  async function renderMany() {
    window.history.replaceState(null, "", "/char/presets");
    const { ReadyPresetGallery } = await import("@/components/optimization/ReadyPresetGallery");
    render(<ReadyPresetGallery presets={manyPresets} />);
    await act(async () => undefined);
  }
  const countCards = () => within(screen.getByRole("list", { name: "Готові персонажі" })).getAllByRole("listitem").length;

  it("renders the first page and the rest on request, while the total stays honest", async () => {
    await renderMany();
    expect(countCards()).toBe(24);
    expect(screen.getByRole("status").textContent).toBe("Показано 60 з 60");
    fireEvent.click(screen.getByRole("button", { name: "Показати ще" }));
    expect(countCards()).toBe(48);
    fireEvent.click(screen.getByRole("button", { name: "Показати ще" }));
    expect(countCards()).toBe(60);
    expect(screen.queryByRole("button", { name: "Показати ще" })).toBeNull();
  });

  it("starts from the first page again after the filter changes", async () => {
    await renderMany();
    fireEvent.click(screen.getByRole("button", { name: "Показати ще" }));
    expect(countCards()).toBe(48);
    fireEvent.click(screen.getByRole("button", { name: "Бард · 20" }));
    expect(countCards()).toBe(20);
    expect(screen.queryByRole("button", { name: "Показати ще" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Усі · 60" }));
    expect(countCards()).toBe(24);
  });

  it("loads the next page by itself when the end of the list scrolls into view", async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal("IntersectionObserver", class { constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); } observe() {} disconnect() {} });
    await renderMany();
    expect(countCards()).toBe(24);
    await act(async () => callbacks.at(-1)!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(countCards()).toBe(48);
    vi.unstubAllGlobals();
  });
});
