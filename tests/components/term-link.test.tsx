// @vitest-environment jsdom
//
// KR30.3 — маркер `термін{{Original}}` стає посиланням: перше натискання показує оригінал
// (KR30.1), друге відкриває модалку терміна; редакція береться зі сторінки, а не з маркера.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { GlossaryTerm } from "@/components/ui/GlossaryTerm";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { closeTermLink, findRulesetInPathname, findTermLinkInSearch, TERM_OPEN_EVENT } from "@/lib/term-link";

function collectTermOpenDetails() {
  const details: unknown[] = [];
  const listener = (event: Event) => details.push((event as CustomEvent).detail);
  window.addEventListener(TERM_OPEN_EVENT, listener);
  return { details, stop: () => window.removeEventListener(TERM_OPEN_EVENT, listener) };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/bestiary/goblin");
});

afterEach(cleanup);

describe("KR30.3 — маркер відкриває модалку терміна", () => {
  it("перше натискання показує оригінал, друге відкриває термін — подією і адресою", () => {
    const opened = collectTermOpenDetails();
    render(
      <p>
        <GlossaryTerm original="Insight">Проникливість</GlossaryTerm>
      </p>
    );
    const term = screen.getByRole("button", { name: /Проникливість — Insight/ });

    fireEvent.click(term);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(opened.details).toEqual([]);

    fireEvent.click(term);
    opened.stop();

    expect(opened.details).toEqual([{ original: "Insight", ruleset: "RULES_2014", term: "Проникливість" }]);
    expect(window.location.search).toBe("?term=Insight");
  });

  it("на дотику фокус, що приходить перед кліком, не перетворює перший дотик на модалку", () => {
    const opened = collectTermOpenDetails();
    render(
      <p>
        <GlossaryTerm original="Pack Tactics">Тактика зграї</GlossaryTerm>
      </p>
    );
    const term = screen.getByRole("button", { name: /Тактика зграї — Pack Tactics/ });

    fireEvent.pointerDown(term, { pointerType: "touch" });
    fireEvent.focus(term);
    fireEvent.click(term);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(opened.details).toEqual([]);

    fireEvent.pointerDown(term, { pointerType: "touch" });
    fireEvent.click(term);
    opened.stop();
    expect(opened.details).toEqual([{ original: "Pack Tactics", ruleset: "RULES_2014", term: "Тактика зграї" }]);
  });

  it("на сторінці 2024 термін відкривається в редакції 2024", () => {
    window.history.replaceState({}, "", "/2024/bestiary/goblin");
    const opened = collectTermOpenDetails();
    render(<FormattedDescription content="Мультиатака{{Multiattack}}. Гоблін робить дві атаки." />);
    const term = screen.getByRole("button", { name: /Мультиатака — Multiattack/ });

    fireEvent.click(term);
    fireEvent.click(term);
    opened.stop();

    expect(opened.details).toEqual([{ original: "Multiattack", ruleset: "RULES_2024", term: "Мультиатака" }]);
    expect(window.location.search).toBe("?term=Multiattack&edition=2024");
  });

  it("закриття прибирає термін з адреси, не чіпаючи решти параметрів", () => {
    window.history.replaceState({}, "", "/spells?level=3&term=Insight&edition=2024");
    closeTermLink();
    expect(window.location.search).toBe("?level=3");
  });
});

describe("KR30.3 — адреса терміна", () => {
  it("читає термін і редакцію з параметрів", () => {
    expect(findTermLinkInSearch("?term=Legendary%20Resistance&edition=2024")).toEqual({
      original: "Legendary Resistance",
      ruleset: "RULES_2024",
    });
    expect(findTermLinkInSearch("?term=Insight")).toEqual({ original: "Insight", ruleset: "RULES_2014" });
    expect(findTermLinkInSearch("?spell=1352")).toBeNull();
  });

  it("редакцію сторінки визначає сегмент 2024 в адресі, зокрема й у режимі без ШІ", () => {
    expect(findRulesetInPathname("/no-ai/2024/classes/druid")).toBe("RULES_2024");
    expect(findRulesetInPathname("/bestiary/goblin")).toBe("RULES_2014");
  });
});
