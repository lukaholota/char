import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SHEET_AND_SLOT_FILES = [
  "src/lib/components/characterSheet/slides/MagicSlide.tsx",
  "src/lib/components/characterSheet/shared/SpellcastingSourceCards.tsx",
  "src/lib/refs/translation.ts",
  "src/lib/actions/spell-slots.ts",
];

describe("L07-spellcasting-11 — слот заклинань, а не «комірка» чи «чарунка» (DECISIONS: канон термінів 2026-08-23)", () => {
  it.each(SHEET_AND_SLOT_FILES)("%s не називає слот коміркою чи чарункою", (path) => {
    const text = readFileSync(path, "utf8");
    expect(text.match(/[КкЧч](?:омір|арун)(?:к|ок|ц)\p{L}*/gu) ?? []).toEqual([]);
  });

  it("картка СК пише «Складність», а не «Складість»", () => {
    expect(readFileSync("src/lib/components/characterSheet/shared/SpellcastingSourceCards.tsx", "utf8")).not.toContain("Складість");
  });
});
