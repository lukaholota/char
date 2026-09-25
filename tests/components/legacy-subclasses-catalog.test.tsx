// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ClassDetailCard } from "@/components/classes/ClassDetailCard";
import { SubclassListDialogBody } from "@/lib/components/characterCreator/modals/SubclassListDialogBody";
import type { ClassData, SubclassData } from "@/lib/classesData";

afterEach(cleanup);

function buildSubclass(key: string, name: string, legacy: boolean, source: string): SubclassData {
  return { subclassId: key.length, key, slug: key.toLowerCase(), name, engName: key, description: null, source, legacy, features: [] };
}

const warlock2024: ClassData = {
  classId: 30,
  key: "WARLOCK_2024",
  slug: "warlock",
  name: "Чорнокнижник",
  engName: "Warlock",
  description: null,
  hitDie: 8,
  savingThrows: [],
  armorProficiencies: [],
  toolProficiencies: [],
  skillChoices: { options: [], count: 0 },
  spellcasting: null,
  castingStat: null,
  subclassLevel: 3,
  abilityScoreUpLevels: [],
  features: [],
  subclasses: [
    buildSubclass("FIEND_PATRON", "Патрон-Почвара", false, "PHB_2024"),
    buildSubclass("THE_GENIE", "Джин", true, "TCOE"),
    buildSubclass("HEXBLADE", "Відьмацький клинок", true, "XGTE"),
  ],
  imageSrc: null,
  source: "PHB_2024",
  ruleset: "RULES_2024",
};

describe("O43 — легасі-підкласи в каталозі /2024/classes (Р52)", () => {
  it("підкласи PHB 2024 і «Зі старих книг» — окремі секції, лічильник першої без легасі", async () => {
    render(<ClassDetailCard characterClass={warlock2024} is2024 />);

    expect(await screen.findByText("Підкласи (1) · з 3 рівня")).toBeTruthy();
    expect(screen.getByText("Зі старих книг (2)")).toBeTruthy();
    expect(screen.getByText("Казан Таші з усім")).toBeTruthy();
    expect(screen.getByText("Довідник Занатара про все")).toBeTruthy();
  });

  it("клас без легасі секції «Зі старих книг» не має", async () => {
    render(<ClassDetailCard characterClass={{ ...warlock2024, subclasses: [warlock2024.subclasses[0]] }} is2024 />);

    expect(await screen.findByText("Підкласи (1) · з 3 рівня")).toBeTruthy();
    expect(screen.queryByText(/Зі старих книг/)).toBeNull();
  });
});

describe("O43 — легасі-підкласи в модалці класу", () => {
  it("блок «Зі старих книг» іде після підкласів PHB 2024, з назвою книги", () => {
    render(
      <SubclassListDialogBody
        current={[{ subclassId: 1, name: "FIEND_PATRON", legacySource: null }]}
        legacy={[{ subclassId: 2, name: "THE_GENIE", legacySource: "TCOE" }]}
        isLoading={false}
      />,
    );

    const block = screen.getByRole("region", { name: "Зі старих книг" });
    expect(block.textContent).toContain("Казан Таші з усім");
    expect(screen.getAllByRole("button").length).toBe(2);
  });

  it("без легасі блоку немає", () => {
    render(<SubclassListDialogBody current={[{ subclassId: 1, name: "FIEND_PATRON", legacySource: null }]} legacy={[]} isLoading={false} />);

    expect(screen.queryByRole("region", { name: "Зі старих книг" })).toBeNull();
  });
});
