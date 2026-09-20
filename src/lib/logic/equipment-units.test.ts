import { describe, expect, it } from "vitest";

import { translateCost, translateDonDoffTime, translateWeight } from "./equipment-units";

describe("одиниці спорядження 2024 українською, як у каталозі 2014", () => {
  it("вага", () => {
    expect(translateWeight("10 lb.")).toBe("10 фнт.");
    expect(translateWeight("1/4 lb.")).toBe("1/4 фнт.");
    expect(translateWeight("-")).toBe("-");
  });

  it("ціна в монетах", () => {
    expect(translateCost("10 GP")).toBe("10 зм");
    expect(translateCost("2 SP")).toBe("2 см");
    expect(translateCost("5 CP")).toBe("5 мм");
  });

  it("час надягання і зняття з узгодженням числа", () => {
    expect(translateDonDoffTime("1 Minute / 1 Minute")).toBe("1 хвилина / 1 хвилина");
    expect(translateDonDoffTime("10 Minutes / 5 Minutes")).toBe("10 хвилин / 5 хвилин");
    expect(translateDonDoffTime("2 Minutes / 1 Minute")).toBe("2 хвилини / 1 хвилина");
  });

  it("щит надягається дією Застосування", () => {
    expect(translateDonDoffTime("Utilize Action")).toBe("Дія Застосування");
  });
});
