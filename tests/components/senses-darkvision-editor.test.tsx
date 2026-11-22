// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SensesAndResistancesCard } from "@/lib/components/characterSheet/slides/SensesAndResistancesCard";

afterEach(cleanup);
const empty = { darkvisionRange: null, damageResistances: [], damageImmunities: [], movementSpeeds: {} };
const editor = <button type="button">Змінити</button>;

describe("темнозір у картці чуттів", () => {
  it("власник бачить «Змінити» і тоді, коли темнозору немає", () => {
    render(<SensesAndResistancesCard {...empty} darkvisionEditor={editor} />);
    expect(screen.getByText("немає")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Змінити" })).toBeTruthy();
  });

  it("глядач без темнозору й опорів картки не бачить", () => {
    const { container } = render(<SensesAndResistancesCard {...empty} />);
    expect(container.textContent).toBe("");
  });

  it("дальність темнозору стоїть поруч із кнопкою", () => {
    render(<SensesAndResistancesCard {...empty} darkvisionRange={60} darkvisionEditor={editor} />);
    expect(screen.getByText("60 футів", { exact: false })).toBeTruthy();
  });
});
