/**
 * O48, KR48.3 — файл заклинань рас 2014 не пишеться руками: тест перебудовує його з пінованого корпусу.
 */

import { describe, expect, it } from "vitest";
import { collectRaceGrantedSpells, readRaceGrantedSpellsFile } from "../../scripts/5etools/build-race-granted-spells-2014";

describe("файл заклинань рас 2014 виводиться з корпусу", () => {
  it("закомічений файл дорівнює перебудованому з пінованої ревізії", () => {
    const { races, uncovered } = readRaceGrantedSpellsFile();
    expect({ races, uncovered }).toEqual(collectRaceGrantedSpells());
  });
});
