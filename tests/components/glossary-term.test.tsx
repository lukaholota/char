// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { GlossaryTerm } from "@/components/ui/GlossaryTerm";

afterEach(cleanup);

/// Рішення власника 2026-09-02: оригінал показується плаваючою підказкою, а не текстом у
/// потоці. Попередня версія дописувала «[Insight]» поруч із терміном — на статблоці з десятком
/// термінів кожне натискання зсувало весь текст після себе.
function renderTerm() {
  render(
    <p>
      <GlossaryTerm original="Insight">аналіз поведінки</GlossaryTerm> перевіряє намір.
    </p>
  );
  return screen.getByRole("button", { name: /аналіз поведінки — Insight/ });
}

describe("GlossaryTerm", () => {
  it("не показує оригінал, доки читач не попросив", () => {
    renderTerm();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("не вставляє оригінал у текст абзацу — підказка поза потоком", () => {
    const term = renderTerm();
    fireEvent.click(term);

    const paragraph = term.closest("p");
    const bubble = screen.getByRole("tooltip");
    expect(bubble.textContent).toBe("Insight");
    expect(bubble.className).toContain("absolute");

    /// Текст у потоці — усе, крім самої підказки: він має лишитися рівно тим, що був до кліку.
    const inFlow = paragraph?.textContent?.replace(bubble.textContent ?? "", "");
    expect(inFlow).toBe("аналіз поведінки перевіряє намір.");
    expect(paragraph?.textContent).not.toContain("[Insight]");
  });

  it("на дотику перше натискання відкриває підказку, друге ховає її й передає термін модалці (KR30.3)", () => {
    const term = renderTerm();
    fireEvent.click(term);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.click(term);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("мишею відкриває на наведення й закриває, коли курсор пішов", () => {
    const term = renderTerm();
    fireEvent.pointerEnter(term, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.pointerLeave(term, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("дотик поза терміном закриває підказку", () => {
    const term = renderTerm();
    fireEvent.click(term);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("Escape закриває, Enter перемикає з клавіатури", () => {
    const term = renderTerm();
    fireEvent.keyDown(term, { key: "Enter" });
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(term, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("без оригіналу малює лише текст", () => {
    render(<GlossaryTerm original="">просто слово</GlossaryTerm>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("просто слово")).toBeTruthy();
  });
});
