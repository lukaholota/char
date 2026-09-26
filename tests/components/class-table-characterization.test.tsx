// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/actions/class-actions", () => ({ getSubclassesByClassId: vi.fn(async () => []) }));
vi.mock("@/hooks/useModalBackButton", () => ({ useModalBackButton: () => {} }));

import { ClassInfoModal } from "@/lib/components/characterCreator/modals/ClassInfoModal";
import { findCharacterCreatorOptions } from "@/lib/content/creator-content";

afterEach(cleanup);

const CLASSES = {
  RULES_2014: ["BARBARIAN_2014", "BARD_2014", "MONK_2014", "ROGUE_2014", "WARLOCK_2014", "ARTIFICER_2014", "FIGHTER_2014"],
  RULES_2024: ["BARD_2024", "WIZARD_2024", "MONK_2024", "PALADIN_2024"],
} as const;

function readClassTable(cls: Parameters<typeof ClassInfoModal>[0]["cls"]): string[][] {
  render(<ClassInfoModal cls={cls} trigger={<button type="button">відкрити</button>} />);
  fireEvent.click(screen.getByRole("button", { name: "відкрити" }));
  fireEvent.click(screen.getByRole("button", { name: "Таблиця класу" }));
  const table = screen.getByRole("table");
  return [...table.querySelectorAll("tr")].map((row) => [...row.querySelectorAll("th,td")].map((cell) => cell.textContent?.trim() ?? ""));
}

describe("O44 — таблиця класу в конструкторі до виносу в спільний компонент", () => {
  for (const [ruleset, names] of Object.entries(CLASSES) as [keyof typeof CLASSES, readonly string[]][]) {
    for (const name of names) {
      it(`${name}: заголовки й клітинки`, () => {
        const cls = findCharacterCreatorOptions(ruleset).classes.find((candidate) => candidate.name === name);
        expect(cls, name).toBeTruthy();

        expect(readClassTable(cls!)).toMatchSnapshot();
      });
    }
  }
});
