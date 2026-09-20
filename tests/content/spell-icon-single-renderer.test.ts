import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/// KR40.4: іконку заклинання малює лише `SpellIcon`, а плиту школи — лише `SpellSchoolPlate`.
/// Червоний тест означає, що зʼявилася друга копія віджета — саме той клас помилок, через який
/// у проєкті вже розійшлися `findSchoolVisual` і `getSpellSchoolVisual`.

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

const FILES = collectFiles("src").map((path) => ({ path, text: readFileSync(path, "utf8") }));

describe("одна реалізація іконки заклинання", () => {
  it("findSchoolVisual читає лише плита школи", () => {
    const readers = FILES.filter((file) => file.text.includes("findSchoolVisual") && !file.path.endsWith("spell-school-visual.ts"));
    expect(readers.map((file) => file.path)).toEqual(["src/components/spells/SpellSchoolPlate.tsx"]);
  });

  it("спрайт читає лише SpellIcon", () => {
    const readers = FILES.filter((file) => file.text.includes("spell-icon-sprite"));
    expect(readers.map((file) => file.path)).toEqual(["src/components/spells/SpellIcon.tsx"]);
  });

  it("у списку заклинань листа немає власного гліфа школи", () => {
    const sheet = FILES.find((file) => file.path.endsWith("SpellListGroup.tsx"));
    expect(sheet?.text).not.toContain("schoolVisual");
    expect(sheet?.text).toContain("SpellIcon");
  });
});
