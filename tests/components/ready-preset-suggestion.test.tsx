// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReadyPresetCatalogEntry } from "@/lib/optimization/ready-preset-catalog";

const push = vi.fn();
vi.mock("@/components/no-ai/ModeLink", () => ({ ModeLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({ useModeRouter: () => ({ push }) }));
vi.mock("@/components/no-ai/ContentImage", () => ({ useIsArtHidden: () => false }));
vi.mock("@/lib/monitoring/rpgbot-analytics", () => ({ captureRpgbotEvent: vi.fn() }));
vi.mock("@/components/optimization/AnalystAvatar", () => ({ AnalystAvatar: () => null }));

const entry: ReadyPresetCatalogEntry = {
  slug: "rogue-thief-2014", buildId: "build-rogue-thief-2014", title: "Пройдисвіт — Злодій", description: "Швидкий розвідник.", className: "Пройдисвіт",
  classLabel: "Пройдисвіт", raceName: "Лісовий ельф", subclassName: "Злодій", startingClassKey: "ROGUE_2014", startingSubclassKey: "THIEF", raceKey: "ELF_2014",
  maxLevel: 20, sourceTitle: "Приклад", portraitSrc: null, subclassImageSrc: null, classImageSrc: null, searchAliases: [],
};

function stubSuggestion(response: object) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
}

async function renderSuggestion(props: { subclassKey?: string | null; raceKey?: string | null } = {}) {
  const { ReadyPresetSuggestion } = await import("@/components/optimization/ReadyPresetSuggestion");
  render(<ReadyPresetSuggestion classKey="ROGUE_2014" subclassKey={props.subclassKey ?? null} raceKey={props.raceKey ?? null} />);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
}

function stubLocalStorage() {
  const entries = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => void entries.set(key, String(value)), removeItem: (key: string) => void entries.delete(key) },
  });
}

beforeEach(() => {
  vi.resetModules();
  push.mockClear();
  stubLocalStorage();
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("floating ready preset suggestion", () => {
  it("stays hidden when the chosen class has no preset", async () => {
    stubSuggestion({ total: 0, best: null });
    await renderSuggestion();

    expect(screen.queryByRole("button", { name: "Доробити персонажа" })).toBeNull();
  });

  it("opens the preset card and says honestly what matches and what does not", async () => {
    stubSuggestion({ total: 8, best: { entry, isSubclassMatch: true, isRaceMatch: false } });
    await renderSuggestion({ subclassKey: "THIEF", raceKey: "DWARF_2014" });

    fireEvent.click(screen.getByRole("button", { name: "Доробити персонажа" }));

    expect(await screen.findByText("Швидкий розвідник.")).toBeTruthy();
    expect(screen.getByText("Клас збігається")).toBeTruthy();
    expect(screen.getByText("Підклас збігається")).toBeTruthy();
    expect(screen.getByText("Раса відрізняється")).toBeTruthy();
    expect(screen.getByText(/раса «Лісовий ельф»/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ще 7 для цього класу" }).getAttribute("href")).toBe("/char/presets?class=%D0%9F%D1%80%D0%BE%D0%B9%D0%B4%D0%B8%D1%81%D0%B2%D1%96%D1%82");
  });

  it("closes without leaving when the player declines", async () => {
    stubSuggestion({ total: 1, best: { entry, isSubclassMatch: false, isRaceMatch: false } });
    await renderSuggestion();
    fireEvent.click(screen.getByRole("button", { name: "Доробити персонажа" }));

    fireEvent.click(await screen.findByRole("button", { name: "Відмовитися" }));

    expect(screen.queryByText("Швидкий розвідник.")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("continues to the preset at level 1 by default", async () => {
    stubSuggestion({ total: 1, best: { entry, isSubclassMatch: false, isRaceMatch: false } });
    await renderSuggestion();
    fireEvent.click(screen.getByRole("button", { name: "Доробити персонажа" }));

    fireEvent.click(await screen.findByRole("button", { name: /Продовжити/ }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/char/create?preset=rogue-thief-2014&from=suggestion"));
    expect(window.localStorage.getItem("dnd-preset-2014-build-rogue-thief-2014-levels")).toBeNull();
  });

  it("remembers the level the player changed before continuing", async () => {
    stubSuggestion({ total: 1, best: { entry, isSubclassMatch: false, isRaceMatch: false } });
    await renderSuggestion();
    fireEvent.click(screen.getByRole("button", { name: "Доробити персонажа" }));
    fireEvent.click(await screen.findByRole("button", { name: "змінити" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: /Продовжити/ }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/char/create?preset=rogue-thief-2014&from=suggestion"));
    expect(JSON.parse(window.localStorage.getItem("dnd-preset-2014-build-rogue-thief-2014-levels")!).targetLevel).toBe(5);
  });
});
