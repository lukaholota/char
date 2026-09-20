import { describe, expect, it } from "vitest";
import { compareSpellSource, type SpellSourceRecord } from "../../prisma/seed/spellSource2014";

function buildSpell(overrides: Partial<SpellSourceRecord> = {}): SpellSourceRecord {
  return {
    engName: "Web",
    name: "Павутиння",
    level: 2,
    school: "Втілення",
    castingTime: "1 дія",
    range: "60 футів",
    components: "В, С, М",
    duration: "Концентрація, до 1 години",
    hasRitual: "ні",
    hasConcentration: "так",
    source: "PHB",
    description: "<p>Істота стає скованою.</p>",
    ...overrides,
  };
}

describe("KR34.5 — звірка файла заклинань 2014 з базою", () => {
  it("однаковий запис нічого не пише", () => {
    expect(compareSpellSource([buildSpell()], [buildSpell()])).toEqual({ changes: [], missingInDatabase: [], missingInFile: [] });
  });

  it("пише лише ті поля, що змінилися у файлі", () => {
    const edited = buildSpell({ description: '<p>Істота стає <a href="/rules/conditions#condition-restrained">скованою</a>.</p>', level: 3 });

    expect(compareSpellSource([edited], [buildSpell()]).changes).toEqual([
      { engName: "Web", fields: { level: 3, description: edited.description } },
    ]);
  });

  it("порожнє значення у файлі — теж зміна, а не пропуск", () => {
    expect(compareSpellSource([buildSpell({ components: null })], [buildSpell()]).changes).toEqual([
      { engName: "Web", fields: { components: null } },
    ]);
  });

  it("називає заклинання, яких бракує з кожного боку, і не пише їх", () => {
    const drift = compareSpellSource([buildSpell(), buildSpell({ engName: "Sleep" })], [buildSpell(), buildSpell({ engName: "Fireball" })]);

    expect(drift).toEqual({ changes: [], missingInDatabase: ["Sleep"], missingInFile: ["Fireball"] });
  });
});
