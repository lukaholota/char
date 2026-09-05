import { describe, expect, it } from "vitest";

import { findCustomAsiPackageProblem } from "./abilities";

describe("пакет ASI на підвищенні рівня — одна +2 або дві по +1", () => {
  it("порожній або відсутній пакет — не проблема ASI (грає рису чи нічого)", () => {
    expect(findCustomAsiPackageProblem(undefined)).toBeNull();
    expect(findCustomAsiPackageProblem([])).toBeNull();
  });

  it("одна характеристика +2 — валідний пакет", () => {
    expect(findCustomAsiPackageProblem([{ ability: "STR", value: 2 }])).toBeNull();
  });

  it("дві характеристики по +1 — валідний пакет", () => {
    expect(
      findCustomAsiPackageProblem([
        { ability: "STR", value: "1" },
        { ability: "DEX", value: 1 },
      ]),
    ).toBeNull();
  });

  it("три характеристики по +2 (L08-levelup-machine-05) — відхилено", () => {
    expect(
      findCustomAsiPackageProblem([
        { ability: "STR", value: 2 },
        { ability: "DEX", value: 2 },
        { ability: "CON", value: 2 },
      ]),
    ).not.toBeNull();
  });

  it("сума не дорівнює 2 — відхилено", () => {
    expect(findCustomAsiPackageProblem([{ ability: "STR", value: 1 }])).not.toBeNull();
  });

  it("та сама характеристика двічі в одному пакеті — відхилено", () => {
    expect(
      findCustomAsiPackageProblem([
        { ability: "STR", value: 1 },
        { ability: "STR", value: 1 },
      ]),
    ).not.toBeNull();
  });

  it("невідома характеристика — відхилено", () => {
    expect(findCustomAsiPackageProblem([{ ability: "LUCK", value: 2 }])).not.toBeNull();
  });

  it("значення не 1 і не 2 — відхилено", () => {
    expect(findCustomAsiPackageProblem([{ ability: "STR", value: 3 }])).not.toBeNull();
  });
});
