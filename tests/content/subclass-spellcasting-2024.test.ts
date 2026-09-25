/**
 * KR27.6 — третинні заклиначі 2024. Клас-незаклинач дає чаклування лише через підклас, і рушій
 * читає `subclass.spellcastingType` рівно тоді, коли `class.spellcastingType` — NONE. Тому
 * Лицар-Чаклун і Таємний Пройдисвіт мусять нести THIRD + INT у джерелі й у каталозі, який читає
 * левелап; решта 46 підкласів — ні, бо їхнє чаклування вже задає клас.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGACY_SUBCLASSES_2024 } from "@/rules/legacy-subclasses-2024";

type SubclassJson2024 = { className: string; engName: string; spellcastingType?: string; primaryCastingStat?: string };
type GeneratedSubclass = { name: string; spellcastingType: string | null; primaryCastingStat: string | null; legacySource?: string | null };
type GeneratedClass = { name: string; subclasses: GeneratedSubclass[] };

const THIRD_CASTER_SUBCLASSES = ["Eldritch Knight", "Arcane Trickster"];

const sourceSubclasses: SubclassJson2024[] = JSON.parse(
  readFileSync(join(process.cwd(), "data/2024/normalized/subclasses.json"), "utf-8"),
);
const generatedClasses: GeneratedClass[] = JSON.parse(
  readFileSync(join(process.cwd(), "src/lib/generated/creator-content-2024.json"), "utf-8"),
).classes;

describe("KR27.6 — чаклування підкласів 2024", () => {
  it("Лицар-Чаклун і Таємний Пройдисвіт — третинні заклиначі з Інтелектом у джерелі", () => {
    const thirdCasters = sourceSubclasses
      .filter((subclass) => THIRD_CASTER_SUBCLASSES.includes(subclass.engName))
      .map((subclass) => [subclass.engName, subclass.spellcastingType, subclass.primaryCastingStat]);

    expect(thirdCasters).toEqual([
      ["Eldritch Knight", "THIRD", "INT"],
      ["Arcane Trickster", "THIRD", "INT"],
    ]);
  });

  it("жоден інший підклас 2024 чаклування не задає — його дає клас", () => {
    const others = sourceSubclasses
      .filter((subclass) => !THIRD_CASTER_SUBCLASSES.includes(subclass.engName))
      .filter((subclass) => subclass.spellcastingType || subclass.primaryCastingStat)
      .map((subclass) => subclass.engName);

    expect(others).toEqual([]);
  });

  it("згенерований каталог левелапу дорівнює джерелу для кожного підкласу subclasses.json", () => {
    const generated = generatedClasses.flatMap((cls) =>
      cls.subclasses.filter((subclass) => !subclass.legacySource).map((subclass) => [subclass.name, subclass.spellcastingType, subclass.primaryCastingStat]),
    );
    const expected = sourceSubclasses.map((subclass) => [toSubclassEnumName(subclass.engName), subclass.spellcastingType ?? "NONE", subclass.primaryCastingStat ?? null]);

    expect(generated.length).toBe(sourceSubclasses.length);
    expect(generated.sort()).toEqual(expected.sort());
  });

  it("легасі-підкласи O43 у каталозі — рівно реєстр, і чаклування дає клас", () => {
    const legacy = generatedClasses.flatMap((cls) =>
      cls.subclasses.filter((subclass) => subclass.legacySource).map((subclass) => ({ key: `${cls.name}|${subclass.name}|${subclass.legacySource}`, ...subclass })),
    );
    const registryKeys = LEGACY_SUBCLASSES_2024.map((entry) => `${entry.class2024}|${entry.subclass}|${entry.source}`);

    expect(legacy.map((subclass) => subclass.key).sort()).toEqual(registryKeys.sort());
    expect(legacy.filter((subclass) => subclass.spellcastingType !== "NONE" || subclass.primaryCastingStat !== null).map((subclass) => subclass.key)).toEqual([]);
  });
});

function toSubclassEnumName(engName: string): string {
  return engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
