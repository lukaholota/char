import { describe, expect, it } from "vitest";
import catalog2014 from "@/lib/generated/spells.json";
import { compareSpellSource, readSpellSource2014 } from "../../prisma/seed/spellSource2014";

/// KR34.5: каталог збирається з бази, база — з `data/2014/spells.json`. Червоний тест означає, що
/// файл поправили, а `seed:spells-2014` і `generate:spells` ще не прогнано, — або навпаки, текст
/// у базі змінив прохід повз файл ([Р33](../../docs/DECISIONS.md#р33)).
describe("каталог заклинань 2014 дорівнює файлу-джерелу", () => {
  it("кожне поле файла є в каталозі тим самим значенням, і склад однаковий", () => {
    const drift = compareSpellSource(readSpellSource2014(), catalog2014);

    expect(drift.missingInDatabase).toEqual([]);
    expect(drift.missingInFile).toEqual([]);
    expect(drift.changes.map((change) => `${change.engName}: ${Object.keys(change.fields).join(", ")}`)).toEqual([]);
  });
});
