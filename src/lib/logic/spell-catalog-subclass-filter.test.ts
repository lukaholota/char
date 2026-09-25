import { describe, expect, it } from "vitest";

import { listCatalogSubclassNames } from "./spell-catalog-subclass-filter";

describe("O43 — фільтр підкласу для каталогу заклинань з листа", () => {
  it("легасі-підклас 2024 у фільтр не йде, той самий підклас 2014 — іде", () => {
    expect(listCatalogSubclassNames([{ className: "WARLOCK_2024", subclassName: "THE_GENIE" }])).toEqual([]);
    expect(listCatalogSubclassNames([{ className: "WARLOCK_2014", subclassName: "THE_GENIE" }])).toEqual(["Джин"]);
  });

  it("мультиклас: підклас основного класу лишається, легасі мультикласу — ні, повтори зникають", () => {
    expect(
      listCatalogSubclassNames([
        { className: "WARLOCK_2014", subclassName: "HEXBLADE" },
        { className: "WARLOCK_2024", subclassName: "HEXBLADE" },
        { className: "FIGHTER_2014", subclassName: null },
        { className: "WARLOCK_2014", subclassName: "HEXBLADE" },
      ]),
    ).toEqual(["Відьмацький клинок"]);
  });
});
