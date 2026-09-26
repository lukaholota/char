import { describe, expect, it } from "vitest";

import {
  buildNameCandidates,
  buildSpellTableRow,
  shortenCastingTime,
  shortenDuration,
  shortenRange,
  type SpellDetails,
} from "@/server/pdf/sheet2024/spellRows";

const SPELL: SpellDetails = {
  level: 1,
  name: "Магічний дротик [Magic Missile]",
  castingTime: "1 дія",
  range: "120 футів",
  components: "В, С",
  duration: "Миттєво",
  isRitual: false,
  isConcentration: false,
  isPrepared: false,
};

describe("клітинки таблиці заклинань листа 2024", () => {
  it.each([
    ["1 дія", "1 дія"],
    ["1 бонусна дія", "1 бон. дія"],
    ["1 реакція, яку ви здійснюєте, коли по вас влучають атакою", "1 реакція"],
    ["10 хвилин", "10 хв"],
    ["1 година", "1 год"],
    ["1 дія або 8 годин", "1 дія або 8 год"],
  ])("час «%s» → «%s»", (raw, printed) => {
    expect(shortenCastingTime(raw)).toBe(printed);
  });

  it.each([
    ["120 футів", "120 фт"],
    ["Дотик", "Дотик"],
    ["На себе (Випромінювання радіусом 30 футів)", "На себе"],
    ["1 миля", "1 миля"],
  ])("дистанція «%s» → «%s»", (raw, printed) => {
    expect(shortenRange(raw)).toBe(printed);
  });

  it.each([
    ["Концентрація, до 1 хвилини", "до 1 хв"],
    ["Миттєво", "миттєво"],
    ["8 годин", "8 год"],
  ])("тривалість «%s» → «%s»", (raw, printed) => {
    expect(shortenDuration(raw)).toBe(printed);
  });

  it("матеріальний компонент позначається, коли він є у списку компонентів", () => {
    expect(buildSpellTableRow({ ...SPELL, components: "В, С, М (шматочок фосфору)" }).needsMaterial).toBe(true);
    expect(buildSpellTableRow({ ...SPELL, components: "М" }).needsMaterial).toBe(true);
    expect(buildSpellTableRow({ ...SPELL, components: "В, С" }).needsMaterial).toBe(false);
  });

  it("підготовлене заклинання позначене в примітках, замовляння — ніколи", () => {
    expect(buildSpellTableRow({ ...SPELL, isPrepared: true }).notes).toBe("підг. · миттєво");
    expect(buildSpellTableRow({ ...SPELL, level: 0, isPrepared: true }).notes).toBe("миттєво");
  });

  it("назва має запасну форму без англійського оригіналу, а назва без нього — лише одну", () => {
    expect(buildNameCandidates("Магічний дротик [Magic Missile]")).toEqual(["Магічний дротик [Magic Missile]", "Магічний дротик"]);
    expect(buildNameCandidates("Власне закляття")).toEqual(["Власне закляття"]);
  });
});
