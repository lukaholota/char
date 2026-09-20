// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import AddMagicItemDialog from "@/lib/components/characterSheet/AddMagicItemDialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

function openCatalogPath(ruleset: "RULES_2014" | "RULES_2024") {
  render(<AddMagicItemDialog persId={7} persName="Мирон" ruleset={ruleset} />);
  fireEvent.click(screen.getByRole("button", { name: "Додати" }));
  return new URL(screen.getByTitle("Магічні предмети").getAttribute("src") ?? "", "https://char.test").pathname;
}

describe("KR31.8 — «Додати магічний предмет» відкриває каталог редакції персонажа", () => {
  it("персонаж 2024 — каталог 2024", () => {
    expect(openCatalogPath("RULES_2024")).toBe("/2024/magic-items");
  });

  it("персонаж 2014 — каталог 2014", () => {
    expect(openCatalogPath("RULES_2014")).toBe("/magic-items");
  });
});
