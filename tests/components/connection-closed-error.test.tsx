// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const refresh = vi.fn();
const reportBoundaryError = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/monitoring/report-error", () => ({ reportBoundaryError: (error: unknown) => reportBoundaryError(error) }));
vi.mock("@/components/errors/WildMagicErrorScreen", () => ({
  WildMagicErrorScreen: ({ onRetry }: { onRetry: () => void }) => <button onClick={onRetry}>Загальна помилка</button>,
}));

import ErrorBoundary from "@/app/error";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("обрив RSC-відповіді на навігації", () => {
  it("показує втрату звʼязку замість загального екрана й повторює запит сторінки", () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("Connection closed.")} reset={reset} />);

    expect(screen.getByText("Звʼязок обірвався")).toBeTruthy();
    expect(screen.queryByText("Загальна помилка")).toBeNull();
    expect(screen.getByRole("alert").textContent).not.toContain("нічого не втрачено");
    expect(screen.getByRole("alert").textContent).toContain("перевірте, чи зміна на місці");

    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("не шле в моніторинг обрив, коли пристрій офлайн", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<ErrorBoundary error={new Error("Connection closed.")} reset={vi.fn()} />);

    expect(reportBoundaryError).not.toHaveBeenCalled();
  });

  it("лишає загальний екран для інших помилок", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary error={new Error("Something broke")} reset={vi.fn()} />);

    expect(screen.getByText("Загальна помилка")).toBeTruthy();
    expect(reportBoundaryError).toHaveBeenCalledTimes(1);
  });

  it("повтор на загальному екрані перезавантажує сторінку — reset не довантажує зламаний чанк", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("Failed to load chunk")} reset={reset} />);

    fireEvent.click(screen.getByText("Загальна помилка"));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
