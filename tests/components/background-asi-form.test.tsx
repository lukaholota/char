// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { BackgroundAsiForm } from "@/lib/components/characterCreator/BackgroundAsiForm";
import { findBackgroundAsiStep, startBackgroundAsiDraft } from "@/rules/background-asi";

afterEach(cleanup);

const soldierStep = findBackgroundAsiStep("RULES_2024", ["STR", "DEX", "CON"])!;
const scoresBefore = { STR: 15, DEX: 13, CON: 14, INT: 10, WIS: 12, CHA: 8 };

describe("KR18.2 — екран бонусів походження у режимі 2024", () => {
  it("показує рівно три дозволені характеристики походження, а не всі шість", () => {
    render(<BackgroundAsiForm step={soldierStep} background={{ name: "SOLDIER_2024" }} draft={null} scoresBefore={scoresBefore} onChange={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /Сила/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Мудрість/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Харизма/ })).toBeNull();
  });

  it("перемикає режим на +1/+1/+1 і сам проставляє всі три характеристики", () => {
    const onChange = vi.fn();
    render(<BackgroundAsiForm step={soldierStep} background={{ name: "SOLDIER_2024" }} draft={null} scoresBefore={scoresBefore} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "+1 до всіх трьох" }));

    expect(onChange).toHaveBeenCalledWith({ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] });
  });

  it("показує в режимі +1/+1/+1 ті самі три картки, вже обраними", () => {
    render(
      <BackgroundAsiForm
        step={soldierStep}
        background={{ name: "SOLDIER_2024" }}
        draft={{ mode: "+1/+1/+1", abilities: ["STR", "DEX", "CON"] }}
        scoresBefore={scoresBefore}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("По +1 кожній із трьох")).toBeTruthy();
    for (const label of ["Сила", "Спритність", "Статура"]) {
      expect(screen.getByRole("button", { name: new RegExp(label) }).getAttribute("aria-pressed")).toBe("true");
    }
    expect(screen.getByRole("button", { name: /Сила/ }).textContent).toContain("15 → 16");
  });

  it("лишає картки порожніми, якщо походження дозволяє більше трьох характеристик", () => {
    const wideStep = findBackgroundAsiStep("RULES_2024", ["STR", "DEX", "CON", "WIS"])!;

    render(
      <BackgroundAsiForm
        step={wideStep}
        background={{ name: "SOLDIER_2024" }}
        draft={startBackgroundAsiDraft("+1/+1/+1", wideStep.allowedAbilities)}
        scoresBefore={scoresBefore}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Мудрість/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("не дає повісити +2 і +1 на одну характеристику", () => {
    const onChange = vi.fn();
    render(
      <BackgroundAsiForm
        step={soldierStep}
        background={{ name: "SOLDIER_2024" }}
        draft={{ mode: "+2/+1", plusTwo: "STR", plusOne: "CON" }}
        scoresBefore={scoresBefore}
        onChange={onChange}
      />,
    );

    const [, strengthInPlusOnePicker] = screen.getAllByRole("button", { name: /Сила/ });
    fireEvent.click(strengthInPlusOnePicker);

    expect(onChange).toHaveBeenCalledWith({ mode: "+2/+1", plusTwo: undefined, plusOne: "STR" });
  });

  it("показує на кожній картці, скільки стане, і не пускає понад 20", () => {
    render(
      <BackgroundAsiForm
        step={soldierStep}
        background={{ name: "SOLDIER_2024" }}
        draft={{ mode: "+2/+1" }}
        scoresBefore={{ ...scoresBefore, CON: 19 }}
        onChange={vi.fn()}
      />,
    );

    const [strengthPlusTwo, strengthPlusOne] = screen.getAllByRole("button", { name: /Сила/ });
    const [constitutionPlusTwo] = screen.getAllByRole("button", { name: /Статура/ });

    expect(strengthPlusTwo.textContent).toContain("15 → 17");
    expect(strengthPlusOne.textContent).toContain("15 → 16");
    expect(constitutionPlusTwo.textContent).toContain("19 → 20");
  });
});
