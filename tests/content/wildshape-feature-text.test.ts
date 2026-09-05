import { describe, expect, it } from "vitest";
import { WILD_SHAPE_DESCRIPTION_2014 } from "../../prisma/seed/classFeatureSeed";
import { findGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { findWildshapeLimits, formatChallengeRating } from "@/rules/wildshape";

/// KR24.2. Три рядки таблиці Звіриних форм жили тільки в коді, а «Форми кола» посилалися на
/// таблицю, якої гравець ніде не бачив. Тепер вони в описі фічі — і цей гейт стереже, щоб опис
/// і таблиця правил не розійшлися: числа в тексті беруться з тієї самої функції, що й фільтр.

const LEVELS_IN_TABLE = [2, 4, 8];

const findTableLine = (level: number) =>
  WILD_SHAPE_DESCRIPTION_2014.split("\n").find((line) => line.startsWith(`- **${level} рівень**`));

describe("таблиця Звіриних форм в описі Дикої форми", () => {
  it.each(LEVELS_IN_TABLE)("рядок %i рівня називає ту саму межу КР, що й правила", (level) => {
    const limits = findWildshapeLimits({ druidLevel: level, isMoonCircle: false, ruleset: "RULES_2014" });
    const line = findTableLine(level);

    expect(line).toBeDefined();
    expect(line).toContain(formatChallengeRating(limits!.maxChallengeRating));
  });

  it("пороги руху в тексті збігаються з таблицею правил", () => {
    expect(findTableLine(2)).toContain("без швидкості плавання й польоту");
    expect(findTableLine(4)).toContain("швидкість плавання дозволена");
    expect(findTableLine(8)).toContain("швидкість польоту дозволена");
  });

  /// Саме те, чого бракувало: опис мовчав про лазіння, і 23 лазячі форми виглядали як баг фільтра.
  it("опис прямо каже, що лазіння не обмежене", () => {
    expect(WILD_SHAPE_DESCRIPTION_2014).toContain("Швидкість лазіння таблиця не обмежує на жодному рівні");
  });

  it("посилання «Форм кола» на таблицю тепер має що знайти", () => {
    expect(WILD_SHAPE_DESCRIPTION_2014).toContain("Таблиця Звіриних форм");
    expect(WILD_SHAPE_DESCRIPTION_2014).toContain("Кола місяця ігнорує стовпчик показника небезпеки");
  });

  /// [Р20](docs/DECISIONS.md#р20): термін поза ратифікованими реєстрами несе оригінал поруч.
  it("коінований термін несе оригінал маркером", () => {
    expect(findGlossaryMarkers(WILD_SHAPE_DESCRIPTION_2014).map((marker) => marker.original)).toEqual([
      "Beast Shapes",
    ]);
  });
});
