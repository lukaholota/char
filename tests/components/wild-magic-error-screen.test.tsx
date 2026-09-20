// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

vi.mock("@/lib/components/problemReport/ReportProblemDialog", () => ({
  ReportProblemDialog: ({ open }: { open: boolean }) => (open ? <div>Діалог скарги відкритий</div> : null),
}));

vi.mock("@/components/errors/WildMagicSurgeTableDialog", () => ({
  WildMagicSurgeTableDialog: ({ open }: { open: boolean }) => (open ? <div>Таблиця Дикої магії відкрита</div> : null),
}));

import { WildMagicErrorScreen } from "@/components/errors/WildMagicErrorScreen";
import { WILD_MAGIC_ERROR_COPIES, findSeededCopyIndex } from "@/components/errors/wild-magic-error-copy";

afterEach(cleanup);

const titles = WILD_MAGIC_ERROR_COPIES.map((copy) => copy.title);

describe("Сторінка помилки — екран Сплеску дикої магії", () => {
  it("серверний рендер бере варіант із зерна, тож HTML для гідрації передбачуваний", () => {
    const seed = "server-digest";
    const html = renderToString(<WildMagicErrorScreen seed={seed} onRetry={() => {}} />);
    const expected = WILD_MAGIC_ERROR_COPIES[findSeededCopyIndex(seed)];
    expect(html).toContain(expected.title);
    expect(html).toContain(expected.description);
    expect(html).toContain("У таблиці Дикої магії випало");
    expect(html).toContain(expected.surgeRoll.replace("-", "–"));
    expect(html).not.toContain('href="/classes?class=sorcerer"');
    expect(html).toContain("Спробувати ще раз");
    expect(html).toContain("Повідомити про проблему");
    expect(html).not.toContain("@LukaHolota");
    expect(html).toContain('href="/"');
  });

  it("на клієнті показує один із варіантів і не міняє його між ререндерами", () => {
    const { rerender } = render(<WildMagicErrorScreen seed="x" onRetry={() => {}} />);
    const shown = screen.getByRole("heading", { level: 1 }).textContent;
    expect(titles).toContain(shown);
    rerender(<WildMagicErrorScreen seed="x" onRetry={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(shown);
  });

  it("«Спробувати ще раз» кличе reset, а «Повернутися на головну» — звичайне посилання на /", () => {
    const onRetry = vi.fn();
    render(<WildMagicErrorScreen seed="x" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Повернутися на головну" }).getAttribute("href")).toBe("/");
  });

  it("«Повідомити про проблему» відкриває наявний діалог скарги", () => {
    render(<WildMagicErrorScreen seed="x" onRetry={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Повідомити про проблему" }));
    expect(screen.getByText("Діалог скарги відкритий")).toBeTruthy();
  });

  it("діапазон у таблиці Дикої магії відкриває модалку на error-екрані", () => {
    render(<WildMagicErrorScreen seed="x" onRetry={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /У таблиці Дикої магії випало/ }));
    expect(screen.getByText("Таблиця Дикої магії відкрита")).toBeTruthy();
  });

  it("без reset лишається тільки повернення на головну", () => {
    render(<WildMagicErrorScreen />);
    expect(screen.queryByRole("button", { name: "Спробувати ще раз" })).toBeNull();
    expect(screen.getByRole("link", { name: "Повернутися на головну" })).toBeTruthy();
  });

  it("ілюстрація декоративна: порожній alt і файл на диску", async () => {
    render(<WildMagicErrorScreen />);
    const img = document.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
    const fs = await import("node:fs");
    expect(fs.existsSync("public/images/errors/wild-magic-surge.webp")).toBe(true);
  });
});
