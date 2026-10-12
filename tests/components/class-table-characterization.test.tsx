// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Ruleset } from "@prisma/client";

vi.mock("@/hooks/useModalBackButton", () => ({ useModalBackButton: () => {} }));

import { ClassTableView } from "@/components/classes/ClassTableView";
import { findClassTable } from "@/lib/catalogs/class-tables";

afterEach(cleanup);

const CLASSES = {
  RULES_2014: ["BARBARIAN_2014", "BARD_2014", "MONK_2014", "ROGUE_2014", "WARLOCK_2014", "ARTIFICER_2014", "FIGHTER_2014"],
  RULES_2024: ["BARD_2024", "WIZARD_2024", "MONK_2024", "PALADIN_2024"],
} as const;

function readClassTable(classKey: string, ruleset: Ruleset): string[][] {
  const classTable = findClassTable(classKey, ruleset);
  expect(classTable, classKey).toBeTruthy();
  render(<ClassTableView table={classTable!} />);
  const table = screen.getByRole("table");
  return [...table.querySelectorAll("tr")].map((row) => [...row.querySelectorAll("th,td")].map((cell) => cell.textContent?.trim() ?? ""));
}

describe("O44 — таблиця класу в конструкторі до виносу в спільний компонент", () => {
  for (const [ruleset, names] of Object.entries(CLASSES) as [keyof typeof CLASSES, readonly string[]][]) {
    for (const name of names) {
      it(`${name}: заголовки й клітинки`, () => {
        expect(readClassTable(name, ruleset)).toMatchSnapshot();
      });
    }
  }
});
