import { describe, expect, it } from "vitest";

import { findEarnedAlwaysPreparedSpells, isAlwaysPreparedSpell, type AlwaysPreparedSpellSource } from "./always-prepared-spells";

function buildLifeDomain(classLevel: number): AlwaysPreparedSpellSource {
  return {
    sourceKey: "LIFE_DOMAIN",
    sourceName: "Домен життя",
    classLevel,
    ability: "WIS",
    spells: [
      { spellId: 1, classLevel: 3 },
      { spellId: 2, classLevel: 3 },
      { spellId: 3, classLevel: 5 },
      { spellId: 4, classLevel: 9 },
    ],
  };
}

describe("KR31.5 — завжди підготовлені заклинання підкласу", () => {
  it("дає рівно ті заклинання, чий рівень уже досягнутий", () => {
    expect(findEarnedAlwaysPreparedSpells([buildLifeDomain(5)], []).map((spell) => spell.spellId)).toEqual([1, 2, 3]);
  });

  it("на рівні нижче за перший рядок таблиці не дає нічого", () => {
    expect(findEarnedAlwaysPreparedSpells([buildLifeDomain(2)], [])).toEqual([]);
  });

  it("не видає вдруге те, що персонаж уже знає", () => {
    expect(findEarnedAlwaysPreparedSpells([buildLifeDomain(5)], [1, 3]).map((spell) => spell.spellId)).toEqual([2]);
  });

  it("несе джерело й характеристику підкласу, бо саме ними заклинання кидається", () => {
    expect(findEarnedAlwaysPreparedSpells([buildLifeDomain(3)], [])[0]).toEqual({
      spellId: 1,
      sourceKey: "LIFE_DOMAIN",
      sourceName: "Домен життя",
      ability: "WIS",
    });
  });

  it("мультиклас рахує кожен підклас своїм рівнем класу", () => {
    const oath: AlwaysPreparedSpellSource = {
      sourceKey: "OATH_OF_DEVOTION",
      sourceName: "Клятва відданості",
      classLevel: 3,
      ability: "CHA",
      spells: [{ spellId: 5, classLevel: 3 }, { spellId: 6, classLevel: 9 }],
    };

    expect(findEarnedAlwaysPreparedSpells([buildLifeDomain(9), oath], []).map((spell) => spell.spellId)).toEqual([1, 2, 3, 4, 5]);
  });

  it("одне заклинання від двох підкласів лягає один раз", () => {
    const shared: AlwaysPreparedSpellSource = { ...buildLifeDomain(3), sourceKey: "WAR_DOMAIN", sourceName: "Домен війни" };

    expect(findEarnedAlwaysPreparedSpells([buildLifeDomain(3), shared], []).map((spell) => spell.sourceKey)).toEqual([
      "LIFE_DOMAIN",
      "LIFE_DOMAIN",
    ]);
  });
});

describe("замок підготовки — рядок, покладений правилом, зняти не можна", () => {
  const featRow = { level: 1, origin: "FEAT", excludeFromPreparedCount: true };

  it("заклинання риси, виду чи підкласу поза лімітом — завжди підготоване", () => {
    expect(isAlwaysPreparedSpell(featRow)).toBe(true);
    expect(isAlwaysPreparedSpell({ ...featRow, origin: "RACE" })).toBe(true);
    expect(isAlwaysPreparedSpell({ ...featRow, origin: "CLASS" })).toBe(true);
  });

  it("власний вибір гравця замку не підлягає, навіть виведений із ліміту руками", () => {
    expect(isAlwaysPreparedSpell({ ...featRow, origin: "MANUAL" })).toBe(false);
    expect(isAlwaysPreparedSpell({ ...featRow, origin: null })).toBe(false);
  });

  it("заклинання класу в межах ліміту готується й знімається як завжди", () => {
    expect(isAlwaysPreparedSpell({ ...featRow, excludeFromPreparedCount: false })).toBe(false);
  });

  it("замовляння підготовки не має взагалі", () => {
    expect(isAlwaysPreparedSpell({ ...featRow, level: 0 })).toBe(false);
  });
});
