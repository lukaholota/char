// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OmniSearchPanel } from "@/components/search/OmniSearchPanel";
import { PER_CATEGORY_RESULT_QUOTA } from "@/lib/omniSearchData";
import { searchUserPersAndFolders, type UserSearchHit } from "@/server/db/pers-search-actions";
import { capturePostHogEvent } from "@/lib/monitoring/posthog-client";

const state = vi.hoisted(() => ({ edition: "2014" as "2014" | "2024", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: state.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/components/ui/PersEditionPin", () => ({ useActiveEdition: () => state.edition }));
vi.mock("@/components/no-ai/NoAiModeProvider", () => ({
  useNoAiHref: () => (href: string) => href,
  useNoAiMode: () => ({ enabled: false }),
}));
vi.mock("@/server/db/pers-search-actions", () => ({ searchUserPersAndFolders: vi.fn(async () => []) }));
vi.mock("@/server/db/homebrew-search-actions", () => ({ searchHomebrewEntries: vi.fn(async () => []) }));
vi.mock("@/lib/monitoring/posthog-client", () => ({ capturePostHogEvent: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.mocked(capturePostHogEvent).mockReset();
  vi.mocked(searchUserPersAndFolders).mockReset();
  vi.mocked(searchUserPersAndFolders).mockImplementation(async () => []);
  state.edition = "2014";
  state.push.mockReset();
});

function renderPanel() {
  render(<OmniSearchPanel onClose={() => undefined} />);
  return screen.getByPlaceholderText(/Пошук по платформі/);
}

function countRows(): number {
  return document.querySelectorAll("[data-omni-index]").length;
}

describe("KR36.3 — таби пошуку йдуть із реєстру за редакцією", () => {
  it("2014: є «Вливання Винахідника», немає «Приміщення бастіону»", () => {
    renderPanel();
    expect(screen.getAllByRole("button", { name: "Вливання Винахідника" }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: "Приміщення бастіону" })).toHaveLength(0);
  });

  it("2024: є «Приміщення бастіону», немає «Вливання Винахідника»", () => {
    state.edition = "2024";
    renderPanel();
    expect(screen.getAllByRole("button", { name: "Приміщення бастіону" }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: "Вливання Винахідника" })).toHaveLength(0);
  });

  it("плитка бастіонів у 2024 веде на /2024/bastions", () => {
    state.edition = "2024";
    renderPanel();
    fireEvent.click(screen.getAllByRole("button", { name: "Приміщення бастіону" }).at(-1)!);
    expect(state.push).toHaveBeenCalledWith("/2024/bastions");
  });
});

describe("KR36.4 — «ще K у каталозі» перемикає фільтр і живе в клавіатурній навігації", () => {
  it("клік по рядку залишає лише цей каталог і знімає квоту", () => {
    const input = renderPanel();
    fireEvent.change(input, { target: { value: "магія" } });

    const moreRow = screen.getAllByRole("button", { name: /^Ще \d+ у каталозі «Заклинання»/ })[0];
    const hidden = Number(moreRow.textContent!.match(/Ще (\d+)/)![1]);
    fireEvent.click(moreRow);

    expect(screen.queryByRole("button", { name: /^Ще \d+ у каталозі/ })).toBeNull();
    expect(countRows()).toBe(Math.min(50, PER_CATEGORY_RESULT_QUOTA + hidden));
    expect(screen.getByRole("button", { name: "Відкрити каталог" })).toBeTruthy();
  });

  it("Enter на рядку «ще K» перемикає фільтр, а не навігує", () => {
    const input = renderPanel();
    fireEvent.change(input, { target: { value: "магія" } });

    /// Саме «Заклинання»: каталог, який після перемикання влазить у 50 рядків цілком, тож
    /// зникнути мають усі рядки «ще K». У «Довідника правил» їх тисячі — там він лишається.
    const rows = [...document.querySelectorAll<HTMLElement>("[data-omni-index]")];
    const moreIndex = rows.findIndex((row) => /^Ще \d+ у каталозі «Заклинання»/.test(row.textContent ?? ""));
    expect(moreIndex).toBeGreaterThan(0);

    for (let step = 0; step < moreIndex; step += 1) fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(state.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Ще \d+ у каталозі/ })).toBeNull();
    const firstRow = document.querySelector<HTMLElement>('[data-omni-index="0"]')!;
    expect(within(firstRow).getAllByText("Заклинання").length).toBeGreaterThan(0);
  });

  it("Enter на результаті навігує на його адресу", () => {
    const input = renderPanel();
    fireEvent.change(input, { target: { value: "Вогнекуля" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(state.push).toHaveBeenCalledWith("/spells?q=%D0%92%D0%BE%D0%B3%D0%BD%D0%B5%D0%BA%D1%83%D0%BB%D1%8F");
  });
});

describe("порожня видача в поточній редакції показує іншу", () => {
  it("2014: «Sorcerous Burst» пояснює, що він є у 2024, і Enter веде на сторінку 2024", () => {
    const input = renderPanel();
    fireEvent.change(input, { target: { value: "Sorcerous Burst" } });

    expect(screen.getByText(/У редакції 2014 нічого не знайдено/)).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(state.push).toHaveBeenCalledWith(expect.stringMatching(/^\/2024\/spells\?q=/));
  });

  it("без збігів в обох редакціях — звичайне «Нічого не знайдено» з назвою редакції", () => {
    const input = renderPanel();
    fireEvent.change(input, { target: { value: "щзфхъжэ" } });

    expect(screen.getByText("Нічого не знайдено")).toBeTruthy();
    expect(screen.getByText(/в редакції 2014/)).toBeTruthy();
  });
});

describe("подія search_performed", () => {
  const SEARCH_IDLE_MS = 700;
  const SERVER_SEARCH_DELAY_MS = 200;

  function findSearchEvents() {
    return vi.mocked(capturePostHogEvent).mock.calls.filter(([event]) => event === "search_performed");
  }

  async function typeAndWaitForEvent(input: HTMLElement, value: string) {
    fireEvent.change(input, { target: { value } });
    await act(() => vi.advanceTimersByTimeAsync(SERVER_SEARCH_DELAY_MS));
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_IDLE_MS));
  }

  it("порожня видача не передає текст запиту", async () => {
    vi.useFakeTimers();
    const input = renderPanel();
    await typeAndWaitForEvent(input, "  щзфхъжэ ");

    expect(findSearchEvents()).toEqual([["search_performed", expect.objectContaining({ result_count: 0 })]]);
    expect(findSearchEvents()[0]?.[1]).not.toHaveProperty("query");
  });

  it("видача з результатами не передає текст запиту", async () => {
    vi.useFakeTimers();
    const input = renderPanel();
    await typeAndWaitForEvent(input, "Вогнекуля");

    const [[, properties]] = findSearchEvents();
    expect(properties).toMatchObject({ result_count: expect.any(Number) });
    expect((properties as { result_count: number }).result_count).toBeGreaterThan(0);
    expect(properties).not.toHaveProperty("query");
  });

  it("повільна відповідь сервера не дає хибної порожньої видачі", async () => {
    vi.useFakeTimers();
    let resolveHits: (hits: UserSearchHit[]) => void = () => undefined;
    vi.mocked(searchUserPersAndFolders).mockImplementation(() => new Promise((resolve) => { resolveHits = resolve; }));
    const input = renderPanel();
    fireEvent.change(input, { target: { value: "Мирослава" } });
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_IDLE_MS * 2));

    expect(findSearchEvents()).toEqual([]);

    await act(async () => resolveHits([{ kind: "pers", id: 1, title: "Мирослава", subtitle: "Бард 3", href: "/pers/1" }]));
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_IDLE_MS));

    expect(findSearchEvents()).toEqual([["search_performed", expect.objectContaining({ result_count: 1 })]]);
  });
});
