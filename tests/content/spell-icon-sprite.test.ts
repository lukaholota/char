import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sprite from "@/lib/generated/spell-icon-sprite.json";
import spriteSources from "../../data/spell-icons/sprite-sources.json";
import bg3Map from "../../data/spell-icons/bg3-map.json";
import subjects from "../../data/spell-icons/prompt-subjects.json";
import catalog2014 from "@/lib/generated/spells.json";
import catalog2024 from "../../data/2024/normalized/spells.json";
import { SPELL_ICON_ATTRIBUTION } from "@/lib/refs/icon-attribution";

/// KR40.2: спрайт збирається з `data/spell-icons/raw` і `data/spell-icons/built`. Червоний тест
/// означає, що джерела змінилися, а `build-spell-icon-sprite.ts` не прогнано.

const uniqueNames = [...new Set([...catalog2014, ...catalog2024].map((spell) => spell.engName))];

describe("спрайт іконок заклинань", () => {
  it("кожне заклинання каталогу має місце у спрайті", () => {
    const placed = new Set<string>(sprite.names);
    expect(uniqueNames.filter((name) => !placed.has(name))).toEqual([]);
  });

  it("назви не повторюються й поміщаються в сітку", () => {
    expect(new Set(sprite.names).size).toBe(sprite.names.length);
    expect(sprite.names.length).toBeLessThanOrEqual(sprite.columns * sprite.rows);
  });

  it("джерело кожної іконки збігається з реєстрами", () => {
    expect(Object.keys(spriteSources).sort()).toEqual([...sprite.names].sort());
    for (const [engName, source] of Object.entries(spriteSources)) {
      const expected = engName in bg3Map ? "bg3" : engName in subjects ? "built" : "невідоме";
      expect(source, engName).toBe(expected);
    }
  });

  it("файл спрайта лежить там, де каже індекс", () => {
    expect(existsSync(join("public", sprite.file))).toBe(true);
  });

  it("атрибуція називає обидва джерела вимоги Larian", () => {
    expect(SPELL_ICON_ATTRIBUTION.text).toContain("Larian");
    expect(SPELL_ICON_ATTRIBUTION.text).toContain("Неофіційний");
  });
});
