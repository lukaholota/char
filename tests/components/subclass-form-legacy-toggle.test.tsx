// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SubclassForm from "@/lib/components/characterCreator/SubclassForm";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { ClassI } from "@/lib/types/model-types";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function buildSubclass(subclassId: number, name: string, legacySource: string | null) {
  return { subclassId, name, legacySource, features: [], subclassChoiceOptions: [], languages: [], toolProficiencies: [] };
}

function buildWarlock(subclasses: ReturnType<typeof buildSubclass>[]): ClassI {
  return { classId: 1, name: "WARLOCK_2024", subclasses } as unknown as ClassI;
}

const warlock2024 = buildWarlock([
  buildSubclass(1, "FIEND_PATRON", null),
  buildSubclass(2, "ARCHFEY_PATRON", null),
  buildSubclass(3, "THE_GENIE", "TCOE"),
]);

const warlock2014 = buildWarlock([buildSubclass(11, "THE_GENIE", null), buildSubclass(12, "HEXBLADE", null)]);

function renderStep(cls: ClassI, subclassId?: number) {
  usePersFormStore.setState({ formData: { subclassId }, currentStep: 1, isHydrated: true });
  render(<SubclassForm cls={cls} formId="subclass-step" />);
}

beforeEach(() => {
  usePersFormStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  usePersFormStore.getState().resetForm();
});
afterEach(cleanup);

describe("O43 — перемикач «Підкласи зі старих книг» у кроці підкласу", () => {
  it("у контенті 2014 перемикача немає, і всі підкласи видно як раніше", () => {
    renderStep(warlock2014);

    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText("Зі старих книг")).toBeNull();
    expect(screen.getAllByText("Джин")).toHaveLength(1);
  });

  it("у 2024 легасі-підклас схований, доки перемикач вимкнений", () => {
    renderStep(warlock2024);

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByText("Джин")).toBeNull();
    expect(screen.queryByText("TCOE")).toBeNull();
  });

  it("підкласи PHB 2024 підписані перекладом, а не enum з бази", () => {
    renderStep(warlock2024);

    expect(screen.getByText("Патрон-Почвара")).toBeTruthy();
    expect(screen.getByText("Патрон-Архіфея")).toBeTruthy();
    expect(screen.queryByText("FIEND_PATRON")).toBeNull();
  });

  it("увімкнений перемикач показує легасі окремим блоком з книгою", () => {
    renderStep(warlock2024);
    fireEvent.click(screen.getByRole("switch"));

    const block = screen.getByRole("region", { name: "Зі старих книг" });
    expect(block.textContent).toContain("Джин");
    expect(block.textContent).toContain("TCOE");
  });

  it("повернення на крок з обраним легасі — перемикач уже увімкнений", () => {
    renderStep(warlock2024, 3);

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("region", { name: "Зі старих книг" }).textContent).toContain("Джин");
  });

  it("вимкнення перемикача при обраному легасі скидає вибір", () => {
    renderStep(warlock2024, 3);
    fireEvent.click(screen.getByRole("switch"));

    expect(usePersFormStore.getState().formData.subclassId).toBeUndefined();
    expect(screen.queryByText("Джин")).toBeNull();
  });

  it("вимкнення перемикача не чіпає обраний підклас PHB 2024", () => {
    renderStep(warlock2024, 1);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("switch"));

    expect(usePersFormStore.getState().formData.subclassId).toBe(1);
  });
});
