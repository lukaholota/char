import { describe, expect, it } from "vitest";
import { collectPreparedCountAutoExcludeMatchers, shouldAutoExcludeFromPreparedCountBadge } from "@/lib/logic/spell-prepared-exclusions";

const woodElfLifeCleric = {
  race: { name: "ELF_2014" },
  subrace: { name: "ELF_WOOD_2014" },
  subclass: { name: "LIFE_DOMAIN" },
  multiclasses: [],
};

describe("L11-persistence-identity-06 — бейдж виключає з ліміту підготовлених лише цілою назвою", () => {
  const matchers = collectPreparedCountAutoExcludeMatchers(woodElfLifeCleric);

  it.each(["Клас", "Рас", "Ліс", "Лісовий", "Домен"])("уривок «%s» заклинання з ліміту не виводить", (badge) => {
    expect(shouldAutoExcludeFromPreparedCountBadge(badge, matchers)).toBe(false);
  });

  it.each(["Ельф", "Лісовий ельф", "Домен життя", "Підклас", "Раса", "Домен життя (підклас)"])("бейдж «%s» виводить заклинання з ліміту", (badge) => {
    expect(shouldAutoExcludeFromPreparedCountBadge(badge, matchers)).toBe(true);
  });
});
