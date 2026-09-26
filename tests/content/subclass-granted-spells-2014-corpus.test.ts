/**
 * O48 — файл заклинань підкласів 2014 не пишеться руками: тест перебудовує його з пінованого корпусу
 * й вимагає рівності. Потребує `data/5etools/raw` — тому в переліку корпусних тестів.
 */

import { describe, expect, it } from "vitest";
import { collectSubclassGrantedSpells, readSubclassGrantedSpellsFile } from "../../scripts/5etools/build-subclass-granted-spells-2014";

describe("файл заклинань підкласів 2014 виводиться з корпусу", () => {
  it("закомічений файл дорівнює перебудованому з пінованої ревізії", () => {
    const { subclasses, uncovered } = readSubclassGrantedSpellsFile();
    expect({ subclasses, uncovered }).toEqual(collectSubclassGrantedSpells());
  });
});
