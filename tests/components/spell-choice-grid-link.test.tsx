// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/spell-link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/spell-link")>()),
  openSpellLink: vi.fn(),
}));

import { SpellChoiceGrid } from "@/components/spells/SpellChoiceGrid";
import { openSpellLink } from "@/lib/spell-link";

afterEach(cleanup);

const renderGrid = (ruleset: "RULES_2014" | "RULES_2024") =>
  render(
    <SpellChoiceGrid
      spells={[
        { spellId: 81, name: "Сон", engName: "Sleep", level: 1, school: "ENCHANTMENT", spellLists: ["Бард"], ruleset, castingTime: "1 дія", isRitual: true, isConcentration: true },
      ]}
      selectedIds={[]}
      limit={1}
      onChange={() => {}}
      findGroupLabel={() => "1-й рівень"}
    />,
  );

describe("картка вибору заклинання — та сама, що в каталозі", () => {
  it("назва з оригіналом, рівень, час накладання, школа, ритуал і концентрація", () => {
    renderGrid("RULES_2014");
    const card = screen.getByRole("button", { name: "Сон" });

    expect(card.textContent).toContain("Сон [Sleep]");
    for (const fact of ["Рівень 1", "Причарування", "Ритуал", "Концентрація"]) expect(card.textContent).toContain(fact);
    expect(card.textContent).not.toContain("—");
  });

  it("назва, що вже несе оригінал у дужках, не дублює його", () => {
    render(
      <SpellChoiceGrid
        spells={[{ spellId: 82, name: "Героїзм [Heroism]", engName: "Heroism", level: 1, school: "ENCHANTMENT", ruleset: "RULES_2014" }]}
        selectedIds={[]}
        limit={1}
        onChange={() => {}}
        findGroupLabel={() => "1-й рівень"}
      />,
    );

    expect(screen.getByRole("button", { name: "Героїзм [Heroism]" }).textContent).toMatch(/^Героїзм \[Heroism\] ?Рівень 1/);
  });
});

describe("кнопка опису в сітці вибору заклинань відкриває заклинання його редакції", () => {
  it("2014 — за номером заклинання, 2024 — за slug", () => {
    renderGrid("RULES_2014");
    fireEvent.click(screen.getByRole("button", { name: "Опис: Сон" }));
    expect(openSpellLink).toHaveBeenLastCalledWith({ spellKey: "81", ruleset: "RULES_2014" });
    cleanup();

    renderGrid("RULES_2024");
    fireEvent.click(screen.getByRole("button", { name: "Опис: Сон" }));
    expect(openSpellLink).toHaveBeenLastCalledWith({ spellKey: "sleep", ruleset: "RULES_2024" });
  });
});
