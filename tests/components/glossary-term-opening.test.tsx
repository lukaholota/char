// @vitest-environment jsdom
//
// Модалка терміна відкривається лише після того, як чанк із карткою довантажився. На повільній
// мережі між дотиком і модалкою минають секунди — і все, що гравець встигає зробити за цей час,
// не має відкрити модалку вдруге чи впасти необробленою помилкою.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const pendingCards: Array<{ resolve: (card: unknown) => void; reject: (error: Error) => void }> = [];

vi.mock("@/lib/term-catalog-chunk", () => ({
  findTermCard: () => new Promise((resolve, reject) => pendingCards.push({ resolve, reject })),
}));
vi.mock("@/lib/term-card", () => ({ hasTermCardMoreThanOriginal: () => true }));

import { GlossaryTerm } from "@/components/ui/GlossaryTerm";
import { closeTermLink, TERM_OPEN_EVENT } from "@/lib/term-link";

function collectTermOpenDetails() {
  const details: unknown[] = [];
  const listener = (event: Event) => details.push((event as CustomEvent).detail);
  window.addEventListener(TERM_OPEN_EVENT, listener);
  return { details, stop: () => window.removeEventListener(TERM_OPEN_EVENT, listener) };
}

function renderInsight() {
  render(
    <p>
      <GlossaryTerm original="Insight">Проникливість</GlossaryTerm>
    </p>
  );
  return screen.getByRole("button", { name: /Проникливість — Insight/ });
}

beforeEach(() => {
  pendingCards.length = 0;
  window.history.replaceState({}, "", "/bestiary/goblin");
});

afterEach(() => {
  cleanup();
  closeTermLink();
});

describe("Модалка терміна, поки картка ще вантажиться", () => {
  it("повторні дотики під час завантаження не відкривають модалку вдруге", async () => {
    const opened = collectTermOpenDetails();
    const term = renderInsight();

    fireEvent.click(term);
    fireEvent.click(term);
    fireEvent.click(term);
    fireEvent.click(term);

    await act(async () => {
      for (const card of pendingCards) card.resolve({});
    });
    opened.stop();

    expect(opened.details).toHaveLength(1);
  });

  it("картка не довантажилась — лишається підказка з оригіналом, без необробленої помилки", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    const opened = collectTermOpenDetails();
    const term = renderInsight();

    fireEvent.click(term);
    fireEvent.click(term);
    await act(async () => {
      pendingCards[0].reject(new Error("Failed to fetch dynamically imported module"));
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", onUnhandled);
    opened.stop();

    expect(unhandled).toEqual([]);
    expect(opened.details).toEqual([]);
    expect(screen.getByRole("tooltip").textContent).toBe("Insight");

    fireEvent.click(term);
    expect(pendingCards).toHaveLength(2);
  });
});
