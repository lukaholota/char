import { describe, expect, it } from "vitest";
import {
  buildWildshapePickerUrl,
  findWildshapeFilter,
  writeWildshapeFilter,
} from "@/lib/bestiary-wildshape";

/// KR24.3. Фільтр «Дика форма → придатні мені» — секція звичайних фільтрів каталогу, тож він
/// живе в адресі, як решта. Персонаж у контексті й сам перемикач — дві різні речі: кнопка
/// «додати як форму» потрібна й тоді, коли фільтр вимкнено ([Р-3]).

const filterOf = (query: string) => findWildshapeFilter(new URLSearchParams(query));

function writeInto(query: string, persId: number | null, onlyEligible: boolean): string {
  const params = new URLSearchParams(query);
  writeWildshapeFilter(params, { persId, onlyEligible });
  return params.toString();
}

describe("персонаж у контексті бестіарію", () => {
  it("звичайна адреса каталогу контексту не дає", () => {
    expect(filterOf("")).toEqual({ persId: null, onlyEligible: false });
    expect(filterOf("cr=1&type=Звір")).toEqual({ persId: null, onlyEligible: false });
  });

  it("режим вбудовування з листа сам стає контекстом", () => {
    expect(filterOf("origin=character&persId=7")).toEqual({ persId: 7, onlyEligible: false });
  });

  it("гравець, який зайшов у бестіарій сам, несе персонажа власним параметром", () => {
    expect(filterOf("wsPers=7&ws=1")).toEqual({ persId: 7, onlyEligible: true });
  });

  it("несправжній персонаж відкидається, а не читається як нуль", () => {
    expect(filterOf("wsPers=abc").persId).toBeNull();
    expect(filterOf("wsPers=0").persId).toBeNull();
    expect(filterOf("wsPers=-3").persId).toBeNull();
  });

  it("перемикач без персонажа нічого не вмикає — інакше фільтр не мав би чим фільтрувати", () => {
    expect(filterOf("ws=1")).toEqual({ persId: null, onlyEligible: false });
  });
});

describe("перемикач працює в обидва боки", () => {
  it("увімкнення й вимкнення читаються назад тим самим розбором", () => {
    const on = writeInto("origin=character&persId=7", 7, true);
    expect(findWildshapeFilter(new URLSearchParams(on))).toEqual({ persId: 7, onlyEligible: true });

    const off = writeInto(on, 7, false);
    expect(findWildshapeFilter(new URLSearchParams(off))).toEqual({ persId: 7, onlyEligible: false });
  });

  it("персонаж режиму вбудовування не дублюється власним параметром", () => {
    expect(writeInto("origin=character&persId=7", 7, true)).not.toContain("wsPers");
  });

  it("знятий персонаж забирає з адреси й перемикач", () => {
    expect(writeInto("wsPers=7&ws=1", null, true)).toBe("");
  });
});

describe("адреса пікера форм", () => {
  it("веде в бестіарій 2014 із фільтром і персонажем", () => {
    const url = buildWildshapePickerUrl({
      persId: 42,
      persName: "Мирон",
      ruleset: "RULES_2014",
      onlyEligible: true,
    });

    expect(url.startsWith("/bestiary?")).toBe(true);
    expect(findWildshapeFilter(new URLSearchParams(url.split("?")[1]))).toEqual({
      persId: 42,
      onlyEligible: true,
    });
  });

  it("«весь бестіарій» відкривається тим самим каталогом, лише без фільтра", () => {
    const url = buildWildshapePickerUrl({ persId: 42, ruleset: "RULES_2014", onlyEligible: false });

    expect(findWildshapeFilter(new URLSearchParams(url.split("?")[1]))).toEqual({
      persId: 42,
      onlyEligible: false,
    });
  });

  it("редакція персонажа обирає каталог", () => {
    const url = buildWildshapePickerUrl({ persId: 42, ruleset: "RULES_2024", onlyEligible: true });

    expect(url.startsWith("/2024/bestiary?")).toBe(true);
  });
});
