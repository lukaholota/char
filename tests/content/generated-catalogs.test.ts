import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

type CatalogRecord = Record<string, unknown>;

type CatalogSpec = {
  label: string;
  file: string;
  expectedCount: number;
  requiredFields: string[];
};

const CATALOGS: CatalogSpec[] = [
  {
    label: "armor",
    file: "armor.json",
    expectedCount: 20,
    requiredFields: ["code", "nameUa", "engName", "armorType", "abilityBonusType", "weight", "cost", "donDoffTime"],
  },
  {
    label: "weapons",
    file: "weapons.json",
    expectedCount: 48,
    requiredFields: ["code", "nameUa", "engName", "damage", "damageType", "weaponType"],
  },
  {
    label: "infusions",
    file: "infusions.json",
    expectedCount: 66,
    requiredFields: ["nameUa", "engName", "targetType", "description", "shortDescription"],
  },
  {
    label: "invocations",
    file: "invocations.json",
    expectedCount: 50,
    requiredFields: ["nameUa", "engName", "description", "shortDescription"],
  },
  {
    label: "metamagic",
    file: "metamagic.json",
    expectedCount: 10,
    requiredFields: ["nameUa", "engName", "cost", "description", "shortDescription"],
  },
];

function readCatalogRaw(spec: CatalogSpec): string {
  return readFileSync(join(process.cwd(), "src/lib/generated", spec.file), "utf-8");
}

function readCatalog(spec: CatalogSpec): CatalogRecord[] {
  return JSON.parse(readCatalogRaw(spec)) as CatalogRecord[];
}

describe("KR13.6 — каталоги, згенеровані з бази", () => {
  describe.each(CATALOGS)("$label", (spec) => {
    it(`містить ${spec.expectedCount} записів`, () => {
      expect(readCatalog(spec).length).toBe(spec.expectedCount);
    });

    it("не має порожніх обовʼязкових полів", () => {
      for (const record of readCatalog(spec)) {
        for (const field of spec.requiredFields) {
          const value = record[field];
          expect(typeof value === "string" ? value.trim() : value, `${spec.file}: ${String(record.engName)}.${field}`).toBeTruthy();
        }
      }
    });

    it("дає кожному запису унікальний id і назву виду «Українська [English]»", () => {
      const records = readCatalog(spec);
      const ids = records.map((record) => record.id);

      expect(new Set(ids).size).toBe(records.length);
      for (const record of records) {
        expect(typeof record.id).toBe("number");
        expect(String(record.name), `${spec.file}: ${String(record.engName)}`).toBe(`${String(record.nameUa)} [${String(record.engName)}]`);
      }
    });

    it("лишається редакцією 2014 з відомим джерелом", () => {
      for (const record of readCatalog(spec)) {
        expect(record.ruleset).toBe("RULES_2014");
        expect(String(record.source ?? "").trim(), `${spec.file}: ${String(record.engName)}`).toBeTruthy();
      }
    });

    // Генератор пише рівно `JSON.stringify(data, null, 2)`. Якщо файл на диску збігається з
    // канонічною сериалізацією власного вмісту, повторний прогін з тими самими рядками бази
    // дає байт-у-байт той самий файл.
    it("лежить у канонічній формі генератора, тож повторна генерація нічого не змінює", () => {
      const raw = readCatalogRaw(spec);
      expect(raw).toBe(JSON.stringify(JSON.parse(raw), null, 2));
    });
  });
});
