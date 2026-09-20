// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OmniSearchPanel } from "@/components/search/OmniSearchPanel";
import { PER_CATEGORY_RESULT_QUOTA } from "@/lib/omniSearchData";

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

afterEach(() => {
  cleanup();
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
