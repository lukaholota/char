// @vitest-environment jsdom
//
// KR30.3 — маркер `термін{{Original}}` стає посиланням: перше натискання показує оригінал
// (KR30.1), друге відкриває модалку терміна; редакція береться зі сторінки, а не з маркера.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { GlossaryTerm } from "@/components/ui/GlossaryTerm";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { findTermCard } from "@/lib/term-catalog-chunk";
import { closeTermLink, findRulesetInPathname, findTermLinkInSearch, TERM_OPEN_EVENT } from "@/lib/term-link";

function collectTermOpenDetails() {
  const details: unknown[] = [];
  const listener = (event: Event) => details.push((event as CustomEvent).detail);
  window.addEventListener(TERM_OPEN_EVENT, listener);
  return { details, stop: () => window.removeEventListener(TERM_OPEN_EVENT, listener) };
}

/// Модалка відкривається лише після того, як чанк із картками терміна довантажився. Перше
/// завантаження під повним набором довше за секунду `waitFor`, і подія долітала в наступний тест.
beforeAll(async () => {
  await findTermCard({ original: "Insight", ruleset: "RULES_2014" });
}, 30_000);

beforeEach(() => {
  window.history.replaceState({}, "", "/bestiary/goblin");
});

afterEach(cleanup);

describe("KR30.3 — маркер відкриває модалку терміна", () => {
  it("перше натискання показує оригінал, друге відкриває термін — подією і адресою", async () => {
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
    await waitFor(() => expect(opened.details).toHaveLength(1));
    opened.stop();

    expect(opened.details).toEqual([{ original: "Insight", ruleset: "RULES_2014", term: "Проникливість" }]);
    expect(window.location.search).toBe("?term=Insight");
  });

  it("на дотику фокус, що приходить перед кліком, не перетворює перший дотик на модалку", async () => {
    const opened = collectTermOpenDetails();
    render(
      <p>
        <GlossaryTerm original="Insight">Проникливість</GlossaryTerm>
      </p>
    );
    const term = screen.getByRole("button", { name: /Проникливість — Insight/ });

    fireEvent.pointerDown(term, { pointerType: "touch" });
    fireEvent.focus(term);
    fireEvent.click(term);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(opened.details).toEqual([]);

    fireEvent.pointerDown(term, { pointerType: "touch" });
    fireEvent.click(term);
    await waitFor(() => expect(opened.details).toHaveLength(1));
    opened.stop();
    expect(opened.details).toEqual([{ original: "Insight", ruleset: "RULES_2014", term: "Проникливість" }]);
  });

  it("на сторінці 2024 термін відкривається в редакції 2024", async () => {
    window.history.replaceState({}, "", "/2024/bestiary/goblin");
    const opened = collectTermOpenDetails();
    render(<FormattedDescription content="Проникливість{{Insight}} гобліна +1." />);
    const term = screen.getByRole("button", { name: /Проникливість — Insight/ });

    fireEvent.click(term);
    fireEvent.click(term);
    await waitFor(() => expect(opened.details).toHaveLength(1));
    opened.stop();

    expect(opened.details).toEqual([{ original: "Insight", ruleset: "RULES_2024", term: "Проникливість" }]);
    expect(window.location.search).toBe("?term=Insight&term-edition=2024");
  });

  it("термін, про який відомий лише оригінал, модалку не відкриває — оригінал уже в підказці", async () => {
    const opened = collectTermOpenDetails();
    render(<FormattedDescription content="Мультиатака{{Multiattack}}. Гоблін робить дві атаки." />);
    const term = screen.getByRole("button", { name: /Мультиатака — Multiattack/ });

    fireEvent.click(term);
    fireEvent.click(term);
    await findTermCard({ original: "Multiattack", ruleset: "RULES_2014" });
    opened.stop();

    expect(opened.details).toEqual([]);
    expect(window.location.search).toBe("");
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

describe("KR34.2 — якір на стан чи дію відкриває модалку терміна", () => {
  it("клік по якорю стану відкриває термін на місці, редакція — з адреси якоря", () => {
    window.history.replaceState({}, "", "/2024/spells/hold-person");
    const opened = collectTermOpenDetails();
    render(<FormattedDescription content={'Ціль стає <a href="/rules/conditions#condition-paralyzed">паралізованою</a>.'} />);
    const link = screen.getByRole("link", { name: "паралізованою" });

    const notPrevented = fireEvent.click(link);
    opened.stop();

    expect(notPrevented).toBe(false);
    expect(opened.details).toEqual([{ original: "Paralyzed", ruleset: "RULES_2014", term: "" }]);
    expect(window.location.pathname).toBe("/2024/spells/hold-person");
    expect(window.location.search).toBe("?term=Paralyzed");
  });

  it("якір дії 2024 відкриває 2024 і тримає справжню адресу довідника для прямого заходу", () => {
    const opened = collectTermOpenDetails();
    render(<FormattedDescription content={'Бонусною <a href="/2024/rules/combat#bonus-action--bonus-action">дією</a>.'} />);
    const link = screen.getByRole("link", { name: "дією" });

    expect(link.getAttribute("href")).toBe("/2024/rules/combat#bonus-action--bonus-action");
    fireEvent.click(link);
    opened.stop();

    expect(opened.details).toEqual([{ original: "Bonus Action", ruleset: "RULES_2024", term: "" }]);
  });

  it("посилання на довідник, якого немає в реєстрі, лишається звичайним переходом", () => {
    const opened = collectTermOpenDetails();
    render(<FormattedDescription content={'Див. <a href="/rules/combat#mounted-combat">верховий бій</a>.'} />);

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "верховий бій" }));
    opened.stop();

    expect(notPrevented).toBe(true);
    expect(opened.details).toEqual([]);
  });
});

describe("KR34.4 — термін поверх модалки заклинання", () => {
  it("закриття терміна не забирає в заклинання його редакцію", () => {
    window.history.replaceState({}, "", "/bestiary/goblin?spell=web&edition=2024");
    render(<FormattedDescription content={'<a href="/2024/rules/conditions#condition-restrained">Скований</a>'} />);

    fireEvent.click(screen.getByRole("link", { name: "Скований" }));
    closeTermLink();

    expect(window.location.search).toBe("?spell=web&edition=2024");
  });

  it("термін 2014 поверх заклинання 2024 не перемикає заклинання на 2014", () => {
    window.history.replaceState({}, "", "/bestiary/goblin?spell=web&edition=2024");
    render(<FormattedDescription content={'<a href="/rules/conditions#condition-restrained">скований</a>'} />);

    fireEvent.click(screen.getByRole("link", { name: "скований" }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("edition")).toBe("2024");
    expect(findTermLinkInSearch(window.location.search)).toEqual({ original: "Restrained", ruleset: "RULES_2014" });
  });

  it("давнє посилання `?term=…&edition=2024` без заклинання й далі відкриває 2024", () => {
    expect(findTermLinkInSearch("?term=Multiattack&edition=2024")).toEqual({ original: "Multiattack", ruleset: "RULES_2024" });
  });
});
