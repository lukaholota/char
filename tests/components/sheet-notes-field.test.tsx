// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { SheetNotesField } from "@/lib/components/characterSheet/SheetNotesField";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockNotesHeight(px: number) {
  vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockReturnValue(px);
}

describe("нотатки на листі не зливаються зі спорядженням", () => {
  it("короткі нотатки без кнопки й без обмеження висоти", () => {
    mockNotesHeight(100);
    render(<SheetNotesField value="коротко" onChange={() => {}} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("довгі нотатки обмежені екраном, а кнопка над ними розгортає й згортає назад", () => {
    mockNotesHeight(window.innerHeight * 2);
    render(<SheetNotesField value={"рядок\n".repeat(200)} onChange={() => {}} />);
    const notes = screen.getByLabelText("Нотатки");

    expect(notes.className).toContain("max-h-[60vh]");
    fireEvent.click(screen.getByRole("button", { name: "Розгорнути" }));
    expect(notes.className).not.toContain("max-h-[60vh]");

    fireEvent.click(screen.getByRole("button", { name: "Згорнути" }));
    expect(notes.className).toContain("max-h-[60vh]");
    expect(screen.getByRole("button", { name: "Розгорнути" }).getAttribute("aria-expanded")).toBe("false");
  });
});
