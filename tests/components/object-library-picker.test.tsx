// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectLibraryPicker } from "@/components/games/ObjectLibraryPicker";

vi.mock("@/lib/actions/game-sessions", () => ({
  listObjectLibraryAction: vi.fn(async () => ({ ok: true, value: [{ slug: "chest-1", category: "storage", widthCells: 1 }] })),
}));

afterEach(cleanup);

const findPreview = () => document.body.querySelector<HTMLImageElement>("[data-object-preview]");

describe("набір обʼєктів", () => {
  it("під мишею показує обʼєкт збільшеним, а після відведення ховає", async () => {
    render(<ObjectLibraryPicker onPick={vi.fn()} canDropAt={() => false} />);
    const cell = await screen.findByRole("button", { name: /^Поставити/ });

    fireEvent.pointerEnter(cell, { pointerType: "mouse" });
    expect(findPreview()?.src).toMatch(/library\/objects\/chest-1\.webp$/);

    fireEvent.pointerLeave(cell, { pointerType: "mouse" });
    expect(findPreview()).toBeNull();
  });

  it("дотик пальцем збільшення не показує — воно закривало б мапу під час перетягування", async () => {
    render(<ObjectLibraryPicker onPick={vi.fn()} canDropAt={() => false} />);
    const cell = await screen.findByRole("button", { name: /^Поставити/ });

    fireEvent.pointerEnter(cell, { pointerType: "touch" });
    expect(findPreview()).toBeNull();
  });
});
