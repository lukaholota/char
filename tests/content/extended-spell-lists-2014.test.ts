/**
 * KR16.2 — розширені списки заклинань 2014.
 *
 * Файл привʼязок не пишеться руками, тому тест не звіряє його «на око»: він перебудовує
 * привʼязки з пінованого корпусу й вимагає, щоб закомічений файл дорівнював обчисленому.
 * Плюс перевіряє саму розкладку сіда — три стани рядка, кожен окремо.
 */

import { describe, expect, it } from "vitest";
import catalog2014 from "@/lib/generated/spells.json";
import { collectExtendedListBindings } from "../../scripts/5etools/build-extended-spell-lists";
import { findLooseNameKey } from "../../scripts/5etools/schema";
import { isBaseClass } from "../../scripts/5etools/spell-facts";
import {
  ExtendedListBinding,
  groupBindingsBySpell,
  planBindings,
  readExtendedListBindings,
} from "../../prisma/seed/extendedSpellLists2014";

const bindings = readExtendedListBindings();
const catalogByName = new Map(catalog2014.map((row) => [row.engName, row]));

/// Книги, які 5etools називає своїм кодом, а ми — своїм. Мапа тут навмисно повторена з
/// генератора: тест мусить упасти, якщо генератор почне зіставляти книги інакше.
const SOURCE_BY_MIRROR_CODE: Record<string, string> = {
  TCE: "TCOE",
  XGE: "XGTE",
  FTD: "FTOD",
};

describe("файл розширених списків 2014 виводиться з корпусу", () => {
  it("закомічений файл дорівнює перебудованому з пінованої ревізії", () => {
    expect(bindings).toEqual(collectExtendedListBindings());
  });

  it("кожна привʼязка вказує на заклинання, яке справді є в каталозі 2014", () => {
    const dangling = bindings
      .filter((binding) => !catalogByName.has(binding.engName))
      .map((binding) => binding.engName);

    expect([...new Set(dangling)]).toEqual([]);
  });

  it("клас привʼязки — базовий клас, а не підклас", () => {
    const offenders = bindings
      .filter((binding) => !isBaseClass(binding.className))
      .map((binding) => `${binding.engName}: ${binding.className}`);

    expect(offenders).toEqual([]);
  });

  it("книга кожної привʼязки зіставлена з нашим enum, а не лишилася кодом дзеркала", () => {
    const offenders = bindings
      .filter((binding) => SOURCE_BY_MIRROR_CODE[binding.definedIn] !== binding.source)
      .map((binding) => `${binding.engName}: ${binding.definedIn} → ${binding.source}`);

    expect(offenders).toEqual([]);
  });

  it("та сама пара «заклинання + клас» не повторюється", () => {
    const keys = bindings.map((binding) => `${binding.engName}|${binding.className}`);

    expect(keys.length).toBe(new Set(keys).size);
  });

  /// `Astral Projection` дістає Monk із фічі «Empty Body», а не зі списку заклинань, якого в
  /// Монаха немає. Рядок у `spell_classes` показав би заклинання в каталозі класу.
  it("класи, які 5etools виводить із фічі, у привʼязки не потрапляють", () => {
    const monk = bindings.filter(
      (binding) => binding.engName === "Astral Projection" && binding.classEng === "Monk"
    );

    expect(monk).toEqual([]);
  });
});

describe("розширені списки закривають саме ту різницю, що показує звірка", () => {
  it("бракує рівно тих рядків, яких немає в каталозі", () => {
    const missing = bindings.filter((binding) => !hasClassRow(binding));

    expect(missing.length).toBe(54);
    expect(new Set(missing.map((binding) => binding.engName)).size).toBe(46);
  });

  it("решта привʼязок уже лежить у каталозі — сід їм лише проставить книгу", () => {
    expect(bindings.filter(hasClassRow).length).toBe(bindings.length - 54);
  });
});

describe("розкладка сіда розрізняє три стани рядка", () => {
  const binding: ExtendedListBinding = {
    engName: "Aid",
    className: "Бард",
    classEng: "Bard",
    source: "TCOE",
    definedIn: "TCE",
  };

  it("рядка немає — його треба створити", () => {
    expect(planBindings([binding], [])).toEqual({
      create: ["Бард"],
      attribute: [],
      alreadyRight: 0,
    });
  });

  it("рядок є без книги — їй треба проставити книгу", () => {
    const plan = planBindings([binding], [{ classId: 7, className: "Бард", source: null }]);

    expect(plan).toEqual({ create: [], attribute: [7], alreadyRight: 0 });
  });

  it("рядок є з чужою книгою — книгу теж треба виправити", () => {
    const plan = planBindings([binding], [{ classId: 7, className: "Бард", source: "XGTE" }]);

    expect(plan).toEqual({ create: [], attribute: [7], alreadyRight: 0 });
  });

  it("рядок уже правильний — сід його не чіпає", () => {
    const plan = planBindings([binding], [{ classId: 7, className: "Бард", source: "TCOE" }]);

    expect(plan).toEqual({ create: [], attribute: [], alreadyRight: 1 });
  });

  it("рядки інших класів того самого заклинання не зачіпаються", () => {
    const plan = planBindings([binding], [{ classId: 3, className: "Клірик", source: null }]);

    expect(plan).toEqual({ create: ["Бард"], attribute: [], alreadyRight: 0 });
  });
});

describe("групування за заклинанням", () => {
  it("збирає всі класи одного заклинання в один прохід", () => {
    const grouped = groupBindingsBySpell(bindings);

    expect(grouped.size).toBe(new Set(bindings.map((binding) => binding.engName)).size);
    expect([...grouped.values()].reduce((total, rows) => total + rows.length, 0)).toBe(
      bindings.length
    );
  });
});

function hasClassRow(binding: ExtendedListBinding): boolean {
  const row = catalogByName.get(binding.engName);
  if (!row) return false;

  return row.spellClasses.some((entry) => entry.className === binding.className);
}

/// Назви корпусу й каталогу подекуди різняться реєстром («Meld into Stone» проти
/// «Meld Into Stone»). Генератор мусить писати **нашу** назву, інакше сід її не знайде.
describe("назви привʼязок — наші, а не корпусу", () => {
  it("кожна назва збігається з каталогом побуквено, а не лише вільним ключем", () => {
    const looseOnly = bindings
      .filter((binding) => !catalogByName.has(binding.engName))
      .filter((binding) =>
        catalog2014.some((row) => findLooseNameKey(row.engName) === findLooseNameKey(binding.engName))
      )
      .map((binding) => binding.engName);

    expect(looseOnly).toEqual([]);
  });
});
