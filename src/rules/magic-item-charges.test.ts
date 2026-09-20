import { describe, expect, it } from "vitest";
import { applyChargesMax, applyChargesStep } from "./magic-item-charges";

const NO_CHARGES = { chargesMax: null, chargesCurrent: null };

describe("максимум зарядів, який вписує гравець", () => {
  it("перший максимум заповнює предмет повністю", () => {
    expect(applyChargesMax(NO_CHARGES, 7)).toEqual({ chargesMax: 7, chargesCurrent: 7 });
  });

  it("менший максимум зрізає поточні, більший їх не додає", () => {
    expect(applyChargesMax({ chargesMax: 7, chargesCurrent: 5 }, 3)).toEqual({ chargesMax: 3, chargesCurrent: 3 });
    expect(applyChargesMax({ chargesMax: 7, chargesCurrent: 5 }, 10)).toEqual({ chargesMax: 10, chargesCurrent: 5 });
  });

  it("порожній, нульовий чи неціле значення прибирає лічильник", () => {
    expect(applyChargesMax({ chargesMax: 7, chargesCurrent: 5 }, null)).toEqual(NO_CHARGES);
    expect(applyChargesMax({ chargesMax: 7, chargesCurrent: 5 }, 0)).toEqual(NO_CHARGES);
    expect(applyChargesMax({ chargesMax: 7, chargesCurrent: 5 }, 2.5)).toEqual(NO_CHARGES);
  });
});

describe("витрата й повернення зарядів", () => {
  it("кроки тримаються між нулем і максимумом", () => {
    expect(applyChargesStep({ chargesMax: 7, chargesCurrent: 1 }, -3)).toEqual({ chargesMax: 7, chargesCurrent: 0 });
    expect(applyChargesStep({ chargesMax: 7, chargesCurrent: 6 }, 3)).toEqual({ chargesMax: 7, chargesCurrent: 7 });
    expect(applyChargesStep({ chargesMax: 7, chargesCurrent: 4 }, -1)).toEqual({ chargesMax: 7, chargesCurrent: 3 });
  });

  it("предмет без лічильника не отримує зарядів від кроку", () => {
    expect(applyChargesStep(NO_CHARGES, 1)).toEqual(NO_CHARGES);
  });
});
