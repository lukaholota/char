import { describe, expect, it } from "vitest";
import {
  applyRadiantReplacements,
  readRadiantCorrections,
} from "../../prisma/seed/radiantTerminology";

describe("KR17.5 партія 5 — вхід корекційного сіду radiant", () => {
  const corrections = readRadiantCorrections();

  /// Перевернуто 2026-09-01 ([Р33](../../docs/DECISIONS.md#р33)). Раніше тут вимагалося рівно
  /// протилежне — щоб у файлі були всі пʼять сутностей. Це й було помилкою: предмети, риси,
  /// підкласи й інфузії мають файли-джерела, і правка «поверх сіду» робила їхній текст у базі
  /// таким, що не дорівнює жодному файлу. Заклинання 2014 файлу не мають узагалі, тому для них
  /// прохід по базі — єдиний спосіб.
  it("не чіпає сутностей, які можна виправити в джерелі", () => {
    expect(new Set(corrections.map((c) => c.entity))).toEqual(new Set(["spell"]));
  });

  it("вимагає ruleset там, де ключ без нього неоднозначний", () => {
    for (const correction of corrections) {
      if (correction.entity === "spell") expect(correction.ruleset).toBeDefined();
    }
  });

  it("жодна заміна не лишає знятої форми в новому тексті", () => {
    for (const correction of corrections) {
      for (const [, to] of correction.replace) {
        expect(to).not.toMatch(/Світлом|[Пп]роменист/u);
      }
    }
  });

  it("замінює зняту форму й не зачіпає решту речення", () => {
    const before = "Ціль отримує 1к8 променистих ушкоджень і є осліпленою.";
    const after = applyRadiantReplacements("тест", before, [
      ["отримує 1к8 променистих ушкоджень", "зазнає 1к8 променевої шкоди"],
    ]);

    expect(after).toBe("Ціль зазнає 1к8 променевої шкоди і є осліпленою.");
  });

  it("ідемпотентна: другий прогін по вже зведеному тексті нічого не міняє", () => {
    const pairs: [string, string][] = [["стара форма", "нова форма"]];
    const once = applyRadiantReplacements("тест", "тут стара форма.", pairs);

    expect(applyRadiantReplacements("тест", once, pairs)).toBe(once);
  });

  it("падає, коли в тексті немає ні старої, ні нової форми", () => {
    expect(() =>
      applyRadiantReplacements("тест", "зовсім інше речення", [["стара", "нова"]])
    ).toThrow(/немає ні/u);
  });
});
