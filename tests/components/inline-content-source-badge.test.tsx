// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { InlineContent } from "@/components/optimization/InlineContent";
import type { InlineNode, OptimizationRuleset } from "@/lib/optimization/types";

afterEach(cleanup);

const ABBREVIATIONS = "https://rpgbot.net/dnd5/abbreviations/";

function renderNodes(nodes: InlineNode[], ruleset: OptimizationRuleset = "RULES_2014", onHostClick = () => {}) {
  return render(
    <p data-testid="host" onClick={onHostClick}>
      <InlineContent nodes={nodes} resolveLink={(href) => ({ href, isExternal: true })} linkClassName="text-slate-100" ruleset={ruleset} />
    </p>
  );
}

function findRpgbotAbbreviationAnchors(container: HTMLElement) {
  return container.querySelectorAll('a[href*="abbreviations"]');
}

describe("позначки джерел RPGbot у статтях", () => {
  it("показує значок джерела замість посилання на RPGbot і прибирає дужки навколо нього", () => {
    const { container, getByTestId } = renderNodes([
      { type: "text", text: "Послушник " }, { type: "superscript", text: "(" }, { type: "link", text: "PHB", href: ABBREVIATIONS },
      { type: "superscript", text: ")" }, { type: "text", text: ": текст" },
    ]);
    expect(findRpgbotAbbreviationAnchors(container)).toHaveLength(0);
    expect(screen.getByRole("button", { name: "PHB" })).toBeTruthy();
    expect(getByTestId("host").textContent).toBe("Послушник  PHB: текст");
    expect(getByTestId("host").querySelector("div")).toBeNull();
  });

  it("підказка значка називає книгу й не передає клік батьківському елементу", () => {
    const onHostClick = vi.fn();
    renderNodes([{ type: "link", text: "XGtE", href: ABBREVIATIONS }], "RULES_2014", onHostClick);
    const badge = screen.getByRole("button", { name: "XGTE" });
    badge.getBoundingClientRect = () => new DOMRect(10, 10, 30, 16);
    fireEvent.keyDown(badge, { key: "Enter" });
    expect(screen.getByText("Довідник Занатара про все")).toBeTruthy();
    fireEvent.click(badge);
    expect(onHostClick).not.toHaveBeenCalled();
  });

  it("у статті 2024 позначає Книгу Гравця 2024 року", () => {
    renderNodes([{ type: "link", text: "PHB", href: ABBREVIATIONS }], "RULES_2024");
    expect(screen.getByRole("button", { name: "PHB 2024" })).toBeTruthy();
  });

  it("кілька джерел показує окремими значками через скісну риску", () => {
    const { getByTestId } = renderNodes([{ type: "link", text: "EEPC / XGtE", href: ABBREVIATIONS }]);
    expect(screen.getAllByRole("button").map((badge) => badge.textContent)).toEqual(["EEPC", "XGTE"]);
    expect(getByTestId("host").textContent).toBe(" EEPC / XGTE");
  });

  it("книгу без українського перекладу підписує англійською назвою", () => {
    renderNodes([{ type: "link", text: "EEPC", href: ABBREVIATIONS }]);
    const badge = screen.getByRole("button", { name: "EEPC" });
    badge.getBoundingClientRect = () => new DOMRect(10, 10, 30, 16);
    fireEvent.click(badge);
    expect(screen.getByText("Elemental Evil Player's Companion")).toBeTruthy();
  });

  it("назву книги в тексті речення лишає звичайним текстом без посилання", () => {
    const { container, getByTestId } = renderNodes([
      { type: "text", text: "Риса зʼявилася у " }, { type: "link", text: "Книзі Гравця (2014)", href: ABBREVIATIONS }, { type: "text", text: "." },
    ]);
    expect(container.querySelector("a")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(getByTestId("host").textContent).toBe("Риса зʼявилася у Книзі Гравця (2014).");
  });

  it("зберігає глосарні позначки в тексті, що випадково став посиланням на скорочення", () => {
    const { container } = renderNodes([{ type: "link", text: "{{Сфера Скореуса|Orb of Skoraeus}}", href: ABBREVIATIONS }]);
    expect(findRpgbotAbbreviationAnchors(container)).toHaveLength(0);
    expect(container.textContent).toContain("Сфера Скореуса");
    expect(container.textContent).not.toContain("{{");
  });
});
