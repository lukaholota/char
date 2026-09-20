// @vitest-environment jsdom
//
// Модалку терміна відкриває посилання на правило, а не маркер звірки: рішення власника
// 2026-09-20 звело маркер до підказки з оригіналом і зняло з нього друге натискання (KR30.3).
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

describe("Маркер звірки нічого не відкриває", () => {
  it("скільки б разів не натиснути — лише підказка з оригіналом, без модалки й без адреси", async () => {
    const opened = collectTermOpenDetails();
    render(
      <p>
        <GlossaryTerm original="Insight">Проникливість</GlossaryTerm>
      </p>
    );
    const term = screen.getByRole("button", { name: /Проникливість — Insight/ });

    fireEvent.click(term);
    expect(screen.getByRole("tooltip").textContent).toBe("Insight");

    fireEvent.click(term);
    fireEvent.click(term);
    await new Promise((resolve) => setTimeout(resolve, 0));
    opened.stop();

    expect(opened.details).toEqual([]);
    expect(window.location.search).toBe("");
  });

  it("маркер у тексті не малює підкреслення посилання — воно лишилося за посиланнями на правила", () => {
    render(<FormattedDescription content="Проникливість{{Insight}} гобліна +1." />);

    expect(screen.queryByRole("link")).toBeNull();
    const term = screen.getByRole("button", { name: /Проникливість — Insight/ });
    expect(term.className).not.toContain("dotted");
    expect(term.textContent).toBe("Проникливістьen");
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
