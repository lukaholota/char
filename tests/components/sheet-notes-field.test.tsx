// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

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

  it("згорнуті нотатки не перехоплюють дотик і не скроляться", () => {
    renderLongNotes();
    const notes = screen.getByLabelText("Нотатки");

    expect(notes.className).toContain("pointer-events-none");
    expect(notes.className).toContain("overflow-hidden");
    expect(notes.className).not.toContain("overflow-y-auto");
  });

  it("короткі нотатки лишаються звичайним полем без фейду", () => {
    mockNotesHeight(100);
    render(<SheetNotesField value="коротко" onChange={() => {}} />);
    const notes = screen.getByLabelText("Нотатки");

    expect(notes.className).not.toContain("pointer-events-none");
    expect(notes.className).not.toContain("mask-image");
    expect(screen.queryByText("Розгорнути")).toBeNull();
  });

  it("кнопка на фейді розгортає нотатки й зникає разом із фейдом", () => {
    renderLongNotes();
    const notes = screen.getByLabelText("Нотатки");
    expect(notes.className).toContain("mask-image");

    fireEvent.click(screen.getByText("Розгорнути", { selector: "span" }));

    expect(notes.className).not.toContain("max-h-[60vh]");
    expect(notes.className).not.toContain("mask-image");
    expect(screen.queryByText("Розгорнути")).toBeNull();
  });

  it("фокус із клавіатури розгортає нотатки, а «Згорнути» знімає фокус", () => {
    renderLongNotes();
    const notes = screen.getByLabelText("Нотатки");

    act(() => notes.focus());
    expect(notes.className).not.toContain("max-h-[60vh]");

    fireEvent.click(screen.getByRole("button", { name: "Згорнути" }));
    expect(document.activeElement).not.toBe(notes);
    expect(notes.className).toContain("pointer-events-none");
  });
});

function renderLongNotes() {
  mockNotesHeight(window.innerHeight * 2);
  render(<SheetNotesField value={"рядок\n".repeat(200)} onChange={() => {}} />);
}
