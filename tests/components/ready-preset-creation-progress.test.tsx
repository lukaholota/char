// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadyPresetCreationProgress } from "@/components/optimization/ReadyPresetCreationProgress";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("прогрес створення персонажа", () => {
  it("називає кількість рівнів і лише згодом попереджає, що триває довше", () => {
    vi.useFakeTimers();
    render(<ReadyPresetCreationProgress levelCount={20} />);
    expect(screen.getByRole("status").textContent).toContain("Збираємо персонажа: 20 рівнів");
    expect(screen.queryByText(/довше, ніж зазвичай/)).toBeNull();
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(screen.getByText(/довше, ніж зазвичай/)).toBeTruthy();
  });

  it("для першого рівня каже просто «Створюємо персонажа»", () => {
    render(<ReadyPresetCreationProgress levelCount={1} />);
    expect(screen.getByRole("status").textContent).toContain("Створюємо персонажа");
  });
});
