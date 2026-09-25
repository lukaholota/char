// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/monitoring/report-error", () => ({ reportBoundaryError: vi.fn() }));
vi.mock("@/components/errors/WildMagicErrorScreen", () => ({ WildMagicErrorScreen: () => <div>Загальна помилка</div> }));

import ErrorBoundary from "@/app/error";

afterEach(cleanup);

describe("помилка старої Server Action після деплою", () => {
  it("пропонує оновити сторінку замість повторення тієї самої застарілої дії", () => {
    const error = new Error('Server Action "old-id" was not found on the server.');
    error.name = "UnrecognizedActionError";

    render(<ErrorBoundary error={error} reset={vi.fn()} />);

    expect(screen.getByText("Ця вкладка відкрита зі старою версією. Оновіть сторінку й повторіть дію.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Оновити сторінку" })).toBeTruthy();
    expect(screen.queryByText("Загальна помилка")).toBeNull();
  });
});
