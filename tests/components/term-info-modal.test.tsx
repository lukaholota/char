// @vitest-environment jsdom
//
// KR30.3 — модалка терміна: стаття чи стан ідуть одразу під заголовком, а словникова форма
// показується лише тоді, коли вона відрізняється від слова, на яке натиснули, і без назви
// розділу словника — у 97 % випадків вона повторювала заголовок (виміряно 2026-09-18).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

import type { TermCard } from "@/lib/term-card";

vi.mock("next/navigation", () => ({ usePathname: () => "/2024/rules/bastions" }));

const cardForTest = vi.hoisted(() => ({ current: null as TermCard | null }));
vi.mock("@/lib/term-catalog-chunk", () => ({
  findTermCard: () => Promise.resolve(cardForTest.current),
}));

import { NoAiModeProvider } from "@/components/no-ai/NoAiModeProvider";
import { TermInfoModal } from "@/components/rules/TermInfoModal";
import { TERM_OPEN_EVENT } from "@/lib/term-link";

const emptyCard: TermCard = {
  original: "Bastion",
  ruleset: "RULES_2024",
  dictionary: [],
  aliases: [],
  article: null,
  condition: null,
  otherEdition: null,
  catalog: null,
};

const bastionArticle: TermCard["article"] = {
  title: "Бастіони",
  summary: "Бастіон — це місце, що належить персонажу гравця.",
  href: "/2024/rules/bastions#bastions",
  ruleset: "RULES_2024",
  subsection: null,
};

const paralyzedCondition: TermCard["condition"] = {
  name: "Паралізований",
  description: "Істота не може рухатися.",
  bulletPoints: ["Автоматично провалює рятівні кидки Сили."],
  href: "/2024/rules/conditions#condition-paralyzed",
  ruleset: "RULES_2024",
};

async function openTerm(card: TermCard, clickedTerm: string) {
  cardForTest.current = card;
  render(
    <NoAiModeProvider>
      <TermInfoModal />
    </NoAiModeProvider>
  );
  act(() => {
    window.dispatchEvent(
      new CustomEvent(TERM_OPEN_EVENT, { detail: { original: card.original, ruleset: card.ruleset, term: clickedTerm } })
    );
  });
  await waitFor(() => expect(screen.queryByText(card.original)).toBeTruthy());
  const dialog = await screen.findByRole("dialog");
  await waitFor(() => expect(dialog.querySelector(".animate-pulse")).toBeNull());
  return dialog;
}

function listSectionLabels(dialog: HTMLElement): string[] {
  return [...dialog.querySelectorAll(".glass-panel > div:first-child")].map((node) => node.textContent ?? "");
}

beforeEach(() => {
  window.history.replaceState({}, "", "/2024/rules/bastions");
});

afterEach(() => {
  cleanup();
  cardForTest.current = null;
});

it("uses the Ukrainian rule subsection as the title when the dictionary has no entry", async () => {
  await openTerm({ ...emptyCard, original: "Alchemist's Supplies", ruleset: "RULES_2014", article: {
    title: "Володіння інструментами", summary: "Правила інструментів", ruleset: "RULES_2014",
    href: "/rules/tool-proficiencies#alchemist", subsection: { title: "Приладдя алхіміка", content: "Алхімічне ремесло." },
  } }, "");
  expect(screen.getByRole("heading", { name: "Приладдя алхіміка" })).toBeTruthy();
});

it("restores a term's Ukrainian title and description together when going back from another term", async () => {
  const firstCard: TermCard = { ...emptyCard, original: "Bastion", dictionary: [{ term: "Бастіон", section: "правила 2024" }], article: bastionArticle };
  const secondCard: TermCard = { ...emptyCard, original: "Paralyzed", dictionary: [{ term: "Паралізований", section: "стани" }], condition: paralyzedCondition };
  window.history.pushState({}, "", "/2024/rules/bastions?term=Bastion&term-edition=2024");
  await openTerm(firstCard, "Бастіон");
  expect(screen.getByRole("heading", { name: "Бастіон", exact: true })).toBeTruthy();

  cardForTest.current = secondCard;
  act(() => {
    window.history.pushState({}, "", "/2024/rules/bastions?term=Paralyzed&term-edition=2024");
    window.dispatchEvent(new CustomEvent(TERM_OPEN_EVENT, { detail: { original: "Paralyzed", ruleset: "RULES_2024", term: "паралізованою" } }));
  });
  await screen.findByText("Істота не може рухатися.");
  expect(screen.getByRole("heading", { name: "паралізованою", exact: true })).toBeTruthy();

  cardForTest.current = firstCard;
  act(() => window.history.back());
  await screen.findByText("Бастіон — це місце, що належить персонажу гравця.");
  expect(screen.getByRole("heading", { name: "Бастіон", exact: true })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "паралізованою", exact: true })).toBeNull();
});

describe("KR30.3 — порядок секцій модалки терміна", () => {
  it("стаття йде першою, а словникова форма, що повторює заголовок, не показується", async () => {
    const dialog = await openTerm(
      { ...emptyCard, dictionary: [{ term: "Бастіон", section: "правила 2024" }], article: bastionArticle },
      "Бастіон"
    );

    expect(listSectionLabels(dialog)).toEqual(["Довідник 2024"]);
    expect(screen.queryByText("У словнику")).toBeNull();
    expect(screen.queryByText(/правила 2024/)).toBeNull();
  });

  it("стан іде перед статтею, словник при них не показується навіть з іншою формою", async () => {
    const dialog = await openTerm(
      {
        ...emptyCard,
        original: "Paralyzed",
        dictionary: [{ term: "Паралізований", section: "стани" }],
        condition: paralyzedCondition,
        article: { ...bastionArticle, title: "Стани", href: "/2024/rules/conditions#conditions" },
      },
      "паралізованою"
    );

    expect(listSectionLabels(dialog)).toEqual(["Стан · довідник 2024", "Довідник 2024"]);
    expect(screen.queryByText("У словнику")).toBeNull();
  });

  it("без статті й стану словникова форма показується, коли відрізняється від натиснутого слова", async () => {
    const dialog = await openTerm(
      { ...emptyCard, original: "Claw", dictionary: [{ term: "Кіготь", section: "риси статблока" }] },
      "Пазур"
    );

    expect(listSectionLabels(dialog)).toEqual(["У словнику"]);
    expect(screen.getByText("Кіготь")).toBeTruthy();
    expect(screen.queryByText(/риси статблока/)).toBeNull();
  });

  it("без статті й стану словникова форма, що дорівнює натиснутому слову, ховається разом із секцією", async () => {
    const dialog = await openTerm(
      { ...emptyCard, original: "Gore", dictionary: [{ term: "Буцання", section: "риси статблока" }] },
      "буцання"
    );

    expect(listSectionLabels(dialog)).toEqual([]);
    expect(screen.getByText(/Окремої статті в довіднику про цей термін немає/)).toBeTruthy();
  });

  it("інші написання й каталог ідуть після статті", async () => {
    const dialog = await openTerm(
      {
        ...emptyCard,
        original: "Greatsword",
        aliases: ["дворучний меч"],
        article: { ...bastionArticle, title: "Зброя" },
        catalog: { kind: "weapon", name: "Великий меч", href: "/weapons/greatsword" },
      },
      "Великий меч"
    );

    expect(listSectionLabels(dialog)).toEqual(["Довідник 2024", "Інші написання, за якими це шукають", "У каталозі"]);
  });
});
