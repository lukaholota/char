import { describe, expect, it } from "vitest";

import { buildFeatFeatureDescription } from "./feat-feature-description";

describe("опис риси на листі разом із тим, що в ній обрано", () => {
  it("«Умілець»: три обрані навички стоять під описом риси", () => {
    expect(
      buildFeatFeatureDescription("Ви отримуєте володіння в будь-якій комбінації з трьох навичок або інструментів на ваш вибір.", [
        { choiceOption: { optionName: "Атлетика" } },
        { choiceOption: { optionName: "Акробатика" } },
        { choiceOption: { optionName: "Медицина" } },
      ]),
    ).toBe(
      "Ви отримуєте володіння в будь-якій комбінації з трьох навичок або інструментів на ваш вибір.\n\n**Обрано:** Атлетика, Акробатика, Медицина",
    );
  });

  it("риса без виборів лишає опис як є", () => {
    expect(buildFeatFeatureDescription("Опис.", [])).toBe("Опис.");
    expect(buildFeatFeatureDescription("Опис.", null)).toBe("Опис.");
  });

  it("ключ опції перекладається, порожні й повторні відкидаються", () => {
    expect(
      buildFeatFeatureDescription("", [
        { choiceOption: { optionName: "WIS" } },
        { choiceOption: { optionName: "WIS" } },
        { choiceOption: null },
      ]),
    ).toBe("**Обрано:** Мудрість");
  });
});
