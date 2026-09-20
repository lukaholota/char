// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { GlossaryTerm } from "@/components/ui/GlossaryTerm";
import type { TermCard } from "@/lib/term-card";
import { TERM_OPEN_EVENT } from "@/lib/term-link";

const cardOnClick = vi.hoisted(() => ({ current: null as TermCard | null }));
vi.mock("@/lib/term-catalog-chunk", () => ({ findTermCard: async () => cardOnClick.current }));

afterEach(cleanup);

function buildCard(overrides: Partial<TermCard> = {}): TermCard {
  return {
    original: "Insight",
    ruleset: "RULES_2014",
    dictionary: [],
    aliases: [],
    article: null,
    condition: null,
    otherEdition: null,
    catalog: null,
    ...overrides,
  };
}

function listenForTermOpen(): string[] {
  const opened: string[] = [];
  window.addEventListener(TERM_OPEN_EVENT, (event) => opened.push((event as CustomEvent).detail.original));
  return opened;
}

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

  it("на дотику перше натискання відкриває підказку, друге ховає її й передає термін модалці (KR30.3)", async () => {
    cardOnClick.current = buildCard({
      article: { title: "Аналіз поведінки", summary: "", href: "/rules/skills#insight", ruleset: "RULES_2014", subsection: null },
    });
    const opened = listenForTermOpen();
    const term = renderTerm();
    fireEvent.click(term);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.click(term);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(opened).toContain("Insight");
  });

  it("коли про термін немає нічого, крім оригіналу, друге натискання модалку не відкриває", async () => {
    cardOnClick.current = buildCard({ dictionary: [{ term: "аналіз поведінки", section: "навички" }] });
    const opened = listenForTermOpen();
    const term = renderTerm();
    fireEvent.click(term);
    fireEvent.click(term);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(opened).toEqual([]);
    expect(screen.getByRole("tooltip").textContent).toBe("Insight");
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
